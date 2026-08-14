package com.w2w.share.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String title,
        int status,
        String errorCode,
        String detail,
        String path,
        Instant timestamp,
        List<Map<String, String>> fieldErrors,
        Map<String, Object> metadata
) {
    public static ErrorResponse of(int status, String errorCode, String title, String detail, String path) {
        return new ErrorResponse(title, status, errorCode, detail, path, Instant.now(), null, null);
    }

    public static ErrorResponse of(int status, String errorCode, String title, String detail, String path, Map<String, Object> metadata) {
        return new ErrorResponse(title, status, errorCode, detail, path, Instant.now(), null, metadata);
    }
}
