package com.w2w.share;

import com.w2w.share.health.W2WStorageHealthIndicator;
import com.w2w.share.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.Status;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class W2WStorageHealthIndicatorTest {

    private StorageService storageService;
    private W2WStorageHealthIndicator healthIndicator;

    @BeforeEach
    void setUp() {
        storageService = new StorageService();
        ReflectionTestUtils.setField(storageService, "tempDirPath", "./target/test-w2w-health");
        storageService.init();

        healthIndicator = new W2WStorageHealthIndicator(storageService);
        ReflectionTestUtils.setField(healthIndicator, "minFreeDiskBytes", 1024L);
    }

    @Test
    void testStorageHealthReturnsUp() {
        Health health = healthIndicator.health();
        assertNotNull(health);
        assertEquals(Status.UP, health.getStatus());
        assertTrue(health.getDetails().containsKey("storagePath"));
        assertTrue(health.getDetails().containsKey("usableDiskSpaceMB"));
    }
}
