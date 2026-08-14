package com.w2w.share.dto;

import java.util.List;

public record NetworkInfoResponse(
        String status,
        String primaryUrl,
        List<InterfaceDto> interfaces,
        long uptimeSeconds,
        String version
) {
    public record InterfaceDto(
            String name,
            String displayName,
            String ip,
            String url,
            boolean isLoopback,
            boolean isWifiOrHotspot
    ) {}
}
