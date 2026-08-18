package com.w2w.share.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "w2w.security")
public class SecurityProperties {

    private List<String> allowedOrigins = List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000"
    );
    private int apiRateLimit = 100;
    private int apiRateLimitWindowSeconds = 60;
    private int maxRequestSizeBytes = 50 * 1024 * 1024; // 50MB per chunk max
    private boolean requireHttps = false;
    private int maxFailedAttempts = 5;
    private int lockoutDurationSeconds = 60;
}