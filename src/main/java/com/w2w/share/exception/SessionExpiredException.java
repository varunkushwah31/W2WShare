package com.w2w.share.exception;

public class SessionExpiredException extends W2WException {
    public SessionExpiredException(String sessionId) {
        super("Transfer session [" + sessionId + "] has expired due to inactivity.", "SESSION_EXPIRED");
    }
}
