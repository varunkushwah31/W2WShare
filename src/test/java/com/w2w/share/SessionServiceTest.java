package com.w2w.share;

import com.w2w.share.metrics.TransferMetricsService;
import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;
import com.w2w.share.service.RateLimiterService;
import com.w2w.share.service.SessionService;
import com.w2w.share.service.StorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SessionServiceTest {

    private StorageService storageService;
    private RateLimiterService rateLimiterService;
    private TransferMetricsService metricsService;
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        storageService = Mockito.mock(StorageService.class);
        rateLimiterService = Mockito.mock(RateLimiterService.class);
        metricsService = new TransferMetricsService(new SimpleMeterRegistry());
        sessionService = new SessionService(storageService, rateLimiterService, metricsService);
    }

    @Test
    void testCreateSession() {
        TransferSession session = sessionService.createSession("sender-123");

        assertNotNull(session);
        assertNotNull(session.getSessionId());
        assertNotNull(session.getPin());
        assertEquals(6, session.getPin().length());
        assertEquals("sender-123", session.getSenderId());
        assertEquals(TransferSession.SessionStatus.CREATED, session.getStatus());

        Optional<TransferSession> fetched = sessionService.getSession(session.getSessionId());
        assertTrue(fetched.isPresent());
        assertEquals(session.getSessionId(), fetched.get().getSessionId());

        Optional<TransferSession> byPin = sessionService.getSessionByPin(session.getPin());
        assertTrue(byPin.isPresent());
        assertEquals(session.getSessionId(), byPin.get().getSessionId());
    }

    @Test
    void testJoinSessionWithRateLimit() {
        TransferSession session = sessionService.createSession("sender-1");
        String pin = session.getPin();
        when(rateLimiterService.checkAllowed("127.0.0.1")).thenReturn(true);

        TransferSession joined = sessionService.joinSessionWithRateLimit(pin, "receiver-1", "127.0.0.1");
        assertNotNull(joined);
        assertEquals("receiver-1", joined.getReceiverId());
        assertEquals(TransferSession.SessionStatus.PAIRED, joined.getStatus());
        verify(rateLimiterService).reset("127.0.0.1");
    }

    @Test
    void testSetFileOfferAndBatch() {
        TransferSession session = sessionService.createSession("sender-1");
        FileMetadata meta1 = new FileMetadata("test1.png", 1024, "image/png", 1, 1024, "salt", "iv", "tag", "checksum");
        FileMetadata meta2 = new FileMetadata("test2.pdf", 2048, "application/pdf", 1, 2048, "salt", "iv", "tag", "checksum");

        sessionService.setFileBatchOffer(session.getSessionId(), List.of(meta1, meta2));

        Optional<TransferSession> updated = sessionService.getSession(session.getSessionId());
        assertTrue(updated.isPresent());
        assertEquals(2, updated.get().getFileBatch().size());
        assertEquals(TransferSession.SessionStatus.READY, updated.get().getStatus());
    }

    @Test
    void testChatMessages() {
        TransferSession session = sessionService.createSession("sender-1");
        ChatMessage msg = new ChatMessage("msg-1", "sender", "encrypted-chat", System.currentTimeMillis());

        sessionService.addChatMessage(session.getSessionId(), msg);

        Optional<TransferSession> updated = sessionService.getSession(session.getSessionId());
        assertTrue(updated.isPresent());
        assertEquals(1, updated.get().getChatHistory().size());
        assertEquals("encrypted-chat", updated.get().getChatHistory().get(0).getEncryptedContent());
    }

    @Test
    void testCloseAndCancelSession() {
        TransferSession session = sessionService.createSession("sender-1");
        String sessionId = session.getSessionId();

        sessionService.cancelSession(sessionId);
        verify(storageService).cleanupSession(sessionId);

        Optional<TransferSession> cancelled = sessionService.getSession(sessionId);
        assertTrue(cancelled.isEmpty());
    }
}
