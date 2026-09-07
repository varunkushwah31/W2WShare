package com.w2w.share;

import com.w2w.share.service.PeerDiscoveryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class PeerDiscoveryServiceTest {

    private PeerDiscoveryService peerDiscoveryService;

    @BeforeEach
    void setUp() {
        peerDiscoveryService = new PeerDiscoveryService();
        ReflectionTestUtils.setField(peerDiscoveryService, "serverPort", 8080);
        peerDiscoveryService.start();
    }

    @AfterEach
    void tearDown() {
        peerDiscoveryService.stop();
    }

    @Test
    void testPeerDiscoveryServiceLifecycle() {
        assertTrue(peerDiscoveryService.isRunning());
        assertNotNull(peerDiscoveryService.getDiscoveredPeers());
        // Trigger broadcast and evict cycles without exception
        assertDoesNotThrow(() -> peerDiscoveryService.broadcastAnnouncement());
        assertDoesNotThrow(() -> peerDiscoveryService.evictStalePeers());

        PeerDiscoveryService.DiscoveredPeer peer = new PeerDiscoveryService.DiscoveredPeer(
                "device-1", "node-1", "MacBook-Pro", "192.168.1.50", 8080, "macOS", "http://192.168.1.50:8080", System.currentTimeMillis()
        );
        assertEquals("device-1", peer.deviceId());
        assertEquals("node-1", peer.nodeId());
        assertEquals("macOS", peer.os());
        assertEquals("MacBook-Pro", peer.deviceName());

        // Test registering a web/mobile peer
        PeerDiscoveryService.DiscoveredPeer registered = peerDiscoveryService.registerPeer(
                "phone-123", "iPhone 15", "192.168.1.75", 8080, "iOS"
        );
        assertNotNull(registered);
        assertEquals("phone-123", registered.deviceId());
        assertEquals("iPhone 15", registered.deviceName());
        assertEquals("http://192.168.1.75:8080", registered.url());
        assertTrue(peerDiscoveryService.getDiscoveredPeers().stream().anyMatch(p -> p.deviceId().equals("phone-123")));

        assertDoesNotThrow(() -> peerDiscoveryService.triggerScan());
    }
}
