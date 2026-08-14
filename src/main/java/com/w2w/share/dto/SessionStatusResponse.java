package com.w2w.share.dto;

import java.util.List;
import java.util.Set;

public record SessionStatusResponse(
        String sessionId,
        String status,
        List<ChunkProgressDto> files
) {
    public record ChunkProgressDto(
            int fileIndex,
            String fileName,
            int totalChunks,
            Set<Integer> completedChunks
    ) {}
}
