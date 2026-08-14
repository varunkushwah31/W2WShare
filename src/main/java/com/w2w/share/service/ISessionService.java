package com.w2w.share.service;

import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;

import java.util.List;
import java.util.Optional;

public interface ISessionService {

    TransferSession createSession(String senderId);

    TransferSession createSession(String senderId, boolean burnAfterReading, int maxDownloads, Long expiresInSeconds);

    Optional<TransferSession> getSession(String sessionId);

    TransferSession getRequiredSession(String sessionId);

    Optional<TransferSession> getSessionByPin(String pin);

    TransferSession joinSession(String pin, String receiverId);

    TransferSession joinSessionWithRateLimit(String pin, String receiverId, String clientIp);

    void setFileOffer(String sessionId, FileMetadata metadata);

    void setFileBatchOffer(String sessionId, List<FileMetadata> batch);

    void setEncryptedClipboardText(String sessionId, String text);

    void addChatMessage(String sessionId, ChatMessage message);

    boolean notifyDownloadComplete(String sessionId);

    void cancelSession(String sessionId);

    int getActiveSessionCount();
}
