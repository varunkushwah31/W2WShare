package com.w2w.share.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Real-time room and peer presence telemetry response, inspired by MangoShare.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RoomStatusResponse(
        String sessionId,
        String pin,
        String status,
        boolean senderOnline,
        int receiverCount,
        int totalPeersOnline,
        int totalFiles,
        long totalBytes,
        boolean burnAfterReading,
        int uploadedChunks,
        int downloadedChunks,
        boolean webrtcReady
) {}
