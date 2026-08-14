package com.w2w.share.exception;

public class InvalidPinException extends W2WException {
    public InvalidPinException(String message) {
        super(message, "INVALID_PIN");
    }
}
