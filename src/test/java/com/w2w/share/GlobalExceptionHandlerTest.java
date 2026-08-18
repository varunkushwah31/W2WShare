package com.w2w.share;

import com.w2w.share.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.nio.file.NoSuchFileException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/transfer/test");
    }

    @Test
    void testHandleSessionNotFound() {
        SessionNotFoundException ex = new SessionNotFoundException("Session not found");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleSessionNotFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SESSION_NOT_FOUND", response.getBody().errorCode());
        assertEquals(404, response.getBody().status());
    }

    @Test
    void testHandleInvalidPin() {
        InvalidPinException ex = new InvalidPinException("Invalid PIN code");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleInvalidPin(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INVALID_PIN", response.getBody().errorCode());
    }

    @Test
    void testHandleSessionExpired() {
        SessionExpiredException ex = new SessionExpiredException("Session has expired");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleSessionExpired(ex, request);

        assertEquals(HttpStatus.GONE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SESSION_EXPIRED", response.getBody().errorCode());
    }

    @Test
    void testHandleRateLimit() {
        RateLimitExceededException ex = new RateLimitExceededException("Too many requests", 60);
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleRateLimit(ex, request);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("RATE_LIMIT_EXCEEDED", response.getBody().errorCode());
        assertEquals("60", response.getHeaders().getFirst("Retry-After"));
    }

    @Test
    void testHandleInvalidChunk() {
        InvalidChunkException ex = new InvalidChunkException("Chunk size mismatch");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleInvalidChunk(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INVALID_CHUNK", response.getBody().errorCode());
    }

    @Test
    void testHandleStorage() {
        StorageException ex = new StorageException("Storage error occurred");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleStorage(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("STORAGE_ERROR", response.getBody().errorCode());
    }

    @Test
    void testHandleMaxSize() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1024L);
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMaxSize(ex, request);

        assertEquals(HttpStatus.CONTENT_TOO_LARGE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("CONTENT_TOO_LARGE", response.getBody().errorCode());
    }

    @Test
    void testHandleNoSuchFile() {
        NoSuchFileException ex = new NoSuchFileException("chunk_0.bin");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleNoSuchFile(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("FILE_NOT_FOUND", response.getBody().errorCode());
    }

    @Test
    void testHandleNullPointer() {
        NullPointerException ex = new NullPointerException("Null reference encountered");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleNullPointer(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("NULL_POINTER_EXCEPTION", response.getBody().errorCode());
    }

    @Test
    void testHandleW2WBase() {
        W2WException ex = new W2WException("Custom W2W domain issue", "W2W_CUSTOM_ERROR");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleW2WBase(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("W2W_CUSTOM_ERROR", response.getBody().errorCode());
    }

    @Test
    void testHandleIllegal() {
        IllegalArgumentException ex = new IllegalArgumentException("Illegal parameter");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleIllegal(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("BAD_REQUEST", response.getBody().errorCode());
    }

    @Test
    void testHandleGeneric() {
        Exception ex = new Exception("General internal failure");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGeneric(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().errorCode());
    }
}
