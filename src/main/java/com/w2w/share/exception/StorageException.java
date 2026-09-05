package com.w2w.share.exception;

import java.io.Serial;

public class StorageException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    public StorageException(String message, Throwable cause) {
        super(message, "STORAGE_ERROR", cause);
    }

    public StorageException(String message) {
        super(message, "STORAGE_ERROR");
    }
}
