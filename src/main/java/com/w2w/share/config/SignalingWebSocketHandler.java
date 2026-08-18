package com.w2w.share.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.SignalMessage;
import com.w2w.share.model.TransferSession;
import com.w2w.share.service.ISessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalingWebSocketHandler.class);

    private static final String SIGNAL_ERROR = "ERROR";
    private static final int MAX_SIGNAL_PAYLOAD_CHARS = 1024 * 1024; // 1MB payload ceiling

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ISessionService sessionService;

    // WebSocket session ID -> W2W session ID
    private final Map<String, String> wsSessionToTransferSession = new ConcurrentHashMap<>();
    // W2W session ID -> Set of WebSocket sessions
    private final Map<String, Set<WebSocketSession>> sessionSockets = new ConcurrentHashMap<>();

    public SignalingWebSocketHandler(ISessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.debug("WebSocket client connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        if (payload.isBlank()) {
            return;
        }

        if (payload.length() > MAX_SIGNAL_PAYLOAD_CHARS) {
            log.warn("Rejected oversized WebSocket payload ({} chars) from socket {}", payload.length(), session.getId());
            try {
                sendSignal(session, new SignalMessage(SIGNAL_ERROR, "Signal message exceeds maximum allowable size of 1MB"));
            } catch (IOException sendEx) {
                log.debug("Could not transmit error frame to socket {}: {}", session.getId(), sendEx.getMessage());
            }
            return;
        }

        try {
            SignalMessage signal = objectMapper.readValue(payload, SignalMessage.class);
            if (signal == null || signal.type() == null) {
                log.warn("Received empty or untyped signal from socket {}", session.getId());
                return;
            }

            switch (signal.type()) {
                case "REGISTER_SENDER" -> handleRegisterSender(session, signal);
                case "JOIN_BY_PIN" -> handleJoinByPin(session, signal);
                case "FILE_OFFER" -> handleFileOffer(session, signal);
                case "BATCH_OFFER" -> handleBatchOffer(session, signal);
                case "FILE_ACCEPT", "BATCH_ACCEPT" -> relayToPeer(session, signal);
                case "CHUNK_UPLOADED" -> relayToPeer(session, signal);
                case "TRANSFER_PROGRESS" -> relayToPeer(session, signal);
                case "TRANSFER_COMPLETE" -> relayToPeer(session, signal);
                case "TRANSFER_CANCELLED" -> handleCancel(session, signal);
                case "TEXT_MESSAGE" -> handleTextMessageRelay(session, signal);
                case "CHAT_MESSAGE" -> handleChatMessage(session, signal);
                case "WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE" -> relayToPeer(session, signal);
                default -> log.warn("Unknown signal type: {}", signal.type());
            }
        } catch (Exception e) {
            log.warn("Error processing WebSocket signal from {}: {}", session.getId(), e.getMessage());
            try {
                sendSignal(session, new SignalMessage(SIGNAL_ERROR, "Failed to process signal: " + e.getMessage()));
            } catch (IOException sendEx) {
                log.debug("Could not transmit error frame to socket {}: {}", session.getId(), sendEx.getMessage());
            }
        }
    }

    private void handleRegisterSender(WebSocketSession session, SignalMessage signal) throws IOException {
        if (signal.payload() == null) {
            sendSignal(session, new SignalMessage(SIGNAL_ERROR, "Session ID required for sender registration"));
            return;
        }
        String transferSessionId = String.valueOf(signal.payload());
        registerSocketToSession(session, transferSessionId);
        log.info("Sender registered on WebSocket for session: {}", transferSessionId);
        sendSignal(session, new SignalMessage("REGISTERED", "Sender linked successfully"));
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
            registerSocketToSession(session, transferSession.getSessionId());

            sendSignal(session, new SignalMessage("JOINED", Map.of(
                    "sessionId", transferSession.getSessionId(),
                    "pin", transferSession.getPin(),
                    "fileMetadata", transferSession.getFileMetadata() != null ? transferSession.getFileMetadata() : Map.of(),
                    "fileBatch", transferSession.getFileBatch()
            )));

            // Notify sender that receiver connected
            relayToOtherPeers(session, transferSession.getSessionId(), new SignalMessage("PEER_CONNECTED", Map.of(
                    "peerId", session.getId(),
                    "role", "receiver"
            )));
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
            sessionService.setEncryptedClipboardText(transferSessionId, String.valueOf(signal.payload()));
            relayToOtherPeers(session, transferSessionId, signal);
        }
    }

    private void handleChatMessage(WebSocketSession session, SignalMessage signal) throws IOException {
        String transferSessionId = wsSessionToTransferSession.get(session.getId());
        if (transferSessionId != null && signal.payload() != null) {
            ChatMessage msg = new ChatMessage(
                    UUID.randomUUID().toString(),
                    session.getId(),
                    String.valueOf(signal.payload()),
                    System.currentTimeMillis()
            );
            sessionService.addChatMessage(transferSessionId, msg);
            relayToOtherPeers(session, transferSessionId, new SignalMessage("CHAT_MESSAGE", msg));
        }
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

    private void registerSocketToSession(WebSocketSession session, String transferSessionId) {
        WebSocketSession concurrentSession = (session instanceof org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator)
                ? session
                : new org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator(session, 5000, 1024 * 1024);

        wsSessionToTransferSession.put(session.getId(), transferSessionId);
        sessionSockets.computeIfAbsent(transferSessionId, k -> ConcurrentHashMap.newKeySet()).add(concurrentSession);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String transferSessionId = wsSessionToTransferSession.remove(session.getId());
        if (transferSessionId != null) {
            notifyPeersOnDisconnect(session, transferSessionId);
        }
        log.debug("WebSocket client disconnected: {}", session.getId());
    }

    private void notifyPeersOnDisconnect(WebSocketSession session, String transferSessionId) {
        Set<WebSocketSession> sockets = sessionSockets.get(transferSessionId);
        if (sockets == null) {
            return;
        }
        sockets.removeIf(s -> s.getId().equals(session.getId()));
        if (sockets.isEmpty()) {
            sessionSockets.remove(transferSessionId);
            return;
        }
        for (WebSocketSession s : sockets) {
            try {
                sendSignal(s, new SignalMessage("PEER_DISCONNECTED", "Peer connection dropped."));
            } catch (IOException e) {
                log.debug("Failed to send disconnect notification: {}", e.getMessage());
            }
        }
    }
}
