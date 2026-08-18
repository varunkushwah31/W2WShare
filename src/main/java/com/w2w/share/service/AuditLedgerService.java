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
        String txId = (dto.id() != null && !dto.id().isBlank())
                ? dto.id()
                : "TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        long timestamp = dto.timestamp() > 0 ? dto.timestamp() : System.currentTimeMillis();
        String direction = dto.direction() != null ? dto.direction() : "SENT";
        String cipher = dto.cipher() != null ? dto.cipher() : "AES-256-GCM / PBKDF2 (100k)";
        String signature = generateCryptographicSignature(txId, dto.fileName(), dto.sha256(), timestamp);

        AuditRecordEntity entity = new AuditRecordEntity(
                txId,
                timestamp,
                direction,
                dto.fileName() != null ? dto.fileName() : "unnamed_payload",
                dto.fileSize(),
                dto.totalChunks(),
                dto.sha256() != null ? dto.sha256() : "",
                cipher,
                dto.burned(),
                dto.isCompressed(),
                signature
        );

        AuditRecordEntity saved = repository.save(entity);
        log.info("Persisted cryptographic audit record: [{}] ({})", saved.getTransactionId(), saved.getFileName());
        return AuditRecordDto.fromEntity(saved);
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
        } catch (Exception e) {
            return "SIG_LOCAL_KEYSTORE_VALID";
        }
    }
}
