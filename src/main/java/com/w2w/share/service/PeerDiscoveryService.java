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

import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PeerDiscoveryService implements IPeerDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(PeerDiscoveryService.class);

    @Value("${server.port:8080}")
    private int serverPort;

    private final String nodeId = UUID.randomUUID().toString();
    private final String hostDeviceName = resolveDeviceName();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, DiscoveredPeer> peers = new ConcurrentHashMap<>();

    private DatagramSocket socket;
    private volatile boolean running = false;
    private Thread listenerThread;

    public record DiscoveredPeer(
            String nodeId,
            String deviceName,
            String ip,
            int port,
            String url,
            long lastSeen
    ) {}

    @PostConstruct
    @Override
    public void start() {
        try {
            socket = new DatagramSocket(null);
            socket.setReuseAddress(true);
            socket.setBroadcast(true);
            socket.bind(new InetSocketAddress(AppConstants.DISCOVERY_PORT));

            running = true;

            listenerThread = new Thread(this::listenForPeers, "W2W-Peer-Discovery-Listener");
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

                String json = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8);
                Map<String, Object> map = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});

                String peerNodeId = (String) map.get("nodeId");
                if (peerNodeId != null && !peerNodeId.equals(this.nodeId)) {
                    String peerDevice = map.containsKey("deviceName") ? String.valueOf(map.get("deviceName")) : "Unknown Device";
                    String peerIp = packet.getAddress().getHostAddress();
                    int peerPort = map.containsKey("port") ? ((Number) map.get("port")).intValue() : 8080;
                    String peerUrl = "http://" + peerIp + ":" + peerPort;

                    peers.put(peerNodeId, new DiscoveredPeer(
                            peerNodeId,
                            peerDevice,
                            peerIp,
                            peerPort,
                            peerUrl,
                            System.currentTimeMillis()
                    ));
                }
            } catch (SocketException se) {
                break;
            } catch (Exception ignored) {}
        }
    }

    @Scheduled(fixedDelay = 4000)
    @Override
    public void broadcastAnnouncement() {
        if (!running || socket == null || socket.isClosed()) return;

        try {
            Map<String, Object> announcement = Map.of(
                    "service", "w2w-share",
                    "nodeId", this.nodeId,
                    "deviceName", this.hostDeviceName,
                    "port", this.serverPort
            );

            byte[] bytes = objectMapper.writeValueAsBytes(announcement);
            DatagramPacket packet = new DatagramPacket(
                    bytes,
                    bytes.length,
                    InetAddress.getByName(AppConstants.BROADCAST_ADDRESS),
                    AppConstants.DISCOVERY_PORT
            );

            socket.send(packet);
        } catch (Exception ignored) {}
    }

    @Scheduled(fixedDelay = 8000)
    @Override
    public void evictStalePeers() {
        long now = System.currentTimeMillis();
        peers.entrySet().removeIf(e -> (now - e.getValue().lastSeen()) > 15000);
    }

    @Override
    public List<DiscoveredPeer> getDiscoveredPeers() {
        return new ArrayList<>(peers.values());
    }

    private static String resolveDeviceName() {
        try {
            String host = InetAddress.getLocalHost().getHostName();
            if (host != null && !host.isBlank()) return host;
        } catch (Exception ignored) {}

        String os = System.getProperty("os.name", "Host");
        return os + "-W2W";
    }
}
