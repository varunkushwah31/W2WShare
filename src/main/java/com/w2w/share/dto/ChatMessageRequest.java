package com.w2w.share.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatMessageRequest(
        String senderRole,

        @NotBlank(message = "Content cannot be empty")
        String content
) {
    public ChatMessageRequest() {
        this("client", "");
    }
}
