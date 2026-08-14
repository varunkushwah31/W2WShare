package com.w2w.share;

import com.w2w.share.metrics.TransferMetricsService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TransferMetricsServiceTest {

    private SimpleMeterRegistry registry;
    private TransferMetricsService metricsService;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        metricsService = new TransferMetricsService(registry);
    }

    @Test
    void testMetricsCountersAndGauges() {
        metricsService.recordTransferStarted();
        metricsService.recordTransferCompleted();
        metricsService.recordChunkUpload(2048);
        metricsService.recordChunkDownload(2048);
        metricsService.setActiveSessions(2);
        metricsService.setStorageConsumedBytes(1048576);

        assertEquals(1.0, registry.get("w2w.transfers.started").counter().count());
        assertEquals(1.0, registry.get("w2w.transfers.completed").counter().count());
        assertEquals(2048.0, registry.get("w2w.bytes.uploaded").counter().count());
        assertEquals(2048.0, registry.get("w2w.bytes.downloaded").counter().count());
        assertEquals(2.0, registry.get("w2w.sessions.active").gauge().value());
        assertEquals(1048576.0, registry.get("w2w.storage.consumed").gauge().value());
        assertEquals(4096L, metricsService.getTotalBytesTransferred());
    }
}
