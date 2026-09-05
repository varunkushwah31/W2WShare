package com.w2w.share.exception;

import lombok.Getter;

import java.io.Serial;

@Getter
public class RateLimitExceededException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message, "RATE_LIMIT_EXCEEDED");
        this.retryAfterSeconds = retryAfterSeconds;
    }

}
