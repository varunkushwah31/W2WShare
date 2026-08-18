package com.w2w.share.service;

import com.w2w.share.constant.AppConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService implements IRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final Map<String, ClientAttempt> attempts = new ConcurrentHashMap<>();

    private static class ClientAttempt {
        int failureCount = 0;
        long lockedUntilEpochMs = 0;
    }

    private String sanitizeIp(String clientIp) {
        return (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "unknown-ip";
    }

    @Override
    public boolean checkAllowed(String clientIp) {
        String ipKey = sanitizeIp(clientIp);
        ClientAttempt attempt = attempts.get(ipKey);
        if (attempt == null) return true;

        long now = System.currentTimeMillis();
        if (attempt.lockedUntilEpochMs > now) {
            long remaining = (attempt.lockedUntilEpochMs - now) / 1000;
            log.warn("Rate limit exceeded for client [{}]. Locked for {}s more.", ipKey, remaining);
            return false;
        }

        return true;
    }

    @Override
    public void recordFailedAttempt(String clientIp) {
        String ipKey = sanitizeIp(clientIp);
        attempts.compute(ipKey, (ip, attempt) -> {
            if (attempt == null) {
                attempt = new ClientAttempt();
            }
            attempt.failureCount++;
            if (attempt.failureCount >= AppConstants.RATE_LIMIT_MAX_ATTEMPTS) {
                attempt.lockedUntilEpochMs = System.currentTimeMillis() + (AppConstants.RATE_LIMIT_LOCKOUT_SECONDS * 1000);
                log.warn("Client [{}] locked out for {} seconds due to {} failed attempts",
                        ipKey, AppConstants.RATE_LIMIT_LOCKOUT_SECONDS, attempt.failureCount);
            }
            return attempt;
        });
    }

    @Override
    public void reset(String clientIp) {
        attempts.remove(sanitizeIp(clientIp));
    }

    @Override
    public long getRemainingLockoutSeconds(String clientIp) {
        ClientAttempt attempt = attempts.get(sanitizeIp(clientIp));
        if (attempt == null) return 0;
        long diff = attempt.lockedUntilEpochMs - System.currentTimeMillis();
        return diff > 0 ? (diff / 1000) : 0;
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 60000)
    public void evictExpiredAttempts() {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> {
            ClientAttempt attempt = entry.getValue();
            return attempt != null && attempt.lockedUntilEpochMs > 0 && attempt.lockedUntilEpochMs < now;
        });
    }
}
