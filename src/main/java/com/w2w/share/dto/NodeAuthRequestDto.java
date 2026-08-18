package com.w2w.share.dto;

import jakarta.validation.constraints.NotBlank;

public record NodeAuthRequestDto(
        @NotBlank(message = "Node ID is required")
        String nodeId,

        @NotBlank(message = "Secret token is required")
        String token
) {}
