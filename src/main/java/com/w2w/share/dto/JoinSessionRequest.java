package com.w2w.share.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record JoinSessionRequest(
        @NotBlank(message = "PIN cannot be blank")
        @Pattern(regexp = "^\\d{6}$", message = "PIN must be exactly 6 numeric digits")
        String pin,

        String receiverId
) {
    public JoinSessionRequest() {
        this("", null);
    }
}
