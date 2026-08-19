package com.w2w.share.controller;

import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.dto.NetworkInfoResponse;
import com.w2w.share.service.INetworkDiscoveryService;
import com.w2w.share.service.IPeerDiscoveryService;
import com.w2w.share.service.IQrCodeService;
import com.w2w.share.service.QrCodeService;
import com.w2w.share.service.NetworkDiscoveryService;
import com.w2w.share.service.PeerDiscoveryService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/network")
public class NetworkController {

    private final INetworkDiscoveryService networkDiscoveryService;
    private final IPeerDiscoveryService peerDiscoveryService;
    private final IQrCodeService qrCodeService;

    public NetworkController(INetworkDiscoveryService networkDiscoveryService,
                             IPeerDiscoveryService peerDiscoveryService,
                             IQrCodeService qrCodeService) {
        this.networkDiscoveryService = networkDiscoveryService;
        this.peerDiscoveryService = peerDiscoveryService;
        this.qrCodeService = qrCodeService != null ? qrCodeService : new QrCodeService();
    }

    public NetworkController(INetworkDiscoveryService networkDiscoveryService,
                             IPeerDiscoveryService peerDiscoveryService) {
        this(networkDiscoveryService, peerDiscoveryService, new QrCodeService());
    }


    @GetMapping("/info")
    public ResponseEntity<NetworkInfoResponse> getNetworkInfo() {
        List<NetworkDiscoveryService.InterfaceAddressInfo> interfaces = networkDiscoveryService.getAvailableNetworkInterfaces();
        String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        List<NetworkInfoResponse.InterfaceDto> dtoList = interfaces.stream()
                .map(i -> new NetworkInfoResponse.InterfaceDto(
                        i.getName(),
                        i.getDisplayName(),
                        i.getIp(),
                        i.getUrl(),
                        i.isLoopback(),
                        i.isWifiOrHotspot(),
                        i.getInterfaceType()
                ))
                .toList();

        return ResponseEntity.ok(new NetworkInfoResponse(
                "ONLINE_LOCAL",
                primaryUrl,
                dtoList,
                uptimeMs / 1000,
                "1.0.0 (Offline E2EE)"
        ));
    }

    @GetMapping("/diagnostics")
    public ResponseEntity<NetworkDiagnosticsResponse> getNetworkDiagnostics() {
        return ResponseEntity.ok(networkDiscoveryService.runNetworkDiagnostics());
    }

    @GetMapping(value = "/wifi-qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getWifiQr(
            @RequestParam String ssid,
            @RequestParam(required = false, defaultValue = "") String password,
            @RequestParam(required = false, defaultValue = "WPA") String authType,
            @RequestParam(required = false, defaultValue = "300") int size
    ) {
        int clampedSize = Math.max(100, Math.min(size, 1000));
        byte[] qrBytes = qrCodeService.generateWifiQrCodePng(ssid, password, authType, clampedSize, clampedSize);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"w2w-wifi-hotspot.png\"")
                .body(qrBytes);
    }

    @GetMapping("/peers")
    public ResponseEntity<List<PeerDiscoveryService.DiscoveredPeer>> getDiscoveredPeers() {
        return ResponseEntity.ok(peerDiscoveryService.getDiscoveredPeers());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> getHealth() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}

