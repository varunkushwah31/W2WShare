package com.w2w.share.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.SignalMessage;
import com.w2w.share.model.TransferSession;
import com.w2w.share.service.ISessionService;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingWebSocketHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalingWebSocketHandler.class);

    private static final String SIGNAL_ERROR = "ERROR";
    private static final int MAX_SIGNAL_PAYLOAD_CHARS = 1024 * 1024; // 1MB payload ceiling
    private static final String ROLE_SENDER = "sender";
    private static final String ROLE_RECEIVER = "receiver";
    private static final String KEY_CONNECTED_PEER_COUNT = "connectedPeerCount";
    private static final String KEY_SENDER_ONLINE = "senderOnline";
    private static final String KEY_RECEIVER_COUNT = "receiverCount";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ISessionService sessionService;

    // WebSocket session ID -> W2W session ID
    private final Map<String, String> wsSessionToTransferSession = new ConcurrentHashMap<>();
    // WebSocket session ID -> Role ("sender" or "receiver")
    private final Map<String, String> wsSessionToRole = new ConcurrentHashMap<>();
    // W2W session ID -> Set of WebSocket sessions
    private final Map<String, Set<WebSocketSession>> sessionSockets = new ConcurrentHashMap<>();
    // WebSocket session ID -> Last activity epoch timestamp
    private final Map<String, Long> lastHeartbeatMap = new ConcurrentHashMap<>();

    public SignalingWebSocketHandler(ISessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        lastHeartbeatMap.put(session.getId(), System.currentTimeMillis());
        log.debug("WebSocket client connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) {
        lastHeartbeatMap.put(session.getId(), System.currentTimeMillis());
        String payload = message.getPayload();
        if (payload.isBlank()) {
            return;
        }

        if (payload.length() > MAX_SIGNAL_PAYLOAD_CHARS) {
            log.warn("Rejected oversized WebSocket payload ({} chars) from socket {}", payload.length(), session.getId());
            sendErrorSilently(session, "Signal message exceeds maximum allowable size of 1MB");
            return;
        }

        try {
            SignalMessage signal = objectMapper.readValue(payload, SignalMessage.class);
            if (signal == null || signal.type() == null) {
                log.warn("Received empty or untyped signal from socket {}", session.getId());
                return;
            }
            dispatchSignal(session, signal);
        } catch (Exception e) {
            log.warn("Error processing WebSocket signal from {}: {}", session.getId(), e.getMessage());
            sendErrorSilently(session, "Failed to process signal: " + e.getMessage());
        }
    }

    private void dispatchSignal(WebSocketSession session, SignalMessage signal) throws IOException {
        switch (signal.type()) {
            case "REGISTER_SENDER" -> handleRegisterSender(session, signal);
            case "JOIN_BY_PIN" -> handleJoinByPin(session, signal);
            case "PING" -> handlePing(session, signal);
            case "GET_ROOM_STATUS" -> handleGetRoomStatus(session);
            case "FILE_OFFER" -> handleFileOffer(session, signal);
            case "BATCH_OFFER" -> handleBatchOffer(session, signal);
            case "FILE_ACCEPT", "BATCH_ACCEPT", "TRANSFER_TELEMETRY", "CHUNK_ACK", "CHUNK_UPLOADED",
                 "RESEND_CHUNK", "TRANSFER_PROGRESS", "TRANSFER_COMPLETE", "WEBRTC_OFFER", "WEBRTC_ANSWER",
                 "WEBRTC_ICE_CANDIDATE" -> relayToPeer(session, signal);
            case "STREAM_CHUNK" -> handleStreamChunk(session, signal);
            case "TRANSFER_CANCELLED" -> handleCancel(session, signal);
            case "TEXT_MESSAGE" -> handleTextMessageRelay(session, signal);
            case "CHAT_MESSAGE" -> handleChatMessage(session, signal);
            default -> log.warn("Unknown signal type: {}", signal.type());
        }
    }

    private void sendErrorSilently(WebSocketSession session, String errorMessage) {
        try {
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, errorMessage));
        } catch (IOException sendEx) {
            log.debug("Could not transmit error frame to socket {}: {}", session.getId(), sendEx.getMessage());
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, @NonNull BinaryMessage message) throws Exception {
        lastHeartbeatMap.put(session.getId(), System.currentTimeMillis());
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId == null) {
            log.warn("Binary frame dropped: socket {} not bound to session", session.getId());
            return;
        }
        Set<WebSocketSession> sockets = sessionSockets.get(transferSessionId);
        if (sockets != null) {
            for (WebSocketSession s : sockets) {
                if (s.isOpen() && !s.getId().equals(session.getId())) {
                    s.sendMessage(message);
                }
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("WebSocket transport error on {}: {}", session.getId(), exception.getMessage());
    }

    private void handlePing(WebSocketSession session, SignalMessage signal) throws IOException {
        long clientTime = System.currentTimeMillis();
        if (signal.payload() instanceof Map<?, ?> map && map.get("clientTime") instanceof Number n) {
            clientTime = n.longValue();
        } else if (signal.payload() instanceof Number n) {
            clientTime = n.longValue();
        }
        sendSignal(session, new SignalMessage("PONG", Map.of(
                "clientTime", clientTime,
                "serverTime", System.currentTimeMillis()
        )));
    }

    private void handleGetRoomStatus(WebSocketSession session) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null) {
            sendSignal(session, new SignalMessage("ROOM_STATUS", Map.of(
                    "sessionId", transferSessionId,
                    KEY_CONNECTED_PEER_COUNT, getConnectedPeerCount(transferSessionId),
                    KEY_SENDER_ONLINE, isSenderOnline(transferSessionId),
                    KEY_RECEIVER_COUNT, getReceiverCount(transferSessionId),
                    "serverTime", System.currentTimeMillis()
            )));
        } else {
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, "Socket is not connected to any transfer session"));
        }
    }

    private void handleStreamChunk(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null) {
            relayToOtherPeers(session, transferSessionId, signal);
        }
    }

    private void handleRegisterSender(WebSocketSession session, SignalMessage signal) throws IOException {
        if (signal.payload() == null) {
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, "Session ID required for sender registration"));
            return;
        }
        String transferSessionId = String.valueOf(signal.payload()).trim();
        registerSocketToSession(session, transferSessionId, ROLE_SENDER);
        log.info("Sender registered on WebSocket for session: {}", transferSessionId);
        sendSignal(session, new SignalMessage("REGISTERED", "Sender linked successfully"));

        // Broadcast to other peers that sender is online
        Map<String, Object> presence = Map.of(
                "peerId", session.getId(),
                "role", ROLE_SENDER,
                KEY_CONNECTED_PEER_COUNT, getConnectedPeerCount(transferSessionId),
                KEY_SENDER_ONLINE, true,
                KEY_RECEIVER_COUNT, getReceiverCount(transferSessionId)
        );
        relayToOtherPeers(session, transferSessionId, new SignalMessage("PEER_CONNECTED", presence));
    }

    private void handleJoinByPin(WebSocketSession session, SignalMessage signal) throws IOException {
        if (signal.payload() == null || String.valueOf(signal.payload()).isBlank()) {
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, "PIN is required to join session"));
            return;
        }
        String pin = String.valueOf(signal.payload()).trim();
        String clientIp = session.getId();
        java.net.InetSocketAddress remoteAddress = session.getRemoteAddress();
        if (remoteAddress != null && remoteAddress.getAddress() != null) {
            clientIp = remoteAddress.getAddress().getHostAddress();
        }

        try {
            TransferSession transferSession = sessionService.joinSessionWithRateLimit(pin, session.getId(), clientIp);
            registerSocketToSession(session, transferSession.getSessionId(), ROLE_RECEIVER);

            sendSignal(session, new SignalMessage("JOINED", Map.of(
                    "sessionId", transferSession.getSessionId(),
                    "pin", transferSession.getPin(),
                    "fileMetadata", transferSession.getFileMetadata() != null ? transferSession.getFileMetadata() : Map.of(),
                    "fileBatch", transferSession.getFileBatch()
            )));

            // Notify sender & peers that receiver connected with rich telemetry
            Map<String, Object> presence = Map.of(
                    "peerId", session.getId(),
                    "role", ROLE_RECEIVER,
                    KEY_CONNECTED_PEER_COUNT, getConnectedPeerCount(transferSession.getSessionId()),
                    KEY_SENDER_ONLINE, isSenderOnline(transferSession.getSessionId()),
                    KEY_RECEIVER_COUNT, getReceiverCount(transferSession.getSessionId())
            );
            relayToOtherPeers(session, transferSession.getSessionId(), new SignalMessage("PEER_CONNECTED", presence));
        } catch (Exception e) {
            log.warn("Failed join attempt on socket {}: {}", session.getId(), e.getMessage());
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, e.getMessage()));
        }
    }

    private void handleFileOffer(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null && signal.payload() != null) {
            FileMetadata meta = objectMapper.convertValue(signal.payload(), FileMetadata.class);
            if (meta != null) {
                sessionService.setFileOffer(transferSessionId, meta);
                relayToOtherPeers(session, transferSessionId, signal);
            }
        }
    }

    private void handleBatchOffer(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null && signal.payload() instanceof List<?> rawList) {
            List<FileMetadata> batch = rawList.stream()
                    .map(item -> objectMapper.convertValue(item, FileMetadata.class))
                    .filter(Objects::nonNull)
                    .toList();
            if (!batch.isEmpty()) {
                sessionService.setFileBatchOffer(transferSessionId, batch);
                relayToOtherPeers(session, transferSessionId, signal);
            }
        }
    }

    private void handleTextMessageRelay(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null && signal.payload() != null) {
            String text = String.valueOf(signal.payload());
            sessionService.setEncryptedClipboardText(transferSessionId, text);
            relayToOtherPeers(session, transferSessionId, new SignalMessage("TEXT_MESSAGE", text));
        }
    }

    private void handleChatMessage(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId == null || signal.payload() == null) {
            return;
        }
        ChatMessage msg = parseChatMessage(signal.payload());
        sessionService.addChatMessage(transferSessionId, msg);
        relayToOtherPeers(session, transferSessionId, new SignalMessage("CHAT_MESSAGE", msg));
    }

    private ChatMessage parseChatMessage(Object payload) {
        if (payload instanceof Map<?, ?> map) {
            String role = map.get("senderRole") != null ? String.valueOf(map.get("senderRole")) : "client";
            String content = map.get("content") != null ? String.valueOf(map.get("content")) : "";
            String id = map.get("id") != null ? String.valueOf(map.get("id")) : UUID.randomUUID().toString();
            long ts = map.get("timestamp") instanceof Number num ? num.longValue() : System.currentTimeMillis();
            return new ChatMessage(id, role, content, ts);
        }
        return new ChatMessage(
                UUID.randomUUID().toString(),
                "peer",
                String.valueOf(payload),
                System.currentTimeMillis()
        );
    }

    private void handleCancel(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null) {
            relayToOtherPeers(session, transferSessionId, signal);
            sessionService.cancelSession(transferSessionId);
        }
    }

    private void relayToPeer(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null) {
            relayToOtherPeers(session, transferSessionId, signal);
        }
    }

    private void relayToOtherPeers(WebSocketSession currentSession, String transferSessionId, SignalMessage signal) throws IOException {
        Set<WebSocketSession> sockets = sessionSockets.get(transferSessionId);
        if (sockets != null) {
            for (WebSocketSession s : sockets) {
                if (s.isOpen() && !s.getId().equals(currentSession.getId())) {
                    sendSignal(s, signal);
                }
            }
        }
    }

    private void sendSignal(WebSocketSession session, SignalMessage signal) throws IOException {
        if (session != null && session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(signal)));
        }
    }

    private void registerSocketToSession(WebSocketSession session, String transferSessionId, String role) {
        WebSocketSession concurrentSession = (session instanceof ConcurrentWebSocketSessionDecorator)
                ? session
                : new ConcurrentWebSocketSessionDecorator(session, 5000, 1024 * 1024);

        wsSessionToTransferSession.put(session.getId(), transferSessionId);
        wsSessionToRole.put(session.getId(), role != null ? role : "peer");
        sessionSockets.computeIfAbsent(transferSessionId, _ -> ConcurrentHashMap.newKeySet()).add(concurrentSession);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        String transferSessionId = wsSessionToTransferSession.remove(session.getId());
        String role = wsSessionToRole.remove(session.getId());
        lastHeartbeatMap.remove(session.getId());
        if (transferSessionId != null) {
            notifyPeersOnDisconnect(session, transferSessionId, role);
        }
        log.debug("WebSocket client disconnected: {} (role: {})", session.getId(), role);
    }

    private void notifyPeersOnDisconnect(WebSocketSession session, String transferSessionId, String role) {
        Set<WebSocketSession> sockets = sessionSockets.get(transferSessionId);
        if (sockets == null) {
            return;
        }
        sockets.removeIf(s -> s.getId().equals(session.getId()));
        if (sockets.isEmpty()) {
            sessionSockets.remove(transferSessionId);
            return;
        }
        Map<String, Object> payload = Map.of(
                "disconnectedPeerId", session.getId(),
                "role", role != null ? role : "peer",
                "remainingPeerCount", sockets.size(),
                KEY_SENDER_ONLINE, isSenderOnline(transferSessionId),
                KEY_RECEIVER_COUNT, getReceiverCount(transferSessionId)
        );
        for (WebSocketSession s : sockets) {
            try {
                sendSignal(s, new SignalMessage("PEER_DISCONNECTED", payload));
            } catch (IOException e) {
                log.debug("Failed to send disconnect notification: {}", e.getMessage());
            }
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 20000)
    public void evictDeadSockets() {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, Long> entry : lastHeartbeatMap.entrySet()) {
            String wsId = entry.getKey();
            if (now - entry.getValue() > 45000) { // 45s silence timeout
                String transferSessionId = wsSessionToTransferSession.get(wsId);
                if (transferSessionId != null) {
                    Set<WebSocketSession> sockets = sessionSockets.get(transferSessionId);
                    if (sockets != null) {
                        for (WebSocketSession s : sockets) {
                            if (s.getId().equals(wsId) && s.isOpen()) {
                                try {
                                    log.info("Evicting silent/dead WebSocket session [{}] from room [{}]", wsId, transferSessionId);
                                    s.close(CloseStatus.SESSION_NOT_RELIABLE);
                                } catch (IOException _) {
                                    // Best-effort socket close during dead socket eviction
                                }
                            }
                        }
                    }
                }
                lastHeartbeatMap.remove(wsId);
            }
        }
    }

    public int getConnectedPeerCount(String sessionId) {
        if (sessionId == null) return 0;
        Set<WebSocketSession> sockets = sessionSockets.get(sessionId);
        if (sockets == null) return 0;
        return (int) sockets.stream().filter(WebSocketSession::isOpen).count();
    }

    public boolean isSenderOnline(String sessionId) {
        if (sessionId == null) return false;
        Set<WebSocketSession> sockets = sessionSockets.get(sessionId);
        if (sockets == null) return false;
        return sockets.stream()
                .filter(WebSocketSession::isOpen)
                .anyMatch(s -> ROLE_SENDER.equalsIgnoreCase(wsSessionToRole.get(s.getId())));
    }

    public int getReceiverCount(String sessionId) {
        if (sessionId == null) return 0;
        Set<WebSocketSession> sockets = sessionSockets.get(sessionId);
        if (sockets == null) return 0;
        return (int) sockets.stream()
                .filter(WebSocketSession::isOpen)
                .filter(s -> ROLE_RECEIVER.equalsIgnoreCase(wsSessionToRole.get(s.getId())))
                .count();
    }
}

