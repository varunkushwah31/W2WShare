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

    @Test
    void testRecordTransactionWithPersistenceForLoggedInUser() {
        AuditRecordDto input = new AuditRecordDto(
                "TX-PERSIST-001",
                System.currentTimeMillis(),
                "SENT",
                "contract.pdf",
                2048L,
                1,
                "shaContract",
                "AES-256",
                false,
                false
        );

        byte[] payload = "Hello Persisted File Content".getBytes();
        when(repository.findByTransactionId("TX-PERSIST-001")).thenReturn(Optional.empty());
        when(repository.save(any(AuditRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditRecordDto result = service.recordTransaction(input, payload, "user-node-01", "application/pdf");

        assertNotNull(result);
        assertTrue(result.isPersisted());
        assertEquals("user-node-01", result.userId());
        assertTrue(result.canDownload());
        verify(repository, times(1)).save(any(AuditRecordEntity.class));
    }

    @Test
    void testGetPersistedFile() {
        AuditRecordEntity entity = new AuditRecordEntity(
                "TX-FILE-123",
                System.currentTimeMillis(),
                "RECEIVED",
                "data.csv",
                100L,
                1,
                "sha",
                "AES",
                false,
                false,
                "SIG"
        );
        entity.setPersisted(true);
        entity.setFileData("csv,data,here".getBytes());
        entity.setMimeType("text/csv");
        entity.setExpiryTimestamp(System.currentTimeMillis() + (7L * 24 * 60 * 60 * 1000));

        when(repository.findByTransactionId("TX-FILE-123")).thenReturn(Optional.of(entity));

        Optional<byte[]> fileOpt = service.getPersistedFile("TX-FILE-123");
        assertTrue(fileOpt.isPresent());
        assertArrayEquals("csv,data,here".getBytes(), fileOpt.get());
    }

    @Test
    void testCleanupExpiredPersistedFilesAfter7Days() {
        AuditRecordEntity expiredEntity = new AuditRecordEntity(
                "TX-OLD-999",
                System.currentTimeMillis() - (8L * 24 * 60 * 60 * 1000), // 8 days old
                "SENT",
                "old.txt",
                50L,
                1,
                "sha",
                "AES",
                false,
                false,
                "SIG"
        );
        expiredEntity.setPersisted(true);
        expiredEntity.setFileData("old data".getBytes());
        expiredEntity.setExpiryTimestamp(System.currentTimeMillis() - 1000); // Expired

        when(repository.findAllByExpiryTimestampLessThanEqualAndIsDeletedFalse(anyLong()))
                .thenReturn(List.of(expiredEntity));

        int purgedCount = service.cleanupExpiredPersistedFiles();
        assertEquals(1, purgedCount);
        assertTrue(expiredEntity.isDeleted());
        assertNull(expiredEntity.getFileData());
        verify(repository, times(1)).save(expiredEntity);
    }
}

