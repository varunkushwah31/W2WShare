package com.w2w.share.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.w2w.share.model.AuditRecordEntity;

public record AuditRecordDto(
        String id,
        long timestamp,
        String direction,
        String fileName,
        long fileSize,
        int totalChunks,
        String sha256,
        String cipher,
        boolean burned,
        @JsonProperty("isCompressed") boolean isCompressed,
        String userId,
        @JsonProperty("isPersisted") boolean isPersisted,
        long expiryTimestamp,
        @JsonProperty("isDeleted") boolean isDeleted,
        String mimeType,
        int retentionDays,
        @JsonProperty("isExpired") boolean isExpired,
        @JsonProperty("canDownload") boolean canDownload,
        long daysRemaining
) {
    public AuditRecordDto(
            String id,
            long timestamp,
            String direction,
            String fileName,
            long fileSize,
            int totalChunks,
            String sha256,
            String cipher,
            boolean burned,
            boolean isCompressed
    ) {
        this(
                id,
                timestamp,
                direction,
                fileName,
                fileSize,
                totalChunks,
                sha256,
                cipher,
                burned,
                isCompressed,
                null,
                false,
                timestamp + (7L * 24 * 60 * 60 * 1000),
                false,
                "application/octet-stream",
                7,
                false,
                false,
                7
        );
    }

    public static AuditRecordDto fromEntity(AuditRecordEntity entity) {
        long now = System.currentTimeMillis();
        boolean expired = now > entity.getExpiryTimestamp();
        long millisRemaining = Math.max(0, entity.getExpiryTimestamp() - now);
        long daysRemaining = (millisRemaining + (24 * 60 * 60 * 1000 - 1)) / (24 * 60 * 60 * 1000);

        return new AuditRecordDto(
                entity.getTransactionId(),
                entity.getTimestamp(),
                entity.getDirection(),
                entity.getFileName(),
                entity.getFileSize(),
                entity.getTotalChunks(),
                entity.getSha256(),
                entity.getCipher(),
                entity.isBurned(),
                entity.isCompressed(),
                entity.getUserId(),
                entity.isPersisted(),
                entity.getExpiryTimestamp(),
                entity.isDeleted(),
                entity.getMimeType(),
                entity.getRetentionDays() > 0 ? entity.getRetentionDays() : 7,
                expired,
                entity.canDownload(),
                daysRemaining
        );
    }
}

