package com.w2w.share.service;

public interface IRateLimiterService {

    boolean checkAllowed(String clientIp);

    void recordFailedAttempt(String clientIp);

    void reset(String clientIp);

    long getRemainingLockoutSeconds(String clientIp);
}
