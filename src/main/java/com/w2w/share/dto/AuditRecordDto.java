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
        @JsonProperty("isCompressed") boolean isCompressed
) {
    public static AuditRecordDto fromEntity(AuditRecordEntity entity) {
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
                entity.isCompressed()
        );
    }
}
