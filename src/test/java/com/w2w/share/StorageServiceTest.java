package com.w2w.share;

import com.w2w.share.service.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

class StorageServiceTest {

    private StorageService storageService;
    private final String testTempDir = "./target/test-w2w-storage";

    @BeforeEach
    void setUp() {
        storageService = new StorageService();
        ReflectionTestUtils.setField(storageService, "tempDirPath", testTempDir);
        ReflectionTestUtils.setField(storageService, "maxQuotaBytes", 53687091200L);
        storageService.init();
    }

    @AfterEach
    void tearDown() {
        storageService.cleanupAll();
    }

    @Test
    void testSaveAndGetChunk() throws IOException {
        String sessionId = "test-session-123";
        byte[] testData = "EncryptedChunkPayloadData12345678".getBytes();

        storageService.saveChunk(sessionId, 0, 0, testData);

        assertTrue(storageService.hasChunk(sessionId, 0, 0));
        assertFalse(storageService.hasChunk(sessionId, 0, 1));

        byte[] retrieved = storageService.getChunk(sessionId, 0, 0);
        assertArrayEquals(testData, retrieved);

        storageService.cleanupSession(sessionId);
        assertFalse(storageService.hasChunk(sessionId, 0, 0));
    }

    @Test
    void testGetNonExistentChunkThrowsException() {
        assertThrows(NoSuchFileException.class, () -> storageService.getChunk("non-existent-session", 0, 99));
    }

    @Test
    void testPathTraversalRejection() {
        assertThrows(Exception.class, () -> storageService.saveChunk("../../etc", 0, 0, "dummy".getBytes()));
        assertThrows(Exception.class, () -> storageService.getChunk("..\\windows", 0, 0));
    }

    @Test
    void testInvalidChunkParameters() {
        assertThrows(Exception.class, () -> storageService.saveChunk("session-1", -1, 0, "dummy".getBytes()));
        assertThrows(Exception.class, () -> storageService.saveChunk("session-1", 0, -1, "dummy".getBytes()));
        assertThrows(Exception.class, () -> storageService.saveChunk("session-1", 0, 0, null));
        assertThrows(Exception.class, () -> storageService.saveChunk("session-1", 0, 0, new byte[0]));
    }

    @Test
    void testMaxChunkPayloadLimit() {
        byte[] oversizedData = new byte[65 * 1024 * 1024]; // 65 MB (exceeds 64MB limit)
        assertThrows(Exception.class, () -> storageService.saveChunk("session-1", 0, 0, oversizedData));
    }

    @Test
    void testReconcileStartupStoragePurgesOrphanedDirs() throws IOException {
        Path root = Paths.get(testTempDir).toAbsolutePath().normalize();
        Path orphanDir = root.resolve("orphaned-session-dir");
        Files.createDirectories(orphanDir);
        Files.write(orphanDir.resolve("chunk_0_0.bin"), new byte[]{1, 2, 3});
        assertTrue(Files.exists(orphanDir));

        // Re-run init to trigger reconcileStartupStorage
        storageService.init();

        assertFalse(Files.exists(orphanDir));
    }
}
