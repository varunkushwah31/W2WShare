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

    private MulticastSocket socket;
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
            socket = new MulticastSocket(null);
            socket.setReuseAddress(true);
            socket.setBroadcast(true);
            socket.bind(new InetSocketAddress(AppConstants.DISCOVERY_PORT));

            joinMulticastGroupAcrossInterfaces();

            running = true;

            Thread listenerThread = new Thread(this::listenForPeers, "W2W-Peer-Discovery-Listener");
            listenerThread.setDaemon(true);
            listenerThread.start();

            log.info("Initialized UDP Subnet Peer Discovery (Broadcast & Multicast) on port {}", AppConstants.DISCOVERY_PORT);
        } catch (Exception e) {
            log.warn("Could not bind UDP discovery socket on port {}: {}", AppConstants.DISCOVERY_PORT, e.getMessage());
        }
    }

    private void joinMulticastGroupAcrossInterfaces() {
        try {
            InetAddress group = InetAddress.getByName(AppConstants.MULTICAST_ADDRESS);
            InetSocketAddress groupAddress = new InetSocketAddress(group, AppConstants.DISCOVERY_PORT);
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                joinMulticastOnInterface(interfaces.nextElement(), groupAddress);
            }
        } catch (Exception e) {
            log.debug("Multicast group join failed: {}", e.getMessage());
        }
    }

    private void joinMulticastOnInterface(NetworkInterface iface, SocketAddress groupAddress) {
        try {
            if (iface.isUp() && !iface.isLoopback() && iface.supportsMulticast()) {
                socket.joinGroup(groupAddress, iface);
            }
        } catch (Exception e) {
            log.trace("Could not join multicast group on interface {}: {}", iface.getName(), e.getMessage());
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
        Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {
        });

        String peerNodeId = map.containsKey(KEY_DEVICE_ID) ? String.valueOf(map.get(KEY_DEVICE_ID)) : (String) map.get(KEY_NODE_ID);
        if (peerNodeId == null || peerNodeId.equals(this.nodeId)) {
            return;
        }

        String peerDevice = map.containsKey(KEY_DEVICE_NAME) ? String.valueOf(map.get(KEY_DEVICE_NAME)) : "Unknown Device";
        String peerIp = packet.getAddress().getHostAddress();
        int peerPort = 8080;
        if (map.containsKey(KEY_PORT)) {
            Object portObj = map.get(KEY_PORT);
            if (portObj instanceof Number n) {
                peerPort = n.intValue();
            } else if (portObj != null) {
                try {
                    peerPort = Integer.parseInt(String.valueOf(portObj).trim());
                } catch (NumberFormatException _) {
                    peerPort = 8080;
                }
            }
        }
        String peerOs = map.containsKey(KEY_OS) ? String.valueOf(map.get(KEY_OS)) : System.getProperty(PROP_OS_NAME, "Unknown");
        String peerUrl = "http://" + peerIp + ":" + peerPort;

        boolean isNew = !peers.containsKey(peerNodeId);
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
        if (isNew) {
            log.info("[PEER-RADAR] Discovered new peer via UDP: \"{}\" ({}) at {}:{} [{}]",
                    peerDevice, peerNodeId, peerIp, peerPort, peerOs);
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
            sendGlobalBroadcast(bytes);
            sendMulticastBroadcast(bytes);
            sendDirectedInterfaceBroadcasts(bytes);
        } catch (IOException ioe) {
            log.warn("IO error broadcasting subnet announcement: {}", ioe.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected failure during peer broadcast: {}", e.getMessage(), e);
        }
    }

    private void sendGlobalBroadcast(byte[] bytes) {
        try {
            DatagramPacket globalPacket = new DatagramPacket(
                    bytes,
                    bytes.length,
                    InetAddress.getByName(AppConstants.BROADCAST_ADDRESS),
                    AppConstants.DISCOVERY_PORT
            );
            socket.send(globalPacket);
        } catch (Exception e) {
            log.debug("Global broadcast skipped: {}", e.getMessage());
        }
    }

    private void sendMulticastBroadcast(byte[] bytes) {
        try {
            DatagramPacket multicastPacket = new DatagramPacket(
                    bytes,
                    bytes.length,
                    InetAddress.getByName(AppConstants.MULTICAST_ADDRESS),
                    AppConstants.DISCOVERY_PORT
            );
            socket.send(multicastPacket);
        } catch (Exception e) {
            log.debug("Multicast broadcast skipped: {}", e.getMessage());
        }
    }

    private void sendDirectedInterfaceBroadcasts(byte[] bytes) {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                broadcastOnInterface(interfaces.nextElement(), bytes);
            }
        } catch (Exception ex) {
            log.debug("Subnet interface iteration encountered error: {}", ex.getMessage());
        }
    }

    private void broadcastOnInterface(NetworkInterface iface, byte[] bytes) {
        try {
            if (!iface.isUp() || iface.isLoopback() || iface.isVirtual()) return;

            for (InterfaceAddress address : iface.getInterfaceAddresses()) {
                sendToBroadcastAddress(address, bytes);
            }
        } catch (Exception ex) {
            log.trace("Error querying interface {}: {}", iface.getName(), ex.getMessage());
        }
    }

    private void sendToBroadcastAddress(InterfaceAddress address, byte[] bytes) {
        InetAddress broadcast = address.getBroadcast();
        if (broadcast != null && !broadcast.equals(address.getAddress())) {
            try {
                DatagramPacket directedPacket = new DatagramPacket(
                        bytes,
                        bytes.length,
                        broadcast,
                        AppConstants.DISCOVERY_PORT
                );
                socket.send(directedPacket);
            } catch (Exception ex) {
                log.trace("Could not send broadcast to {}: {}", broadcast, ex.getMessage());
            }
        }
    }

    @Scheduled(fixedDelay = 8000)
    @Override
    public void evictStalePeers() {
        try {
            long now = System.currentTimeMillis();
            peers.entrySet().removeIf(e -> {
                boolean stale = (now - e.getValue().lastSeen()) > 15000;
                if (stale) {
                    log.info("[PEER-RADAR] Evicted inactive peer: \"{}\" ({})", e.getValue().deviceName(), e.getKey());
                }
                return stale;
            });
        } catch (Exception e) {
            log.warn("[PEER-RADAR] Error during stale peer eviction: {}", e.getMessage(), e);
        }
    }

    @Override
    public void triggerScan() {
        broadcastAnnouncement();
        evictStalePeers();
    }

    @Override
    public List<DiscoveredPeer> getDiscoveredPeers() {
        return new ArrayList<>(peers.values());
    }

    @Override
    public DiscoveredPeer registerPeer(String deviceId, String deviceName, String clientIp, int port, String os) {
        if (deviceId == null || deviceId.isBlank() || deviceId.equals(this.nodeId)) {
            return null;
        }
        String ip = normalizeClientIp(clientIp);
        int peerPort = port > 0 ? port : this.serverPort;
        String peerOs = (os != null && !os.isBlank()) ? os : "Web Client";
        String name = (deviceName != null && !deviceName.isBlank()) ? deviceName : "Peer Device";
        String peerUrl = "http://" + ip + ":" + peerPort;

        boolean isNew = !peers.containsKey(deviceId);
        DiscoveredPeer peer = new DiscoveredPeer(
                deviceId,
                deviceId,
                name,
                ip,
                peerPort,
                peerOs,
                peerUrl,
                System.currentTimeMillis()
        );
        peers.put(deviceId, peer);
        if (isNew) {
            log.info("[PEER-RADAR] Registered peer via HTTP beacon: \"{}\" ({}) at {}:{} [{}]",
                    name, deviceId, ip, peerPort, peerOs);
        }
        return peer;
    }

    private static String normalizeClientIp(String clientIp) {
        if (clientIp == null || clientIp.isBlank() || "0:0:0:0:0:0:0:1".equals(clientIp) || "::1".equals(clientIp)) {
            return "127.0.0.1";
        }
        return clientIp;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    private static String resolveDeviceName() {
        try {
            String host = InetAddress.getLocalHost().getHostName();
            if (host != null && !host.isBlank()) return host;
        } catch (UnknownHostException uhe) {
            log.debug("Unable to resolve local hostname, using OS-based identifier: {}", uhe.getMessage());
        } catch (Exception e) {
            log.debug("Error while resolving device name: {}", e.getMessage());
        }

        String os = System.getProperty(PROP_OS_NAME, "Host");
        return os + "-W2W";
    }
}
