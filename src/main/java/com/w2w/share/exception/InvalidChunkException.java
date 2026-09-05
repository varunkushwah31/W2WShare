package com.w2w.share.exception;

import java.io.Serial;

public class InvalidChunkException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    public InvalidChunkException(String message) {
        super(message, "INVALID_CHUNK");
    }
}
