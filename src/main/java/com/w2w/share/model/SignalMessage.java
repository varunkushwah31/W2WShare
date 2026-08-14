package com.w2w.share.model;

public record SignalMessage(String type, String sessionId, Object payload) {

    public SignalMessage(String type, Object payload) {
        this(type, null, payload);
    }
}
