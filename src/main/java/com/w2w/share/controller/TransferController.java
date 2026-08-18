package com.w2w.share.controller;

import com.w2w.share.dto.*;
import com.w2w.share.exception.InvalidChunkException;
import com.w2w.share.exception.SessionNotFoundException;
import com.w2w.share.metrics.ITransferMetricsService;
import com.w2w.share.model.ChatMessage;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;
import com.w2w.share.service.INetworkDiscoveryService;
import com.w2w.share.service.IQrCodeService;
import com.w2w.share.service.ISessionService;
import com.w2w.share.service.IStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.util.*;

@RestController
@RequestMapping("/api/transfer")
public class TransferController {

    private final ISessionService sessionService;
    private final IStorageService storageService;
    private final INetworkDiscoveryService networkDiscoveryService;
    private final ITransferMetricsService metricsService;
    private final IQrCodeService qrCodeService;

    public TransferController(ISessionService sessionService,
                              IStorageService storageService,
                              INetworkDiscoveryService networkDiscoveryService,
                              ITransferMetricsService metricsService,
                              IQrCodeService qrCodeService) {
        this.sessionService = sessionService;
        this.storageService = storageService;
        this.networkDiscoveryService = networkDiscoveryService;
        this.metricsService = metricsService;
        this.qrCodeService = qrCodeService;
    }

