package com.w2w.share.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.model.TransferSession;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TransferSessionDetailsResponse(
        String sessionId,
        String pin,
        String status,
        FileMetadata fileMetadata,
        List<FileMetadata> fileBatch,
        int activeFileIndex,
        int uploadedChunks,
        int downloadedChunks,
        boolean burnAfterReading,
        boolean hasClipboard
) {
    public static TransferSessionDetailsResponse from(TransferSession session) {
        return new TransferSessionDetailsResponse(
                session.getSessionId(),
                session.getPin(),
                session.getStatus().name(),
                session.getFileMetadata(),
                session.getFileBatch(),
                session.getActiveFileIndex(),
                session.getUploadedChunks(),
                session.getDownloadedChunks(),
                session.isBurnAfterReading(),
                session.getEncryptedClipboardText() != null && !session.getEncryptedClipboardText().isBlank()
        );
    }
}
