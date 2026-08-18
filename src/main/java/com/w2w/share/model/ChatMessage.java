package com.w2w.share.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessage {
    private String id;
    private String senderRole;
    private String content;
    private long timestamp;

    public ChatMessage() {}

    public ChatMessage(String id, String senderRole, String content, long timestamp) {
        this.id = id;
        this.senderRole = senderRole;
        this.content = content;
        this.timestamp = timestamp;
    }

    @JsonProperty("content")
    public String getContent() {
        return content;
    }

    @JsonProperty("content")
    public void setContent(String content) {
        this.content = content;
    }

    @JsonProperty("encryptedContent")
    @SuppressWarnings("java:S4144")
    public String getEncryptedContent() {
        return content;
    }

    @JsonProperty("encryptedContent")
    public void setEncryptedContent(String encryptedContent) {
        this.content = encryptedContent;
    }
}

