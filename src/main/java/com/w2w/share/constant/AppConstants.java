package com.w2w.share.constant;

public final class AppConstants {

    private AppConstants() {}

    public static final String APP_NAME = "W2W Share";
    public static final String APP_VERSION = "1.0.0";

    public static final int DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
    public static final long DEFAULT_MAX_STORAGE_QUOTA = 50L * 1024 * 1024 * 1024; // 50 GB
    public static final long DEFAULT_SESSION_EXPIRY_SECONDS = 600L; // 10 minutes

    public static final int DISCOVERY_PORT = 8888;
    public static final String BROADCAST_ADDRESS = "255.255.255.255";

    public static final int RATE_LIMIT_MAX_ATTEMPTS = 5;
    public static final long RATE_LIMIT_LOCKOUT_SECONDS = 60L;

    public static final String WEBSOCKET_PATH = "/ws/transfer";
    public static final String WEBSOCKET_ORIGIN_PATTERN = "*";

    // WebRTC Signaling Constants
    public static final int ICE_CANDIDATE_TIMEOUT_MS = 30000;
    public static final int CONNECTION_STATE_TIMEOUT_MS = 60000;
    public static final int RECONNECT_WINDOW_MS = 120000;
    public static final int MAX_ICE_CANDIDATES_PER_PEER = 50;
}
