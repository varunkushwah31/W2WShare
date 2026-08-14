package com.w2w.share.exception;

public class StorageException extends W2WException {
    public StorageException(String message, Throwable cause) {
        super(message, "STORAGE_ERROR", cause);
    }

    public StorageException(String message) {
        super(message, "STORAGE_ERROR");
    }
}
