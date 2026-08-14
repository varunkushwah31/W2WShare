package com.w2w.share.model;

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

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSenderRole() {
        return senderRole;
    }

    public void setSenderRole(String senderRole) {
        this.senderRole = senderRole;
    }

    public String getEncryptedContent() {
        return encryptedContent;
    }

    public void setEncryptedContent(String encryptedContent) {
        this.encryptedContent = encryptedContent;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
