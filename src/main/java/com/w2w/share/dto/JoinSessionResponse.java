package com.w2w.share.dto;

import com.w2w.share.model.FileMetadata;

import java.util.List;

public record JoinSessionResponse(
        String sessionId,
        String pin,
        String status,
        FileMetadata fileMetadata,
        List<FileMetadata> fileBatch,
        boolean burnAfterReading
) {}
