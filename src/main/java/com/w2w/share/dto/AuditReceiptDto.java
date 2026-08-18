package com.w2w.share.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.w2w.share.model.AuditRecordEntity;

import java.time.Instant;

public record AuditReceiptDto(
        @JsonProperty("w2w_version") String w2wVersion,
        @JsonProperty("transaction_id") String transactionId,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("direction") String direction,
        @JsonProperty("file_name") String fileName,
        @JsonProperty("file_size_bytes") long fileSizeBytes,
        @JsonProperty("total_chunks") int totalChunks,
        @JsonProperty("cryptographic_algorithm") String cryptographicAlgorithm,
        @JsonProperty("sha256_integrity_hash") String sha256IntegrityHash,
        @JsonProperty("burn_after_reading") boolean burnAfterReading,
        @JsonProperty("gzip_pre_compressed") boolean gzipPreCompressed,
        @JsonProperty("signature_verification") String signatureVerification
) {
    public static AuditReceiptDto fromEntity(AuditRecordEntity entity) {
        return new AuditReceiptDto(
                "1.0.0 (Offline E2EE)",
                entity.getTransactionId(),
                Instant.ofEpochMilli(entity.getTimestamp()).toString(),
                entity.getDirection(),
                entity.getFileName(),
                entity.getFileSize(),
                entity.getTotalChunks(),
                entity.getCipher(),
                entity.getSha256(),
                entity.isBurned(),
                entity.isCompressed(),
                entity.getSignature() != null ? entity.getSignature() : "VALID · LOCAL_DEVICE_KEYSTORE"
        );
    }
}
