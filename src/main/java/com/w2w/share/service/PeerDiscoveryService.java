package com.w2w.share.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.constant.AppConstants;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PeerDiscoveryService implements IPeerDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(PeerDiscoveryService.class);

    private static final String KEY_DEVICE_ID = "deviceId";
    private static final String KEY_DEVICE_NAME = "deviceName";
    private static final String KEY_NODE_ID = "nodeId";
    private static final String KEY_PORT = "port";
    private static final String KEY_OS = "os";
    private static final String PROP_OS_NAME = "os.name";

    @Value("${server.port:8080}")
    private int serverPort;

    private final String nodeId = UUID.randomUUID().toString();
    private final String hostDeviceName = resolveDeviceName();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, DiscoveredPeer> peers = new ConcurrentHashMap<>();

    private DatagramSocket socket;
    private volatile boolean running = false;

    public record DiscoveredPeer(
            String deviceId,
            String nodeId,
            String deviceName,
            String ip,
            int port,
            String os,
            String url,
            long lastSeen
    ) {
        public DiscoveredPeer(String nodeId, String deviceName, String ip, int port, String os, String url, long lastSeen) {
            this(nodeId, nodeId, deviceName, ip, port, os, url, lastSeen);
        }
    }

    @PostConstruct
    @Override
    public void start() {
        try {
            socket = new DatagramSocket(null);
            socket.setReuseAddress(true);
            socket.setBroadcast(true);
            socket.bind(new InetSocketAddress(AppConstants.DISCOVERY_PORT));

            running = true;

            Thread listenerThread = new Thread(this::listenForPeers, "W2W-Peer-Discovery-Listener");
            listenerThread.setDaemon(true);
            listenerThread.start();

            log.info("Initialized UDP Subnet Peer Discovery on port {}", AppConstants.DISCOVERY_PORT);
        } catch (Exception e) {
            log.warn("Could not bind UDP discovery socket on port {}: {}", AppConstants.DISCOVERY_PORT, e.getMessage());
        }
    }

    @PreDestroy
    @Override
    public void stop() {
        running = false;
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
    }

    private void listenForPeers() {
        byte[] buffer = new byte[2048];
        while (running && socket != null && !socket.isClosed()) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                parseAndStorePeer(packet);
            } catch (SocketException se) {
                if (running) {
                    log.debug("UDP discovery socket interrupted or closed: {}", se.getMessage());
                }
                break;
            } catch (IOException ioe) {
                if (running) {
                    log.debug("Failed to read UDP peer packet: {}", ioe.getMessage());
                }
            } catch (Exception e) {
                if (running) {
                    log.warn("Unexpected error processing peer discovery packet: {}", e.getMessage(), e);
                }
            }
        }
    }

    private void parseAndStorePeer(DatagramPacket packet) throws IOException {
        String json = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8);
        Map<String, Object> map = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});

        String peerNodeId = map.containsKey(KEY_DEVICE_ID) ? String.valueOf(map.get(KEY_DEVICE_ID)) : (String) map.get(KEY_NODE_ID);
        if (peerNodeId != null && !peerNodeId.equals(this.nodeId)) {
            String peerDevice = map.containsKey(KEY_DEVICE_NAME) ? String.valueOf(map.get(KEY_DEVICE_NAME)) : "Unknown Device";
            String peerIp = packet.getAddress().getHostAddress();
            int peerPort = map.containsKey(KEY_PORT) ? ((Number) map.get(KEY_PORT)).intValue() : 8080;
            String peerOs = map.containsKey(KEY_OS) ? String.valueOf(map.get(KEY_OS)) : System.getProperty(PROP_OS_NAME, "Unknown");
            String peerUrl = "http://" + peerIp + ":" + peerPort;

            peers.put(peerNodeId, new DiscoveredPeer(
                    peerNodeId,
                    peerNodeId,
                    peerDevice,
                    peerIp,
                    peerPort,
                    peerOs,
                    peerUrl,
                    System.currentTimeMillis()
            ));
        }
    }

    @Scheduled(fixedDelay = 4000)
    @Override
    public void broadcastAnnouncement() {
        if (!running || socket == null || socket.isClosed()) return;

        try {
            Map<String, Object> announcement = Map.of(
                    "service", "w2w-share",
                    KEY_DEVICE_ID, this.nodeId,
                    KEY_NODE_ID, this.nodeId,
                    KEY_DEVICE_NAME, this.hostDeviceName,
                    KEY_OS, System.getProperty(PROP_OS_NAME, "Host OS"),
                    KEY_PORT, this.serverPort
            );

            byte[] bytes = objectMapper.writeValueAsBytes(announcement);
            DatagramPacket packet = new DatagramPacket(
                    bytes,
                    bytes.length,
                    InetAddress.getByName(AppConstants.BROADCAST_ADDRESS),
                    AppConstants.DISCOVERY_PORT
            );

            socket.send(packet);
        } catch (SocketException | UnknownHostException e) {
            log.debug("Subnet broadcast announcement skipped or unreachable: {}", e.getMessage());
        } catch (IOException ioe) {
            log.warn("IO error broadcasting subnet announcement: {}", ioe.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected failure during peer broadcast: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedDelay = 8000)
    @Override
    public void evictStalePeers() {
        try {
            long now = System.currentTimeMillis();
            peers.entrySet().removeIf(e -> (now - e.getValue().lastSeen()) > 15000);
        } catch (Exception e) {
            log.warn("Error during stale peer eviction: {}", e.getMessage(), e);
        }
    }

    @Override
    public List<DiscoveredPeer> getDiscoveredPeers() {
        return new ArrayList<>(peers.values());
    }

    private static String resolveDeviceName() {
        try {
            String host = InetAddress.getLocalHost().getHostName();
            if (host != null && !host.isBlank()) return host;
        } catch (UnknownHostException uhe) {
            log.debug("Unable to resolve local host name, using OS-based identifier: {}", uhe.getMessage());
        } catch (Exception e) {
            log.debug("Error while resolving device name: {}", e.getMessage());
        }

        String os = System.getProperty(PROP_OS_NAME, "Host");
        return os + "-W2W";
    }
}
