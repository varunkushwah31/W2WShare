package com.w2w.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.config.SignalingWebSocketHandler;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;
import com.w2w.share.service.ISessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.ByteBuffer;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SignalingWebSocketHandlerTest {

    private ISessionService sessionService;
    private SignalingWebSocketHandler handler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        sessionService = mock(ISessionService.class);
        handler = new SignalingWebSocketHandler(sessionService);
    }

    @Test
    void testPingPongRoundTrip() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("socket-ping");
        when(session.isOpen()).thenReturn(true);

        long clientTime = 1725540000123L;
        String pingPayload = objectMapper.writeValueAsString(Map.of(
                "type", "PING",
                "payload", Map.of("clientTime", clientTime)
        ));

        handler.handleMessage(session, new TextMessage(pingPayload));

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());

        Map<?, ?> response = objectMapper.readValue(captor.getValue().getPayload(), Map.class);
        assertEquals("PONG", response.get("type"));
        Map<?, ?> payload = (Map<?, ?>) response.get("payload");
        assertEquals(clientTime, ((Number) payload.get("clientTime")).longValue());
        assertNotNull(payload.get("serverTime"));
    }

    @Test
    void testRegisterSenderAndRoomStatus() throws Exception {
        WebSocketSession senderSession = mock(WebSocketSession.class);
        when(senderSession.getId()).thenReturn("ws-sender-100");
        when(senderSession.isOpen()).thenReturn(true);

        String registerPayload = objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-xyz"
        ));

        handler.handleMessage(senderSession, new TextMessage(registerPayload));

        assertTrue(handler.isSenderOnline("session-xyz"));
        assertEquals(1, handler.getConnectedPeerCount("session-xyz"));
        assertEquals(0, handler.getReceiverCount("session-xyz"));

        // Now test GET_ROOM_STATUS
        String statusReq = objectMapper.writeValueAsString(Map.of(
                "type", "GET_ROOM_STATUS"
        ));
        handler.handleMessage(senderSession, new TextMessage(statusReq));

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(senderSession, times(2)).sendMessage(captor.capture());

        Map<?, ?> lastMsg = objectMapper.readValue(captor.getAllValues().get(1).getPayload(), Map.class);
        assertEquals("ROOM_STATUS", lastMsg.get("type"));
        Map<?, ?> statusPayload = (Map<?, ?>) lastMsg.get("payload");
        assertEquals("session-xyz", statusPayload.get("sessionId"));
        assertTrue((Boolean) statusPayload.get("senderOnline"));
    }

    @Test
    void testJoinByPinAndPeerConnectedBroadcast() throws Exception {
        TransferSession transferSession = new TransferSession("session-123", "998877", "sender-id");
        transferSession.setFileBatch(List.of(new FileMetadata("test.png", 1024L, "image/png", 1, 1024L, "s", "iv", "tag", "sha")));
        when(sessionService.joinSessionWithRateLimit(eq("998877"), eq("ws-receiver-200"), any())).thenReturn(transferSession);

        WebSocketSession senderSession = mock(WebSocketSession.class);
        when(senderSession.getId()).thenReturn("ws-sender-100");
        when(senderSession.isOpen()).thenReturn(true);

        // Register sender first
        handler.handleMessage(senderSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-123"
        ))));

        // Now receiver joins by PIN
        WebSocketSession receiverSession = mock(WebSocketSession.class);
        when(receiverSession.getId()).thenReturn("ws-receiver-200");
        when(receiverSession.isOpen()).thenReturn(true);

        handler.handleMessage(receiverSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "JOIN_BY_PIN",
                "payload", "998877"
        ))));

        assertEquals(2, handler.getConnectedPeerCount("session-123"));
        assertTrue(handler.isSenderOnline("session-123"));
        assertEquals(1, handler.getReceiverCount("session-123"));

        // Verify receiver got JOINED message
        ArgumentCaptor<TextMessage> receiverCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(receiverSession).sendMessage(receiverCaptor.capture());
        Map<?, ?> receiverMsg = objectMapper.readValue(receiverCaptor.getValue().getPayload(), Map.class);
        assertEquals("JOINED", receiverMsg.get("type"));

        // Verify sender was notified with PEER_CONNECTED
        ArgumentCaptor<TextMessage> senderCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(senderSession, atLeast(2)).sendMessage(senderCaptor.capture());
        boolean gotPeerConnected = senderCaptor.getAllValues().stream().anyMatch(m -> {
            try {
                Map<?, ?> map = objectMapper.readValue(m.getPayload(), Map.class);
                return "PEER_CONNECTED".equals(map.get("type"));
            } catch (Exception _) {
                return false;
            }
        });
        assertTrue(gotPeerConnected);
    }

    @Test
    void testInMemoryChunkStreamAndBinaryFrameRelay() throws Exception {
        WebSocketSession senderSession = mock(WebSocketSession.class);
        when(senderSession.getId()).thenReturn("ws-sender");
        when(senderSession.isOpen()).thenReturn(true);

        WebSocketSession receiverSession = mock(WebSocketSession.class);
        when(receiverSession.getId()).thenReturn("ws-receiver");
        when(receiverSession.isOpen()).thenReturn(true);

        TransferSession transferSession = new TransferSession("session-stream", "112233", "sender");
        when(sessionService.joinSessionWithRateLimit(eq("112233"), eq("ws-receiver"), any())).thenReturn(transferSession);

        handler.handleMessage(senderSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-stream"
        ))));
        handler.handleMessage(receiverSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "JOIN_BY_PIN",
                "payload", "112233"
        ))));

        // Test STREAM_CHUNK text signal relay
        String chunkSignal = objectMapper.writeValueAsString(Map.of(
                "type", "STREAM_CHUNK",
                "payload", Map.of("chunkIndex", 0, "totalChunks", 10, "chunkData", "BASE64DATA")
        ));
        handler.handleMessage(senderSession, new TextMessage(chunkSignal));

        ArgumentCaptor<TextMessage> textCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(receiverSession, atLeast(2)).sendMessage(textCaptor.capture());
        boolean hasChunk = textCaptor.getAllValues().stream().anyMatch(m -> m.getPayload().contains("STREAM_CHUNK"));
        assertTrue(hasChunk);

        // Test raw BinaryMessage frame relay
        byte[] testBytes = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};
        BinaryMessage binaryMessage = new BinaryMessage(ByteBuffer.wrap(testBytes));
        handler.handleMessage(senderSession, binaryMessage);

        ArgumentCaptor<BinaryMessage> binCaptor = ArgumentCaptor.forClass(BinaryMessage.class);
        verify(receiverSession).sendMessage(binCaptor.capture());
        assertEquals(8, binCaptor.getValue().getPayload().remaining());
    }

    @Test
    void testPeerDisconnectNotificationAndCleanup() throws Exception {
        WebSocketSession senderSession = mock(WebSocketSession.class);
        when(senderSession.getId()).thenReturn("ws-sender");
        when(senderSession.isOpen()).thenReturn(true);

        WebSocketSession receiverSession = mock(WebSocketSession.class);
        when(receiverSession.getId()).thenReturn("ws-receiver");
        when(receiverSession.isOpen()).thenReturn(true);

        TransferSession transferSession = new TransferSession("session-dc", "445566", "sender");
        when(sessionService.joinSessionWithRateLimit(eq("445566"), eq("ws-receiver"), any())).thenReturn(transferSession);

        handler.handleMessage(senderSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-dc"
        ))));
        handler.handleMessage(receiverSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "JOIN_BY_PIN",
                "payload", "445566"
        ))));

        assertEquals(2, handler.getConnectedPeerCount("session-dc"));

        // Receiver disconnects
        handler.afterConnectionClosed(receiverSession, CloseStatus.NORMAL);

        assertEquals(1, handler.getConnectedPeerCount("session-dc"));
        assertEquals(0, handler.getReceiverCount("session-dc"));
        assertTrue(handler.isSenderOnline("session-dc"));

        // Sender disconnects
        handler.afterConnectionClosed(senderSession, CloseStatus.NORMAL);
        assertEquals(0, handler.getConnectedPeerCount("session-dc"));
        assertFalse(handler.isSenderOnline("session-dc"));
    }

    @Test
    void testResendChunkSignalRelay() throws Exception {
        WebSocketSession senderSession = mock(WebSocketSession.class);
        when(senderSession.getId()).thenReturn("ws-sender-resend");
        when(senderSession.isOpen()).thenReturn(true);

        WebSocketSession receiverSession = mock(WebSocketSession.class);
        when(receiverSession.getId()).thenReturn("ws-receiver-resend");
        when(receiverSession.isOpen()).thenReturn(true);

        TransferSession transferSession = new TransferSession("session-resend", "123456", "sender");
        when(sessionService.joinSessionWithRateLimit(eq("123456"), eq("ws-receiver-resend"), any())).thenReturn(transferSession);

        handler.handleMessage(senderSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-resend"
        ))));
        handler.handleMessage(receiverSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "JOIN_BY_PIN",
                "payload", "123456"
        ))));

        // Receiver asks sender to retransmit chunk 4 of file 0
        String resendSignal = objectMapper.writeValueAsString(Map.of(
                "type", "RESEND_CHUNK",
                "payload", Map.of("fileIndex", 0, "chunkIndex", 4)
        ));
        handler.handleMessage(receiverSession, new TextMessage(resendSignal));

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(senderSession, atLeast(2)).sendMessage(captor.capture());
        boolean hasResend = captor.getAllValues().stream().anyMatch(m -> m.getPayload().contains("RESEND_CHUNK"));
        assertTrue(hasResend);
    }

    @Test
    void testDeadSocketEviction() throws Exception {
        WebSocketSession activeSession = mock(WebSocketSession.class);
        when(activeSession.getId()).thenReturn("ws-active");
        when(activeSession.isOpen()).thenReturn(true);

        WebSocketSession deadSession = mock(WebSocketSession.class);
        when(deadSession.getId()).thenReturn("ws-dead");
        when(deadSession.isOpen()).thenReturn(true);

        handler.handleMessage(activeSession, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "REGISTER_SENDER",
                "payload", "session-evict"
        ))));

        // Inject old timestamp for deadSession via reflection or by simulating silence
        java.lang.reflect.Field field = SignalingWebSocketHandler.class.getDeclaredField("lastHeartbeatMap");
        field.setAccessible(true);
        @SuppressWarnings("unchecked")
        Map<String, Long> heartbeatMap = (Map<String, Long>) field.get(handler);
        heartbeatMap.put("ws-dead", System.currentTimeMillis() - 60000); // 60s ago (> 45s threshold)

        // Bind deadSession to session-evict
        java.lang.reflect.Field sessionSocketsField = SignalingWebSocketHandler.class.getDeclaredField("sessionSockets");
        sessionSocketsField.setAccessible(true);
        @SuppressWarnings("unchecked")
        Map<String, java.util.Set<WebSocketSession>> socketsMap = (Map<String, java.util.Set<WebSocketSession>>) sessionSocketsField.get(handler);
        socketsMap.get("session-evict").add(deadSession);

        java.lang.reflect.Field wsToSessionField = SignalingWebSocketHandler.class.getDeclaredField("wsSessionToTransferSession");
        wsToSessionField.setAccessible(true);
        @SuppressWarnings("unchecked")
        Map<String, String> wsToSession = (Map<String, String>) wsToSessionField.get(handler);
        wsToSession.put("ws-dead", "session-evict");

        // Execute sweeper
        handler.evictDeadSockets();

        verify(deadSession).close(CloseStatus.SESSION_NOT_RELIABLE);
        verify(activeSession, never()).close(any());
        assertFalse(heartbeatMap.containsKey("ws-dead"));
    }
}
