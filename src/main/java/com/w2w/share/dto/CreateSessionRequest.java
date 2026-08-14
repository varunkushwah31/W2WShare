package com.w2w.share.dto;

public record CreateSessionRequest(
        String senderId,
        Boolean burnAfterReading,
        Integer maxDownloads,
        Long expiresInSeconds
) {
    public boolean isBurnAfterReading() {
        return Boolean.TRUE.equals(burnAfterReading);
    }

    public int getMaxDownloads() {
        return maxDownloads != null ? maxDownloads : 0;
    }
}
