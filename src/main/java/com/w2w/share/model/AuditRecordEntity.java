package com.w2w.share.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "w2w_audit_ledger")
@Getter
@Setter
@NoArgsConstructor
public class AuditRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String transactionId;

    @Column(nullable = false)
    private long timestamp;

    @Column(nullable = false, length = 16)
    private String direction; // SENT or RECEIVED

    @Column(nullable = false, length = 512)
    private String fileName;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private int totalChunks;

    @Column(nullable = false, length = 128)
    private String sha256;

    @Column(nullable = false, length = 128)
    private String cipher;

    @Column(nullable = false)
    private boolean burned;

    @Column(nullable = false)
    private boolean isCompressed;

    @Column(length = 256)
    private String signature;

    @Column(length = 128)
    private String userId;

    @Column(nullable = false)
    private boolean isPersisted;

    @Column(nullable = false)
    private long expiryTimestamp;

    @Column(nullable = false)
    private boolean isDeleted;

    @Column(length = 128)
    private String mimeType;

    @Column(nullable = false)
    private int retentionDays = 7;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(columnDefinition = "BLOB")
    private byte[] fileData;

    @SuppressWarnings("java:S107")
    public AuditRecordEntity(
            String transactionId,
            long timestamp,
            String direction,
            String fileName,
            long fileSize,
            int totalChunks,
            String sha256,
            String cipher,
            boolean burned,
            boolean isCompressed,
            String signature
    ) {
        this.transactionId = transactionId;
        this.timestamp = timestamp;
        this.direction = direction;
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.totalChunks = totalChunks;
        this.sha256 = sha256;
        this.cipher = cipher;
        this.burned = burned;
        this.isCompressed = isCompressed;
        this.signature = signature;
        this.isPersisted = false;
        this.expiryTimestamp = timestamp + (7L * 24 * 60 * 60 * 1000);
        this.isDeleted = false;
        this.retentionDays = 7;
    }

    public boolean isExpired() {
        return System.currentTimeMillis() > this.expiryTimestamp;
    }

    public boolean canDownload() {
        return this.isPersisted && !this.isDeleted && !isExpired() && (this.fileData != null && this.fileData.length > 0);
    }
}
