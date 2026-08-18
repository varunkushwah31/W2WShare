package com.w2w.share;

import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.model.AuditRecordEntity;
import com.w2w.share.repository.AuditRecordRepository;
import com.w2w.share.service.AuditLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuditLedgerServiceTest {

    private AuditRecordRepository repository;
    private AuditLedgerService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(AuditRecordRepository.class);
        service = new AuditLedgerService(repository);
    }

    @Test
    void testRecordTransaction() {
        AuditRecordDto input = new AuditRecordDto(
                "TX-TEST-001",
                System.currentTimeMillis(),
                "SENT",
                "sample.pdf",
                1024L,
                1,
                "dummySha256",
                "AES-256-GCM / PBKDF2 (100k)",
                false,
                false
        );

        when(repository.save(any(AuditRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditRecordDto result = service.recordTransaction(input);

        assertNotNull(result);
        assertEquals("TX-TEST-001", result.id());
        assertEquals("sample.pdf", result.fileName());
        assertEquals("SENT", result.direction());
        verify(repository, times(1)).save(any(AuditRecordEntity.class));
    }

    @Test
    void testGetAllRecords() {
        AuditRecordEntity entity = new AuditRecordEntity(
                "TX-1", System.currentTimeMillis(), "SENT", "file1.txt", 100L, 1, "sha", "AES", true, false, "SIG_1"
        );
        when(repository.findAllByOrderByTimestampDesc()).thenReturn(List.of(entity));

        List<AuditRecordDto> records = service.getAllRecords();
        assertEquals(1, records.size());
        assertEquals("TX-1", records.get(0).id());
    }

    @Test
    void testGetReceipt() {
        AuditRecordEntity entity = new AuditRecordEntity(
                "TX-RECEIPT", System.currentTimeMillis(), "RECEIVED", "data.json", 2048L, 2, "hash123", "AES-256", false, true, "SIG_VERIFIED"
        );
        when(repository.findByTransactionId("TX-RECEIPT")).thenReturn(Optional.of(entity));

        Optional<AuditReceiptDto> receiptOpt = service.getReceipt("TX-RECEIPT");
        assertTrue(receiptOpt.isPresent());
        AuditReceiptDto receipt = receiptOpt.get();
        assertEquals("TX-RECEIPT", receipt.transactionId());
        assertEquals("RECEIVED", receipt.direction());
        assertEquals("SIG_VERIFIED", receipt.signatureVerification());
    }

    @Test
    void testClearLedger() {
        service.clearLedger();
        verify(repository, times(1)).deleteAll();
    }
}
