package com.w2w.share.service;

import com.w2w.share.constant.AppConstants;
import com.w2w.share.exception.InvalidPinException;
import com.w2w.share.exception.RateLimitExceededException;
import com.w2w.share.exception.SessionNotFoundException;
import com.w2w.share.metrics.ITransferMetricsService;
import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionService implements ISessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    @Value("${w2w.session.timeout-seconds:600}")
    private long sessionTimeoutSeconds = AppConstants.DEFAULT_SESSION_EXPIRY_SECONDS;

    private final IStorageService storageService;
    private final IRateLimiterService rateLimiterService;
    private final ITransferMetricsService metricsService;

    private final Map<String, TransferSession> activeSessions = new ConcurrentHashMap<>();
    private final Map<String, String> pinToSessionId = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionService(IStorageService storageService,
                          IRateLimiterService rateLimiterService,
                          ITransferMetricsService metricsService) {
        this.storageService = storageService;
        this.rateLimiterService = rateLimiterService;
        this.metricsService = metricsService;
    }

    @Override
    public TransferSession createSession(String senderId) {
        return createSession(senderId, false, 0, null);
    }

    @Override
    public TransferSession createSession(String senderId, boolean burnAfterReading, int maxDownloads, Long expiresInSeconds) {
        String sessionId = UUID.randomUUID().toString().replace("-", "");
        String pin = generateUniquePin();

        TransferSession session = new TransferSession(sessionId, pin, senderId);
        session.setBurnAfterReading(burnAfterReading);
        session.setMaxDownloads(burnAfterReading && maxDownloads == 0 ? 1 : maxDownloads);

        if (expiresInSeconds != null && expiresInSeconds > 0) {
            session.setExpireAtEpochMs(System.currentTimeMillis() + (expiresInSeconds * 1000));
        }

        activeSessions.put(sessionId, session);
        pinToSessionId.put(pin, sessionId);

        metricsService.recordTransferStarted();
        metricsService.setActiveSessions(activeSessions.size());

        log.info("Created transfer session [{}] (burnAfterReading: {}, expires: {}s) with PIN: {}",
                sessionId, burnAfterReading, expiresInSeconds, pin);
        return session;
    }

    @Override
    public Optional<TransferSession> getSession(String sessionId) {
        TransferSession session = activeSessions.get(sessionId);
        if (session != null) {
            session.touch();
        }
        return Optional.ofNullable(session);
    }

    @Override
    public TransferSession getRequiredSession(String sessionId) {
        return getSession(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("Transfer session [" + sessionId + "] was not found or has been closed."));
    }

    @Override
    public Optional<TransferSession> getSessionByPin(String pin) {
        String sessionId = pinToSessionId.get(pin);
        if (sessionId == null) {
            return Optional.empty();
        }
        return getSession(sessionId);
    }

    @Override
    public TransferSession joinSession(String pin, String receiverId) {
        TransferSession session = getSessionByPin(pin)
                .orElseThrow(() -> new InvalidPinException("No active session with PIN: " + pin));

        session.setReceiverId(receiverId);
        session.setStatus(TransferSession.SessionStatus.PAIRED);
        session.touch();

        log.info("Receiver [{}] successfully joined session [{}] with PIN: {}", receiverId, session.getSessionId(), pin);
        return session;
    }

    @Override
    public TransferSession joinSessionWithRateLimit(String pin, String receiverId, String clientIp) {
        if (!rateLimiterService.checkAllowed(clientIp)) {
            long remaining = rateLimiterService.getRemainingLockoutSeconds(clientIp);
            throw new RateLimitExceededException("Too many failed attempts from IP " + clientIp + ". Locked out for " + remaining + " seconds.", remaining);
        }

        try {
            TransferSession session = joinSession(pin, receiverId);
            rateLimiterService.reset(clientIp);
            return session;
        } catch (InvalidPinException e) {
            rateLimiterService.recordFailedAttempt(clientIp);
            throw e;
        }
    }

    @Override
    public void setFileOffer(String sessionId, FileMetadata metadata) {
        TransferSession session = getRequiredSession(sessionId);
        session.setFileMetadata(metadata);
        session.setStatus(TransferSession.SessionStatus.READY);
        log.info("Registered single file offer [{}] for session [{}]", metadata.fileName(), sessionId);
    }

    @Override
    public void setFileBatchOffer(String sessionId, List<FileMetadata> batch) {
        TransferSession session = getRequiredSession(sessionId);
        session.setFileBatch(batch);
        session.setStatus(TransferSession.SessionStatus.READY);
        log.info("Registered multi-file batch offer ({} files) for session [{}]", batch.size(), sessionId);
    }

    @Override
    public void setEncryptedClipboardText(String sessionId, String text) {
        TransferSession session = getRequiredSession(sessionId);
        session.setEncryptedClipboardText(text);
        log.info("Updated encrypted clipboard note for session [{}]", sessionId);
    }

    @Override
    public void addChatMessage(String sessionId, ChatMessage message) {
        TransferSession session = getRequiredSession(sessionId);
        session.addChatMessage(message);
    }

    @Override
    public boolean notifyDownloadComplete(String sessionId) {
        TransferSession session = activeSessions.get(sessionId);
        if (session == null) return false;

        boolean shouldBurn = session.recordDownloadCompleted();
        if (shouldBurn) {
            log.info("🔥 Burn-After-Reading threshold reached for session [{}]. Purging...", sessionId);
            session.setStatus(TransferSession.SessionStatus.BURNED);
            activeSessions.remove(sessionId);
            pinToSessionId.remove(session.getPin());
            storageService.cleanupSession(sessionId);
            metricsService.recordTransferCompleted();
            metricsService.setActiveSessions(activeSessions.size());
            return true;
        }

        session.setStatus(TransferSession.SessionStatus.COMPLETED);
        metricsService.recordTransferCompleted();
        return false;
    }

    @Override
    public void cancelSession(String sessionId) {
        TransferSession session = activeSessions.remove(sessionId);
        if (session != null) {
            session.setStatus(TransferSession.SessionStatus.CANCELLED);
            pinToSessionId.remove(session.getPin());
            storageService.cleanupSession(sessionId);
            metricsService.recordTransferFailed();
            metricsService.setActiveSessions(activeSessions.size());
            log.info("Cancelled and cleaned up session [{}]", sessionId);
        }
    }

    @Override
    public int getActiveSessionCount() {
        return activeSessions.size();
    }

    @Scheduled(fixedRate = 30000)
    public void cleanupExpiredSessions() {
        activeSessions.entrySet().removeIf(entry -> {
            TransferSession session = entry.getValue();
            if (session.isExpired(sessionTimeoutSeconds)) {
                log.info("Evicting expired transfer session [{}] (PIN: {})", session.getSessionId(), session.getPin());
                pinToSessionId.remove(session.getPin());
                storageService.cleanupSession(session.getSessionId());
                return true;
            }
            return false;
        });
        metricsService.setActiveSessions(activeSessions.size());
    }

    private String generateUniquePin() {
        for (int attempt = 0; attempt < 50; attempt++) {
            int pinNumber = 100000 + secureRandom.nextInt(900000);
            String pin = String.valueOf(pinNumber);
            if (!pinToSessionId.containsKey(pin)) {
                return pin;
            }
        }
        return String.valueOf(100000 + secureRandom.nextInt(900000));
    }
}
