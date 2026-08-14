package com.w2w.share.exception;

public class SessionNotFoundException extends W2WException {
    public SessionNotFoundException(String sessionId) {
        super("Transfer session [" + sessionId + "] was not found or has been closed.", "SESSION_NOT_FOUND");
    }
}
