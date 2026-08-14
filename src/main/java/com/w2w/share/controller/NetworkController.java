package com.w2w.share.controller;

import com.w2w.share.dto.NetworkInfoResponse;
import com.w2w.share.service.INetworkDiscoveryService;
import com.w2w.share.service.IPeerDiscoveryService;
import com.w2w.share.service.NetworkDiscoveryService;
import com.w2w.share.service.PeerDiscoveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/network")
public class NetworkController {

    private final INetworkDiscoveryService networkDiscoveryService;
    private final IPeerDiscoveryService peerDiscoveryService;

    public NetworkController(INetworkDiscoveryService networkDiscoveryService, IPeerDiscoveryService peerDiscoveryService) {
        this.networkDiscoveryService = networkDiscoveryService;
        this.peerDiscoveryService = peerDiscoveryService;
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
                        i.isWifiOrHotspot()
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

    @GetMapping("/peers")
    public ResponseEntity<List<PeerDiscoveryService.DiscoveredPeer>> getDiscoveredPeers() {
        return ResponseEntity.ok(peerDiscoveryService.getDiscoveredPeers());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> getHealth() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
