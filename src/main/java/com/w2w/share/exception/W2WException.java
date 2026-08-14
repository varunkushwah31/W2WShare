package com.w2w.share.exception;

public class W2WException extends RuntimeException {
    private final String errorCode;

    public W2WException(String message) {
        super(message);
        this.errorCode = "W2W_ERROR";
    }

    public W2WException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public W2WException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "W2W_INTERNAL_ERROR";
    }

    public W2WException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
