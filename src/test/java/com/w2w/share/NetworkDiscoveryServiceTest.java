package com.w2w.share;

import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.service.NetworkDiscoveryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class NetworkDiscoveryServiceTest {

    private NetworkDiscoveryService networkDiscoveryService;

    @BeforeEach
    void setUp() {
        networkDiscoveryService = new NetworkDiscoveryService();
    }

    @Test
    void testGetAvailableNetworkInterfaces() {
        List<NetworkDiscoveryService.InterfaceAddressInfo> interfaces = networkDiscoveryService.getAvailableNetworkInterfaces();
        assertNotNull(interfaces);
    }

    @Test
    void testGetPrimaryNetworkUrl() {
        String url = networkDiscoveryService.getPrimaryNetworkUrl();
        assertNotNull(url);
        assertTrue(url.startsWith("http://"));
    }

    @Test
    void testRunNetworkDiagnostics() {
        NetworkDiagnosticsResponse diagnostics = networkDiscoveryService.runNetworkDiagnostics();
        assertNotNull(diagnostics);
        assertNotNull(diagnostics.activeNetworkMode());
        assertNotNull(diagnostics.apIsolationStatusMessage());
        assertNotNull(diagnostics.recommendedMode());
        assertNotNull(diagnostics.primaryUrl());
        assertNotNull(diagnostics.localIp());
    }

    @Test
    void testClassifyType() {
        assertEquals("LOOPBACK", NetworkDiscoveryService.classifyType("lo", "Loopback", "127.0.0.1", true, false));
        // Method 1: Smartphone Personal Hotspot & Windows Mobile Hotspot
        assertEquals("HOTSPOT", NetworkDiscoveryService.classifyType("wlan1", "Wi-Fi Direct Virtual", "192.168.137.1", false, true));
        assertEquals("HOTSPOT", NetworkDiscoveryService.classifyType("ap0", "SoftAP Interface", "192.168.43.1", false, true));
        assertEquals("HOTSPOT", NetworkDiscoveryService.classifyType("wlan0", "iPhone Personal Hotspot", "172.20.10.2", false, true));
        // Method 2: Standard Wi-Fi Router or Office/Home LAN
        assertEquals("STANDARD_LAN", NetworkDiscoveryService.classifyType("wlan0", "Wi-Fi Home Router", "192.168.1.6", false, true));
        assertEquals("STANDARD_LAN", NetworkDiscoveryService.classifyType("wlan0", "Office Wi-Fi 6", "192.168.0.15", false, true));
        assertEquals("CAMPUS_WIFI", NetworkDiscoveryService.classifyType("wlan0", "Intel Wi-Fi 6", "10.15.22.45", false, true));
        assertEquals("ETHERNET", NetworkDiscoveryService.classifyType("eth0", "Realtek PCIe GbE", "192.168.1.50", false, false));
        // VPN / Virtual Tunnel interfaces
        assertEquals("OTHER", NetworkDiscoveryService.classifyType("iftype53_32769", "Cloudflare WARP Interface Tunnel", "172.16.0.2", false, false));
        assertEquals("OTHER", NetworkDiscoveryService.classifyType("tap0", "TAP-ProtonVPN Windows Adapter V9", "10.8.0.2", false, false));
        assertEquals("OTHER", NetworkDiscoveryService.classifyType("docker0", "docker0", "172.17.0.1", false, false));
    }
}
