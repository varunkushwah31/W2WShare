package com.w2w.share.exception;

import lombok.Getter;

import java.io.Serial;

@Getter
public class W2WException extends RuntimeException {
    @Serial
    private static final long serialVersionUID = 1L;
    private final String errorCode;

    public W2WException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public W2WException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

}
