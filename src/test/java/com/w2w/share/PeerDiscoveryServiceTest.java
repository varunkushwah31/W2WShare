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
    }
}
