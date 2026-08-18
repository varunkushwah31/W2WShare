package com.w2w.share.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record SessionStatusResponse(
        String sessionId,
        String status,
        @JsonProperty("fileProgressList") List<ChunkProgressDto> files
) {
    public record ChunkProgressDto(
            int fileIndex,
            String fileName,
            int totalChunks,
            @JsonProperty("existingChunks") List<Integer> completedChunks
    ) {}
}
