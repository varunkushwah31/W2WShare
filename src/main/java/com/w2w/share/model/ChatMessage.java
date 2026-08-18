package com.w2w.share.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessage {
    private String id;
    private String senderRole;
    private String encryptedContent;
    private long timestamp;

    public ChatMessage() {}

    public ChatMessage(String id, String senderRole, String encryptedContent, long timestamp) {
        this.id = id;
        this.senderRole = senderRole;
        this.encryptedContent = encryptedContent;
        this.timestamp = timestamp;
    }

}
