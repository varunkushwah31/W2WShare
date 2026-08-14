package com.w2w.share.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.nio.file.NoSuchFileException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotFound(SessionNotFoundException ex, HttpServletRequest request) {
        log.warn("Session not found: {} for path: {}", ex.getMessage(), request.getRequestURI());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                ex.getErrorCode(),
                "Session Not Found",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
    }

    @ExceptionHandler(InvalidPinException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPin(InvalidPinException ex, HttpServletRequest request) {
        log.warn("Invalid PIN attempt on path {}: {}", request.getRequestURI(), ex.getMessage());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                ex.getErrorCode(),
                "Invalid Pairing Code",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(SessionExpiredException.class)
    public ResponseEntity<ErrorResponse> handleSessionExpired(SessionExpiredException ex, HttpServletRequest request) {
        log.info("Session expired: {} for path: {}", ex.getMessage(), request.getRequestURI());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.GONE.value(),
                ex.getErrorCode(),
                "Session Expired",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.GONE).body(err);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        log.warn("Rate limit triggered on {}: {}", request.getRequestURI(), ex.getMessage());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                ex.getErrorCode(),
                "Too Many Requests",
                ex.getMessage(),
                request.getRequestURI(),
                Map.of("retryAfterSeconds", ex.getRetryAfterSeconds())
        );
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(err);
    }

    @ExceptionHandler(InvalidChunkException.class)
    public ResponseEntity<ErrorResponse> handleInvalidChunk(InvalidChunkException ex, HttpServletRequest request) {
        log.warn("Invalid chunk on {}: {}", request.getRequestURI(), ex.getMessage());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                ex.getErrorCode(),
                "Invalid Transfer Chunk",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorage(StorageException ex, HttpServletRequest request) {
        log.error("Storage error on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                ex.getErrorCode(),
                "Storage Failure",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        log.warn("Payload too large on {}: {}", request.getRequestURI(), ex.getMessage());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.PAYLOAD_TOO_LARGE.value(),
                "PAYLOAD_TOO_LARGE",
                "Payload Too Large",
                "The uploaded file or chunk exceeds the maximum permitted size.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(err);
    }

    @ExceptionHandler(NoSuchFileException.class)
    public ResponseEntity<ErrorResponse> handleNoSuchFile(NoSuchFileException ex, HttpServletRequest request) {
        log.warn("File not found on disk: {} for path: {}", ex.getFile(), request.getRequestURI());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "FILE_NOT_FOUND",
                "File Not Found",
                "The requested resource or chunk was not found on local storage.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> fieldErrors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            Map<String, String> map = new HashMap<>();
            map.put("field", fe.getField());
            map.put("message", fe.getDefaultMessage());
            fieldErrors.add(map);
        }

        ErrorResponse err = new ErrorResponse(
                "Validation Error",
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_ERROR",
                "One or more request parameters failed validation.",
                request.getRequestURI(),
                Instant.now(),
                fieldErrors,
                null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ErrorResponse> handleIllegal(RuntimeException ex, HttpServletRequest request) {
        log.warn("Illegal argument/state on {}: {}", request.getRequestURI(), ex.getMessage());
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "BAD_REQUEST",
                "Bad Request",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        ErrorResponse err = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "Internal Server Error",
                "An unexpected internal error occurred: " + ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
    }
}
