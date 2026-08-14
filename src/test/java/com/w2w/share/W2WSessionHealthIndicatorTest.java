package com.w2w.share;

import com.w2w.share.health.W2WSessionHealthIndicator;
import com.w2w.share.service.SessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.Status;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class W2WSessionHealthIndicatorTest {

    private SessionService sessionService;
    private W2WSessionHealthIndicator sessionHealthIndicator;

    @BeforeEach
    void setUp() {
        sessionService = Mockito.mock(SessionService.class);
        sessionHealthIndicator = new W2WSessionHealthIndicator(sessionService);
    }

    @Test
    void testSessionHealthReturnsUp() {
        when(sessionService.getActiveSessionCount()).thenReturn(3);

        Health health = sessionHealthIndicator.health();
        assertNotNull(health);
        assertEquals(Status.UP, health.getStatus());
        assertEquals(3, health.getDetails().get("activeTransferSessions"));
        assertTrue(health.getDetails().containsKey("jvmUsedMemoryMB"));
    }
}
