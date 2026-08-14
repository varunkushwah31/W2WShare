package com.w2w.share.metrics;

public interface ITransferMetricsService {

    void recordTransferStarted();

    void recordChunkUpload(long bytes);

    void recordChunkDownload(long bytes);

    void recordTransferCompleted();

    void recordTransferFailed();

    void setActiveSessions(int count);

    void setStorageConsumedBytes(long bytes);

    long getTotalBytesTransferred();
}
