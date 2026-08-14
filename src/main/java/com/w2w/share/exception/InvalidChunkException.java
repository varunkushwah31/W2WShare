package com.w2w.share.exception;

public class InvalidChunkException extends W2WException {
    public InvalidChunkException(String message) {
        super(message, "INVALID_CHUNK");
    }
}