    @PostMapping("/session/create")
    public ResponseEntity<CreateSessionResponse> createSession(@RequestBody(required = false) CreateSessionRequest request) {
        String senderId = (request != null && request.senderId() != null) ? request.senderId() : "sender-" + System.currentTimeMillis();
        boolean burnAfter = request != null && request.isBurnAfterReading();
        int maxDownloads = request != null ? request.getMaxDownloads() : 0;
        Long expiresInSeconds = request != null ? request.expiresInSeconds() : null;

        TransferSession session = sessionService.createSession(senderId, burnAfter, maxDownloads, expiresInSeconds);

        String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();
        String joinUrl = primaryUrl + "/?pin=" + session.getPin();

        return ResponseEntity.ok(new CreateSessionResponse(
                session.getSessionId(),
                session.getPin(),
                session.getStatus().name(),
                joinUrl,
                session.isBurnAfterReading(),
                session.getCreatedAt().toEpochMilli()
        ));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<TransferSessionDetailsResponse> getSession(@PathVariable String sessionId) {
        TransferSession session = sessionService.getRequiredSession(sessionId);
        return ResponseEntity.ok(TransferSessionDetailsResponse.from(session));
    }

    @GetMapping("/session/{sessionId}/status")
    public ResponseEntity<SessionStatusResponse> getSessionResumptionStatus(@PathVariable String sessionId) {
        TransferSession session = sessionService.getRequiredSession(sessionId);

        List<SessionStatusResponse.ChunkProgressDto> fileProgressList = new ArrayList<>();
        List<FileMetadata> batch = session.getFileBatch();
        for (int i = 0; i < batch.size(); i++) {
            FileMetadata meta = batch.get(i);
            Set<Integer> chunks = storageService.getExistingChunkIndices(sessionId, i);
            fileProgressList.add(new SessionStatusResponse.ChunkProgressDto(
                    i,
                    meta.fileName(),
                    meta.totalChunks(),
                    new ArrayList<>(chunks)
            ));
        }

        return ResponseEntity.ok(new SessionStatusResponse(
                session.getSessionId(),
                session.getStatus().name(),
                fileProgressList
        ));
    }

    @GetMapping("/session/by-pin/{pin}")
    public ResponseEntity<TransferSessionDetailsResponse> getSessionByPin(@PathVariable String pin) {
        TransferSession session = sessionService.getSessionByPin(pin)
                .orElseThrow(() -> new SessionNotFoundException("No active session with PIN: " + pin));

        return ResponseEntity.ok(TransferSessionDetailsResponse.from(session));
    }

    @PostMapping("/session/{sessionId}/join")
    public ResponseEntity<JoinSessionResponse> joinSession(
            @PathVariable String sessionId,
            @Valid @RequestBody JoinSessionRequest body,
            HttpServletRequest request) {

        String pin = body.pin();
        String receiverId = body.receiverId() != null ? body.receiverId() : "receiver-" + System.currentTimeMillis();
        String clientIp = request.getRemoteAddr();

        TransferSession session = sessionService.joinSessionWithRateLimit(pin, receiverId, clientIp);

        return ResponseEntity.ok(new JoinSessionResponse(
                session.getSessionId(),
                session.getPin(),
                session.getStatus().name(),
                session.getFileMetadata(),
                session.getFileBatch(),
                session.isBurnAfterReading()
        ));
    }

    @PostMapping("/session/{sessionId}/offer")
    public ResponseEntity<Map<String, Object>> offerFile(
            @PathVariable String sessionId,
            @RequestBody FileMetadata metadata) {

        if (metadata == null) {
            throw new IllegalArgumentException("File metadata is required.");
        }
        sessionService.setFileOffer(sessionId, metadata);
        return ResponseEntity.ok(Map.of("status", "OFFER_REGISTERED", "metadata", metadata));
    }

    @PostMapping("/session/{sessionId}/batch-offer")
    public ResponseEntity<Map<String, Object>> offerBatch(
            @PathVariable String sessionId,
            @RequestBody List<FileMetadata> batch) {

        if (batch == null || batch.isEmpty()) {
            throw new IllegalArgumentException("File batch cannot be null or empty.");
        }
        sessionService.setFileBatchOffer(sessionId, batch);
        return ResponseEntity.ok(Map.of("status", "BATCH_REGISTERED", "totalFiles", batch.size()));
    }

    @PostMapping(value = "/session/{sessionId}/file/{fileIndex}/chunk/{chunkIndex}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Map<String, Object>> uploadFileChunkBinary(
            @PathVariable String sessionId,
            @PathVariable int fileIndex,
            @PathVariable int chunkIndex,
            @RequestBody byte[] data) {

        if (data == null || data.length == 0) {
            throw new InvalidChunkException("Chunk payload cannot be empty or null.");
        }

        TransferSession session = sessionService.getRequiredSession(sessionId);
        storageService.saveChunk(sessionId, fileIndex, chunkIndex, data);
        int count = session.incrementUploadedChunks();

        metricsService.recordChunkUpload(data.length);

        return ResponseEntity.ok(Map.of(
                "fileIndex", fileIndex,
                "chunkIndex", chunkIndex,
                "bytesReceived", data.length,
                "totalUploadedChunks", count,
                "status", "SAVED"
        ));
    }

    @PostMapping(value = "/session/{sessionId}/chunk/{chunkIndex}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadChunkMultipart(
            @PathVariable String sessionId,
            @PathVariable int chunkIndex,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new InvalidChunkException("Uploaded file chunk cannot be empty.");
        }

        TransferSession session = sessionService.getRequiredSession(sessionId);
        byte[] bytes = file.getBytes();
        storageService.saveChunk(sessionId, 0, chunkIndex, bytes);
        int count = session.incrementUploadedChunks();

        metricsService.recordChunkUpload(bytes.length);

        return ResponseEntity.ok(Map.of(
                "chunkIndex", chunkIndex,
                "bytesReceived", bytes.length,
                "totalUploadedChunks", count,
                "status", "SAVED"
        ));
    }

    @PostMapping(value = "/session/{sessionId}/chunk/{chunkIndex}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Map<String, Object>> uploadChunkBinary(
            @PathVariable String sessionId,
            @PathVariable int chunkIndex,
            @RequestBody byte[] data) {

        return uploadFileChunkBinary(sessionId, 0, chunkIndex, data);
    }

