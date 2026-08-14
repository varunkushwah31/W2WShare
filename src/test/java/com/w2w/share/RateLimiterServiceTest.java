package com.w2w.share;

import com.w2w.share.service.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
    }

    @Test
    void testAllowedUnderThreshold() {
        String client = "192.168.1.50";
        assertTrue(rateLimiterService.checkAllowed(client));

        // 4 failed attempts should still be allowed
        for (int i = 0; i < 4; i++) {
            rateLimiterService.recordFailedAttempt(client);
            assertTrue(rateLimiterService.checkAllowed(client));
        }
    }

    @Test
    void testLockoutAfter5Failures() {
        String client = "192.168.1.50";

        for (int i = 0; i < 5; i++) {
            rateLimiterService.recordFailedAttempt(client);
        }

        assertFalse(rateLimiterService.checkAllowed(client));
        assertTrue(rateLimiterService.getRemainingLockoutSeconds(client) > 0);
    }

    @Test
    void testResetOnSuccess() {
        String client = "192.168.1.50";

        for (int i = 0; i < 3; i++) {
            rateLimiterService.recordFailedAttempt(client);
        }

        rateLimiterService.reset(client);
        assertTrue(rateLimiterService.checkAllowed(client));
    }
}
