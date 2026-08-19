package com.w2w.share.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record SignalMessage(
        @JsonProperty("type") String type,
        @JsonProperty("sessionId") String sessionId,
        @JsonProperty("payload") Object payload,
        @JsonProperty("fromPeerId") String fromPeerId,
        @JsonProperty("toPeerId") String toPeerId,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("timestamp") Long timestamp
) {
    @JsonCreator
    public SignalMessage(
            @JsonProperty("type") String type,
            @JsonProperty("sessionId") String sessionId,
            @JsonProperty("payload") Object payload,
            @JsonProperty("fromPeerId") String fromPeerId,
            @JsonProperty("toPeerId") String toPeerId,
            @JsonProperty("correlationId") String correlationId,
            @JsonProperty("timestamp") Long timestamp
    ) {
        this.type = type;
        this.sessionId = sessionId;
        this.payload = payload;
        this.fromPeerId = fromPeerId;
        this.toPeerId = toPeerId;
        this.correlationId = correlationId;
        this.timestamp = timestamp != null ? timestamp : System.currentTimeMillis();
    }

    public SignalMessage(String type, Object payload) {
        this(type, null, payload, null, null, null, System.currentTimeMillis());
    }

    public SignalMessage(String type, String sessionId, Object payload) {
        this(type, sessionId, payload, null, null, null, System.currentTimeMillis());
    }


    public static SignalMessage of(String type, Object payload) {
        return new SignalMessage(type, null, payload, null, null, null, System.currentTimeMillis());
    }

    public static SignalMessage of(String type, String sessionId, Object payload) {
        return new SignalMessage(type, sessionId, payload, null, null, null, System.currentTimeMillis());
    }

    public static SignalMessage iceCandidate(String sessionId, String fromPeerId, Map<String, Object> candidate) {
        return new SignalMessage("WEBRTC_ICE_CANDIDATE", sessionId, candidate, fromPeerId, null, null, System.currentTimeMillis());
    }

    public static SignalMessage offer(String sessionId, String fromPeerId, Map<String, Object> offer) {
        return new SignalMessage("WEBRTC_OFFER", sessionId, offer, fromPeerId, null, null, System.currentTimeMillis());
    }

    public static SignalMessage answer(String sessionId, String fromPeerId, Map<String, Object> answer) {
        return new SignalMessage("WEBRTC_ANSWER", sessionId, answer, fromPeerId, null, null, System.currentTimeMillis());
    }

    public static SignalMessage connectionState(String sessionId, String fromPeerId, String state, String correlationId) {
        return new SignalMessage("WEBRTC_CONNECTION_STATE", sessionId, Map.of("state", state), fromPeerId, null, correlationId, System.currentTimeMillis());
    }

    public static SignalMessage stats(String sessionId, String fromPeerId, Map<String, Object> stats) {
        return new SignalMessage("WEBRTC_STATS", sessionId, stats, fromPeerId, null, null, System.currentTimeMillis());
    }

    public static SignalMessage reconnect(String sessionId, String fromPeerId, String previousPeerId) {
        return new SignalMessage("WEBRTC_RECONNECT", sessionId, Map.of("previousPeerId", previousPeerId), fromPeerId, null, null, System.currentTimeMillis());
    }
}
