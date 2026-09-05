package com.w2w.share.exception;

import java.io.Serial;

public class SessionExpiredException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    public SessionExpiredException(String sessionId) {
        super("Transfer session [" + sessionId + "] has expired due to inactivity.", "SESSION_EXPIRED");
    }
}
