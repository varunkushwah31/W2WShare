package com.w2w.share.service;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;

import java.util.List;
import java.util.Optional;

public interface IAuditLedgerService {

    AuditRecordDto recordTransaction(AuditRecordDto record);

    List<AuditRecordDto> getAllRecords();

    Optional<AuditReceiptDto> getReceipt(String transactionId);

    void clearLedger();
}
