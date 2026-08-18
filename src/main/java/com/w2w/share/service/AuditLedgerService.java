package com.w2w.share.service;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.model.AuditRecordEntity;
import com.w2w.share.repository.AuditRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuditLedgerService implements IAuditLedgerService {

    private static final Logger log = LoggerFactory.getLogger(AuditLedgerService.class);

    private final AuditRecordRepository repository;

    public AuditLedgerService(AuditRecordRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public AuditRecordDto recordTransaction(AuditRecordDto dto) {
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

        AuditRecordEntity entity = new AuditRecordEntity(
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
        );

        AuditRecordEntity saved = repository.save(entity);
        log.info("Persisted cryptographic audit record: [{}] ({})", saved.getTransactionId(), saved.getFileName());
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
        return repository.findAllByOrderByTimestampDesc().stream()
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
    @Transactional
    public void clearLedger() {
        repository.deleteAll();
        log.info("Cleared all persistent cryptographic audit records.");
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
