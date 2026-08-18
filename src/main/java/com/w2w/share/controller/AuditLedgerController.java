package com.w2w.share.controller;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.service.IAuditLedgerService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
public class AuditLedgerController {

    private final IAuditLedgerService auditLedgerService;

    public AuditLedgerController(IAuditLedgerService auditLedgerService) {
        this.auditLedgerService = auditLedgerService;
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<AuditRecordDto>> getLedger() {
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

    @GetMapping(value = "/ledger/{transactionId}/receipt", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuditReceiptDto> getReceipt(@PathVariable String transactionId) {
        return auditLedgerService.getReceipt(transactionId)
                .map(receipt -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-receipt-" + transactionId + ".json\"")
                        .body(receipt))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/ledger")
    public ResponseEntity<Map<String, String>> clearLedger() {
        auditLedgerService.clearLedger();
        return ResponseEntity.ok(Map.of("status", "LEDGER_CLEARED"));
    }
}
