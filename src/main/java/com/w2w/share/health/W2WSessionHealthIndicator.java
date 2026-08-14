package com.w2w.share.health;

import com.w2w.share.service.ISessionService;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class W2WSessionHealthIndicator implements HealthIndicator {

    private final ISessionService sessionService;

    public W2WSessionHealthIndicator(ISessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public Health health() {
        int activeSessions = sessionService.getActiveSessionCount();
        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long usedMemory = totalMemory - freeMemory;

        return Health.up()
                .withDetail("activeTransferSessions", activeSessions)
                .withDetail("jvmUsedMemoryMB", usedMemory / (1024 * 1024))
                .withDetail("jvmTotalMemoryMB", totalMemory / (1024 * 1024))
                .withDetail("status", "OPERATIONAL")
                .build();
    }
}
