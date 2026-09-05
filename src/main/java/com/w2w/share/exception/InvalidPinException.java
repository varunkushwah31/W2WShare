package com.w2w.share.exception;

import java.io.Serial;

public class InvalidPinException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    public InvalidPinException(String message) {
        super(message, "INVALID_PIN");
    }
}
