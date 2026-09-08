package com.w2w.share.controller;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.model.AuditRecordEntity;
import com.w2w.share.service.IAuditLedgerService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/audit")
public class AuditLedgerController {

    private final IAuditLedgerService auditLedgerService;

    public AuditLedgerController(IAuditLedgerService auditLedgerService) {
        this.auditLedgerService = auditLedgerService;
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<AuditRecordDto>> getLedger(@RequestParam(required = false) String userId) {
        if (userId != null && !userId.isBlank()) {
            return ResponseEntity.ok(auditLedgerService.getRecordsForUser(userId));
        }
        return ResponseEntity.ok(auditLedgerService.getAllRecords());
    }

    @PostMapping("/ledger")
    public ResponseEntity<AuditRecordDto> recordTransaction(@RequestBody AuditRecordDto auditRecordDto) {
        if (auditRecordDto == null) {
            throw new IllegalArgumentException("Audit record payload cannot be null");
        }
        AuditRecordDto saved = auditLedgerService.recordTransaction(auditRecordDto);
        return ResponseEntity.ok(saved);
    }

    @PostMapping(value = "/ledger/persist", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AuditRecordDto> persistFileMultipart(
            @RequestParam("transactionId") String transactionId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "mimeType", required = false) String mimeType,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        byte[] bytes = file.getBytes();
        String effectiveMime = (mimeType != null && !mimeType.isBlank())
                ? mimeType
                : (file.getContentType() != null ? file.getContentType() : "application/octet-stream");

        AuditRecordDto saved = auditLedgerService.persistFilePayload(transactionId, bytes, effectiveMime, userId);
        return ResponseEntity.ok(saved);
    }

    @PostMapping(value = "/ledger/{transactionId}/persist", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<AuditRecordDto> persistFileBinary(
            @PathVariable String transactionId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "mimeType", required = false, defaultValue = "application/octet-stream") String mimeType,
            @RequestBody byte[] data
    ) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("File binary payload cannot be empty");
        }
        AuditRecordDto saved = auditLedgerService.persistFilePayload(transactionId, data, mimeType, userId);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/ledger/{transactionId}/download")
    public ResponseEntity<byte[]> downloadPersistedFile(@PathVariable String transactionId) {
        Optional<AuditRecordEntity> entityOpt = auditLedgerService.getRecordEntity(transactionId);
        if (entityOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AuditRecordEntity entity = entityOpt.get();
        if (!entity.isPersisted()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .header("X-W2W-Error", "FILE_NOT_PERSISTED_FOR_GUEST")
                    .body(("File was transferred in ephemeral guest mode and is not stored in the database.").getBytes());
        }

        if (entity.isDeleted() || entity.isExpired()) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .header("X-W2W-Error", "FILE_EXPIRED_7_DAYS")
                    .body(("The requested file has expired after the 7-day retention period and was automatically deleted from the database.").getBytes());
        }

        byte[] fileBytes = entity.getFileData();
        if (fileBytes == null || fileBytes.length == 0) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .header("X-W2W-Error", "FILE_PAYLOAD_PURGED")
                    .body(("File payload is no longer available.").getBytes());
        }

        String mimeType = entity.getMimeType() != null && !entity.getMimeType().isBlank()
                ? entity.getMimeType()
                : "application/octet-stream";

        MediaType contentType;
        try {
            contentType = MediaType.parseMediaType(mimeType);
        } catch (Exception _) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String safeFileName = entity.getFileName() != null ? entity.getFileName().replace("\"", "\\\"") : "shared-file.bin";

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFileName + "\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileBytes.length))
                .header("X-W2W-Transaction-Id", entity.getTransactionId())
                .header("X-W2W-SHA256", entity.getSha256() != null ? entity.getSha256() : "")
                .body(fileBytes);
    }

    @GetMapping(value = "/ledger/{transactionId}/receipt", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuditReceiptDto> getReceipt(@PathVariable String transactionId) {
        return auditLedgerService.getReceipt(transactionId)
                .map(receipt -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-receipt-" + transactionId + ".json\"")
                        .body(receipt))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/ledger/{transactionId}")
    public ResponseEntity<Map<String, String>> deleteRecord(@PathVariable String transactionId) {
        auditLedgerService.deleteRecord(transactionId);
        return ResponseEntity.ok(Map.of("status", "RECORD_DELETED", "transactionId", transactionId));
    }

    @DeleteMapping("/ledger")
    public ResponseEntity<Map<String, String>> clearLedger() {
        auditLedgerService.clearLedger();
        return ResponseEntity.ok(Map.of("status", "LEDGER_CLEARED"));
    }
}

