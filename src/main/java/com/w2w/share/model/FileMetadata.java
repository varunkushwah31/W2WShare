package com.w2w.share.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FileMetadata(
        String fileName,
        long fileSize,
        String mimeType,
        int totalChunks,
        long chunkSize,
        @JsonProperty("salt") String salt,
        @JsonProperty("iv") String iv,
        @JsonProperty("authTag") String authTag,
        @JsonProperty("sha256") String sha256Checksum,
        String relativePath,
        @JsonProperty("isCompressed") boolean isCompressed,
        @JsonProperty("originalSize") long originalSize
) {
    public FileMetadata(
            String fileName,
            long fileSize,
            String mimeType,
            int totalChunks,
            long chunkSize,
            String salt,
            String iv,
            String authTag,
            String sha256Checksum,
            String relativePath
    ) {
        this(fileName, fileSize, mimeType, totalChunks, chunkSize, salt, iv, authTag, sha256Checksum, relativePath, false, fileSize);
    }

    public FileMetadata(
            String fileName,
            long fileSize,
            String mimeType,
            int totalChunks,
            long chunkSize,
            String salt,
            String iv,
            String authTag,
            String sha256Checksum
    ) {
        this(fileName, fileSize, mimeType, totalChunks, chunkSize, salt, iv, authTag, sha256Checksum, fileName, false, fileSize);
    }
}
