package com.w2w.share.dto;

public record CreateSessionResponse(
        String sessionId,
        String pin,
        String status,
        String joinUrl,
        boolean burnAfterReading,
        long createdAt
) {}
