package com.w2w.share.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TransferMetricsService implements ITransferMetricsService {

    private final Counter transfersStartedCounter;
    private final Counter transfersCompletedCounter;
    private final Counter transfersFailedCounter;
    private final Counter bytesUploadedCounter;
    private final Counter bytesDownloadedCounter;

    private final AtomicInteger activeSessionsGauge = new AtomicInteger(0);
    private final AtomicLong storageConsumedGauge = new AtomicLong(0);

    public TransferMetricsService(MeterRegistry registry) {
        this.transfersStartedCounter = Counter.builder("w2w.transfers.started")
                .description("Total number of transfer sessions created")
                .register(registry);

        this.transfersCompletedCounter = Counter.builder("w2w.transfers.completed")
                .description("Total number of transfer sessions successfully finished")
                .register(registry);

        this.transfersFailedCounter = Counter.builder("w2w.transfers.failed")
                .description("Total number of failed or cancelled transfer sessions")
                .register(registry);

        this.bytesUploadedCounter = Counter.builder("w2w.bytes.uploaded")
                .description("Total volume of encrypted bytes received by relay")
                .baseUnit("bytes")
                .register(registry);

        this.bytesDownloadedCounter = Counter.builder("w2w.bytes.downloaded")
                .description("Total volume of encrypted bytes downloaded by receiver")
                .baseUnit("bytes")
                .register(registry);

        registry.gauge("w2w.sessions.active", activeSessionsGauge, AtomicInteger::get);
        registry.gauge("w2w.storage.consumed", storageConsumedGauge, AtomicLong::get);
    }

    @Override
    public void recordTransferStarted() {
        transfersStartedCounter.increment();
    }

    @Override
    public void recordChunkUpload(long bytes) {
        bytesUploadedCounter.increment(bytes);
    }

    @Override
    public void recordChunkDownload(long bytes) {
        bytesDownloadedCounter.increment(bytes);
    }

    @Override
    public void recordTransferCompleted() {
        transfersCompletedCounter.increment();
    }

    @Override
    public void recordTransferFailed() {
        transfersFailedCounter.increment();
    }

    @Override
    public void setActiveSessions(int count) {
        activeSessionsGauge.set(count);
    }

    @Override
    public void setStorageConsumedBytes(long bytes) {
        storageConsumedGauge.set(bytes);
    }

    @Override
    public long getTotalBytesTransferred() {
        return (long) (bytesUploadedCounter.count() + bytesDownloadedCounter.count());
    }
}
