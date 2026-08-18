package com.w2w.share.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record DemoRequestDto(
        @NotBlank(message = "Engineer name is required")
        String name,

        @NotBlank(message = "Work email is required")
        @Email(message = "Must be a valid email format")
        String email,

        @NotBlank(message = "Company / organization is required")
        String company,

        String networkType
) {}
