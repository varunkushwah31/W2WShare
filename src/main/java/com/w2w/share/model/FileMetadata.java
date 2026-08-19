package com.w2w.share.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record FileMetadata(
        @JsonProperty("fileName") String fileName,
        @JsonProperty("fileSize") Long fileSize,
        @JsonProperty("mimeType") String mimeType,
        @JsonProperty("totalChunks") Integer totalChunks,
        @JsonProperty("chunkSize") Long chunkSize,
        @JsonProperty("salt") String salt,
        @JsonProperty("iv") String iv,
        @JsonProperty("authTag") String authTag,
        @JsonProperty("sha256") String sha256Checksum,
        @JsonProperty("relativePath") String relativePath,
        @JsonProperty("isCompressed") Boolean isCompressed,
        @JsonProperty("originalSize") Long originalSize
) {
    @JsonCreator
    public FileMetadata(
            @JsonProperty("fileName") String fileName,
            @JsonProperty("fileSize") Long fileSize,
            @JsonProperty("mimeType") String mimeType,
            @JsonProperty("totalChunks") Integer totalChunks,
            @JsonProperty("chunkSize") Long chunkSize,
            @JsonProperty("salt") String salt,
            @JsonProperty("iv") String iv,
            @JsonProperty("authTag") String authTag,
            @JsonProperty("sha256") String sha256Checksum,
            @JsonProperty("relativePath") String relativePath,
            @JsonProperty("isCompressed") Boolean isCompressed,
            @JsonProperty("originalSize") Long originalSize
    ) {
        this.fileName = fileName != null ? fileName : "unknown";
        this.fileSize = fileSize != null ? fileSize : 0L;
        this.mimeType = mimeType != null ? mimeType : "application/octet-stream";
        this.totalChunks = totalChunks != null ? totalChunks : 1;
        this.chunkSize = chunkSize != null ? chunkSize : 2097152L;
        this.salt = salt;
        this.iv = iv;
        this.authTag = authTag;
        this.sha256Checksum = sha256Checksum;
        this.relativePath = relativePath != null ? relativePath : this.fileName;
        this.isCompressed = isCompressed != null && isCompressed;
        this.originalSize = originalSize != null ? originalSize : this.fileSize;
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
            String sha256Checksum,
            String relativePath,
            boolean isCompressed,
            long originalSize
    ) {
        this(fileName, Long.valueOf(fileSize), mimeType, Integer.valueOf(totalChunks), Long.valueOf(chunkSize), salt, iv, authTag, sha256Checksum, relativePath, Boolean.valueOf(isCompressed), Long.valueOf(originalSize));
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


