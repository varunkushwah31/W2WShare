package com.w2w.share.dto;

import java.util.List;

public record NetworkDiagnosticsResponse(
        String activeNetworkMode,
        boolean udpDiscoveryActive,
        int udpDiscoveryPort,
        boolean apIsolationSuspected,
        String apIsolationStatusMessage,
        String recommendedMode,
        List<NetworkInfoResponse.InterfaceDto> interfaces,
        String localIp,
        String primaryUrl
) {}
