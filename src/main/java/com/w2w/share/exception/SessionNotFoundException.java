package com.w2w.share.exception;

import java.io.Serial;

public class SessionNotFoundException extends W2WException {
    @Serial
    private static final long serialVersionUID = 1L;
    public SessionNotFoundException(String sessionId) {
        super("Transfer session [" + sessionId + "] was not found or has been closed.", "SESSION_NOT_FOUND");
    }
}