    @GetMapping(value = "/session/{sessionId}/file/{fileIndex}/chunk/{chunkIndex}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Resource> downloadFileChunk(
            @PathVariable String sessionId,
            @PathVariable int fileIndex,
            @PathVariable int chunkIndex) throws NoSuchFileException {

        TransferSession session = sessionService.getRequiredSession(sessionId);
        byte[] data = storageService.getChunk(sessionId, fileIndex, chunkIndex);
        session.incrementDownloadedChunks();

        metricsService.recordChunkDownload(data.length);

        ByteArrayResource resource = new ByteArrayResource(data);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"chunk_" + chunkIndex + ".bin\"")
                .contentLength(data.length)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @GetMapping(value = "/session/{sessionId}/chunk/{chunkIndex}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Resource> downloadChunk(
            @PathVariable String sessionId,
            @PathVariable int chunkIndex) throws NoSuchFileException {

        return downloadFileChunk(sessionId, 0, chunkIndex);
    }

    @PostMapping("/session/{sessionId}/complete")
    public ResponseEntity<Map<String, Object>> markTransferComplete(@PathVariable String sessionId) {
        boolean burned = sessionService.notifyDownloadComplete(sessionId);
        return ResponseEntity.ok(Map.of(
                "status", "COMPLETED",
                "burned", burned
        ));
    }

    @PostMapping("/session/{sessionId}/clipboard")
    public ResponseEntity<Map<String, String>> saveClipboard(
            @PathVariable String sessionId,
            @RequestBody(required = false) ClipboardSyncRequest request) {

        String text = (request != null && request.text() != null) ? request.text() : "";
        sessionService.setEncryptedClipboardText(sessionId, text);
        return ResponseEntity.ok(Map.of("status", "SAVED"));
    }

    @GetMapping("/session/{sessionId}/clipboard")
    public ResponseEntity<Map<String, String>> getClipboard(@PathVariable String sessionId) {
        TransferSession session = sessionService.getRequiredSession(sessionId);
        String text = session.getEncryptedClipboardText();
        return ResponseEntity.ok(Map.of("text", text != null ? text : ""));
    }

    @PostMapping("/session/{sessionId}/chat")
    public ResponseEntity<Map<String, Object>> addChatMessage(
            @PathVariable String sessionId,
            @Valid @RequestBody ChatMessageRequest request) {

        String senderRole = request.senderRole() != null ? request.senderRole() : "client";
        String content = request.content();
        if (content == null || content.isBlank()) {
            throw new InvalidChunkException("Chat message content cannot be empty.");
        }

        ChatMessage msg = new ChatMessage(UUID.randomUUID().toString(), senderRole, content, System.currentTimeMillis());
        sessionService.addChatMessage(sessionId, msg);

        return ResponseEntity.ok(Map.of("status", "SENT", "message", msg));
    }

    @GetMapping("/session/{sessionId}/chat")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String sessionId) {
        TransferSession session = sessionService.getRequiredSession(sessionId);
        return ResponseEntity.ok(session.getChatHistory());
    }

    @GetMapping(value = "/session/{sessionId}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getSessionQrCode(@PathVariable String sessionId,
                                                   @RequestParam(defaultValue = "300") int size) {
        int clampedSize = Math.clamp(size, 50, 1000);
        TransferSession session = sessionService.getRequiredSession(sessionId);
        String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();
        String joinUrl = primaryUrl + "/?pin=" + session.getPin();
        byte[] qrBytes = qrCodeService.generateQrCodePng(joinUrl, clampedSize, clampedSize);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"w2w-qr-" + session.getPin() + ".png\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(qrBytes);
    }

    @GetMapping(value = "/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generateQrCode(@RequestParam String text,
                                                 @RequestParam(defaultValue = "300") int size) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Parameter 'text' cannot be empty");
        }
        int clampedSize = Math.clamp(size, 50, 1000);
        byte[] qrBytes = qrCodeService.generateQrCodePng(text, clampedSize, clampedSize);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(qrBytes);
    }
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Map<String, String>> cancelSession(@PathVariable String sessionId) {
        sessionService.cancelSession(sessionId);
        return ResponseEntity.ok(Map.of("status", "SESSION_CLOSED"));
    }
}
