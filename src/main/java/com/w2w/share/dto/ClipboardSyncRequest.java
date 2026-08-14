package com.w2w.share.dto;

public record ClipboardSyncRequest(String text) {
    public ClipboardSyncRequest() {
        this("");
    }
}
