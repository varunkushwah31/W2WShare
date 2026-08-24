package com.w2w.share.service;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.model.AuditRecordEntity;

import java.util.List;
import java.util.Optional;

public interface IAuditLedgerService {

    AuditRecordDto recordTransaction(AuditRecordDto record);

    AuditRecordDto recordTransaction(AuditRecordDto record, byte[] fileData, String userId, String mimeType);

    AuditRecordDto persistFilePayload(String transactionId, byte[] fileData, String mimeType, String userId);

    List<AuditRecordDto> getAllRecords();

    List<AuditRecordDto> getRecordsForUser(String userId);

    Optional<AuditReceiptDto> getReceipt(String transactionId);

    Optional<byte[]> getPersistedFile(String transactionId);

    Optional<AuditRecordEntity> getRecordEntity(String transactionId);

    void deleteRecord(String transactionId);

    void clearLedger();

    int cleanupExpiredPersistedFiles();
}

