package com.w2w.share.model;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

public class TransferSession {

    public enum SessionStatus {
        CREATED,
        PAIRED,
        READY,
        TRANSFERRING,
        COMPLETED,
        CANCELLED,
        BURNED
    }

    private final String sessionId;
    private final String pin;
    private volatile String senderId;
    private volatile String receiverId;
    private volatile SessionStatus status;
    private final List<FileMetadata> fileBatch = new CopyOnWriteArrayList<>();
    private volatile int activeFileIndex = 0;
    private volatile String encryptedClipboardText;
    private final List<ChatMessage> chatHistory = new CopyOnWriteArrayList<>();
    private final Instant createdAt;
    private volatile Instant lastActivityAt;
    private final AtomicInteger uploadedChunks = new AtomicInteger(0);
    private final AtomicInteger downloadedChunks = new AtomicInteger(0);

    // Burn-After-Reading & Expiry Controls
    private volatile boolean burnAfterReading = false;
    private volatile int maxDownloads = 0; // 0 = unlimited, 1+ = threshold
    private final AtomicInteger completedDownloads = new AtomicInteger(0);
    private volatile Long expireAtEpochMs = null;

    public TransferSession(String sessionId, String pin, String senderId) {
        this.sessionId = sessionId;
        this.pin = pin;
        this.senderId = senderId;
        this.status = SessionStatus.CREATED;
        this.createdAt = Instant.now();
        this.lastActivityAt = Instant.now();
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getPin() {
        return pin;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
        touch();
    }

    public String getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(String receiverId) {
        this.receiverId = receiverId;
        touch();
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
        touch();
    }

    public List<FileMetadata> getFileBatch() {
        return Collections.unmodifiableList(fileBatch);
    }

    public FileMetadata getFileMetadata() {
        if (fileBatch.isEmpty()) return null;
        if (activeFileIndex >= 0 && activeFileIndex < fileBatch.size()) {
            return fileBatch.get(activeFileIndex);
        }
        return fileBatch.get(0);
    }

    public void setFileMetadata(FileMetadata fileMetadata) {
        this.fileBatch.clear();
        if (fileMetadata != null) {
            this.fileBatch.add(fileMetadata);
        }
        this.activeFileIndex = 0;
        this.uploadedChunks.set(0);
        this.downloadedChunks.set(0);
        touch();
    }

    public void setFileBatch(List<FileMetadata> batch) {
        this.fileBatch.clear();
        if (batch != null) {
            this.fileBatch.addAll(batch);
        }
        this.activeFileIndex = 0;
        this.uploadedChunks.set(0);
        this.downloadedChunks.set(0);
        touch();
    }

    public int getActiveFileIndex() {
        return activeFileIndex;
    }

    public void setActiveFileIndex(int activeFileIndex) {
        this.activeFileIndex = activeFileIndex;
        this.uploadedChunks.set(0);
        this.downloadedChunks.set(0);
        touch();
    }

    public String getEncryptedClipboardText() {
        return encryptedClipboardText;
    }

    public void setEncryptedClipboardText(String encryptedClipboardText) {
        this.encryptedClipboardText = encryptedClipboardText;
        touch();
    }

    public List<ChatMessage> getChatHistory() {
        return Collections.unmodifiableList(chatHistory);
    }

    public void addChatMessage(ChatMessage msg) {
        this.chatHistory.add(msg);
        touch();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void touch() {
        this.lastActivityAt = Instant.now();
    }

    public int incrementUploadedChunks() {
        touch();
        return uploadedChunks.incrementAndGet();
    }

    public int getUploadedChunks() {
        return uploadedChunks.get();
    }

    public int incrementDownloadedChunks() {
        touch();
        return downloadedChunks.incrementAndGet();
    }

    public int getDownloadedChunks() {
        return downloadedChunks.get();
    }

    public boolean isBurnAfterReading() {
        return burnAfterReading;
    }

    public void setBurnAfterReading(boolean burnAfterReading) {
        this.burnAfterReading = burnAfterReading;
        if (burnAfterReading && this.maxDownloads == 0) {
            this.maxDownloads = 1;
        }
    }

    public int getMaxDownloads() {
        return maxDownloads;
    }

    public void setMaxDownloads(int maxDownloads) {
        this.maxDownloads = maxDownloads;
    }

    public int getCompletedDownloads() {
        return completedDownloads.get();
    }

    public boolean recordDownloadCompleted() {
        int count = completedDownloads.incrementAndGet();
        touch();
        return (burnAfterReading && count >= 1) || (maxDownloads > 0 && count >= maxDownloads);
    }

    public Long getExpireAtEpochMs() {
        return expireAtEpochMs;
    }

    public void setExpireAtEpochMs(Long expireAtEpochMs) {
        this.expireAtEpochMs = expireAtEpochMs;
    }

    public boolean isExpired(long timeoutSeconds) {
        if (expireAtEpochMs != null && System.currentTimeMillis() > expireAtEpochMs) {
            return true;
        }
        return Instant.now().isAfter(lastActivityAt.plusSeconds(timeoutSeconds));
    }
}
