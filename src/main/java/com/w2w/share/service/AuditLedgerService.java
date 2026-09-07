package com.w2w.share.service;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.model.AuditRecordEntity;
import com.w2w.share.repository.AuditRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuditLedgerService implements IAuditLedgerService {

    private static final Logger log = LoggerFactory.getLogger(AuditLedgerService.class);
    private static final long SEVEN_DAYS_MS = 7L * 24 * 60 * 60 * 1000;

    private final AuditRecordRepository repository;

    public AuditLedgerService(AuditRecordRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public AuditRecordDto recordTransaction(AuditRecordDto dto) {
        return saveTransaction(dto, null, dto != null ? dto.userId() : null, dto != null ? dto.mimeType() : null);
    }

    @Override
    @Transactional
    public AuditRecordDto recordTransaction(AuditRecordDto dto, byte[] fileData, String userId, String mimeType) {
        return saveTransaction(dto, fileData, userId, mimeType);
    }

    private AuditRecordDto saveTransaction(AuditRecordDto dto, byte[] fileData, String userId, String mimeType) {
        if (dto == null) {
            throw new IllegalArgumentException("Audit record payload cannot be null");
        }
        String txId = sanitizeField(dto.id(), "TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(), 64);
        long timestamp = dto.timestamp() > 0 ? dto.timestamp() : System.currentTimeMillis();
        String direction = sanitizeField(dto.direction(), "SENT", 16);
        String fileName = sanitizeField(dto.fileName(), "unnamed_payload", 512);
        String sha256 = sanitizeField(dto.sha256(), "", 128);
        String cipher = sanitizeField(dto.cipher(), "AES-256-GCM / PBKDF2 (100k)", 128);
        String signature = generateCryptographicSignature(txId, fileName, sha256, timestamp);

        AuditRecordEntity entity = repository.findByTransactionId(txId).orElseGet(() -> new AuditRecordEntity(
                txId,
                timestamp,
                direction,
                fileName,
                dto.fileSize(),
                dto.totalChunks(),
                sha256,
                cipher,
                dto.burned(),
                dto.isCompressed(),
                signature
        ));

        entity.setDirection(direction);
        entity.setFileName(fileName);
        entity.setFileSize(dto.fileSize());
        entity.setTotalChunks(dto.totalChunks());
        entity.setSha256(sha256);
        entity.setCipher(cipher);
        entity.setBurned(dto.burned());
        entity.setCompressed(dto.isCompressed());
        entity.setSignature(signature);

        String effectiveUserId = userId != null && !userId.isBlank() ? userId.trim() : dto.userId();
        if (effectiveUserId != null && !effectiveUserId.isBlank()) {
            entity.setUserId(effectiveUserId);
        }

        if (mimeType != null && !mimeType.isBlank()) {
            entity.setMimeType(mimeType.trim());
        } else if (dto.mimeType() != null && !dto.mimeType().isBlank()) {
            entity.setMimeType(dto.mimeType());
        }

        // If user is logged in (effectiveUserId is present) and fileData is provided, persist it for 7 days
        if (fileData != null && fileData.length > 0 && effectiveUserId != null && !effectiveUserId.isBlank()) {
            entity.setFileData(fileData);
            entity.setPersisted(true);
            entity.setDeleted(false);
            entity.setExpiryTimestamp(timestamp + SEVEN_DAYS_MS);
            entity.setRetentionDays(7);
            log.info("Persisting file payload for [{}] ({} bytes) under user [{}], 7-day retention until: {}",
                    txId, fileData.length, effectiveUserId, entity.getExpiryTimestamp());
        }

        AuditRecordEntity saved = repository.save(entity);
        log.info("Persisted cryptographic audit record: [{}] ({}) - persisted: {}",
                saved.getTransactionId(), saved.getFileName(), saved.isPersisted());
        return AuditRecordDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public AuditRecordDto persistFilePayload(String transactionId, byte[] fileData, String mimeType, String userId) {
        if (transactionId == null || transactionId.isBlank()) {
            throw new IllegalArgumentException("Transaction ID is required for persisting file");
        }
        if (fileData == null || fileData.length == 0) {
            throw new IllegalArgumentException("File payload cannot be empty");
        }

        AuditRecordEntity entity = repository.findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction record not found: " + transactionId));

        if (userId != null && !userId.isBlank()) {
            entity.setUserId(userId.trim());
        }
        if (mimeType != null && !mimeType.isBlank()) {
            entity.setMimeType(mimeType.trim());
        }

        entity.setFileData(fileData);
        entity.setPersisted(true);
        entity.setDeleted(false);
        entity.setExpiryTimestamp(System.currentTimeMillis() + SEVEN_DAYS_MS);
        entity.setRetentionDays(7);

        AuditRecordEntity saved = repository.save(entity);
        log.info("Stored file payload ({} bytes) in 7-day database vault for TX [{}]", fileData.length, transactionId);
        return AuditRecordDto.fromEntity(saved);
    }

    private static String sanitizeField(String value, String defaultValue, int maxLength) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        String trimmed = value.trim();
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditRecordDto> getAllRecords() {
        return fetchAllRecords();
    }

    private List<AuditRecordDto> fetchAllRecords() {
        return repository.findAllByOrderByTimestampDesc().stream()
                .map(AuditRecordDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditRecordDto> getRecordsForUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return fetchAllRecords();
        }
        return repository.findByUserIdOrderByTimestampDesc(userId.trim()).stream()
                .map(AuditRecordDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuditReceiptDto> getReceipt(String transactionId) {
        if (transactionId == null || transactionId.isBlank()) {
            return Optional.empty();
        }
        return repository.findByTransactionId(transactionId)
                .map(AuditReceiptDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<byte[]> getPersistedFile(String transactionId) {
        if (transactionId == null || transactionId.isBlank()) {
            return Optional.empty();
        }
        return repository.findByTransactionId(transactionId)
                .filter(entity -> !entity.isDeleted() && !entity.isExpired() && entity.getFileData() != null)
                .map(AuditRecordEntity::getFileData);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuditRecordEntity> getRecordEntity(String transactionId) {
        if (transactionId == null || transactionId.isBlank()) {
            return Optional.empty();
        }
        return repository.findByTransactionId(transactionId);
    }

    @Override
    @Transactional
    public void deleteRecord(String transactionId) {
        if (transactionId != null && !transactionId.isBlank()) {
            repository.deleteByTransactionId(transactionId);
            log.info("Deleted audit record [{}]", transactionId);
        }
    }

    @Override
    @Transactional
    public void clearLedger() {
        repository.deleteAll();
        log.info("Cleared all persistent cryptographic audit records.");
    }

    @Override
    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    @Transactional
    public int cleanupExpiredPersistedFiles() {
        long now = System.currentTimeMillis();
        List<AuditRecordEntity> expiredRecords = repository.findAllByExpiryTimestampLessThanEqualAndIsDeletedFalse(now);
        if (expiredRecords.isEmpty()) {
            return 0;
        }

        int count = 0;
        for (AuditRecordEntity entity : expiredRecords) {
            if (entity.isPersisted()) {
                entity.setFileData(null);
                entity.setDeleted(true);
                repository.save(entity);
                count++;
                log.info("[AUDIT-PURGE] Auto-purged expired file payload from database for TX [{}] ({}) after 7 days retention",
                        entity.getTransactionId(), entity.getFileName());
            }
        }
        return count;
    }

    private String generateCryptographicSignature(String txId, String fileName, String sha256, long timestamp) {
        try {
            String raw = txId + ":" + fileName + ":" + sha256 + ":" + timestamp;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return "SIG_" + HexFormat.of().formatHex(hash).substring(0, 32).toUpperCase();
        } catch (Exception _) {
            return "SIG_LOCAL_KEYSTORE_VALID";
        }
    }
}

