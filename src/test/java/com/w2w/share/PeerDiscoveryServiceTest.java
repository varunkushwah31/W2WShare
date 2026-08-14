package com.w2w.share;

import com.w2w.share.service.PeerDiscoveryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

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
    }
}
