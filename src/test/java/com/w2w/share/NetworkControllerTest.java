package com.w2w.share;

import com.w2w.share.controller.NetworkController;
import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.service.INetworkDiscoveryService;
import com.w2w.share.service.IPeerDiscoveryService;
import com.w2w.share.service.IQrCodeService;
import com.w2w.share.service.PeerDiscoveryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class NetworkControllerTest {

    private MockMvc mockMvc;
    private INetworkDiscoveryService networkDiscoveryService;
    private IPeerDiscoveryService peerDiscoveryService;
    private IQrCodeService qrCodeService;

    @BeforeEach
    void setUp() {
        networkDiscoveryService = mock(INetworkDiscoveryService.class);
        peerDiscoveryService = mock(IPeerDiscoveryService.class);
        qrCodeService = mock(IQrCodeService.class);

        NetworkController controller = new NetworkController(networkDiscoveryService, peerDiscoveryService, qrCodeService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGetNetworkInfo() throws Exception {
        when(networkDiscoveryService.getAvailableNetworkInterfaces()).thenReturn(Collections.emptyList());
        when(networkDiscoveryService.getPrimaryNetworkUrl()).thenReturn("http://192.168.1.10:8080");

        mockMvc.perform(get("/api/network/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryUrl").value("http://192.168.1.10:8080"));
    }

    @Test
    void testGetNetworkDiagnostics() throws Exception {
        NetworkDiagnosticsResponse response = new NetworkDiagnosticsResponse(
                "CAMPUS_WIFI",
                true,
                8888,
                false,
                "Ready for local sharing",
                "CAMPUS_WIFI",
                Collections.emptyList(),
                "10.15.22.45",
                "http://10.15.22.45:8080"
        );
        when(networkDiscoveryService.runNetworkDiagnostics()).thenReturn(response);

        mockMvc.perform(get("/api/network/diagnostics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeNetworkMode").value("CAMPUS_WIFI"))
                .andExpect(jsonPath("$.localIp").value("10.15.22.45"));
    }

    @Test
    void testGetWifiQrCode() throws Exception {
        byte[] fakePng = new byte[]{(byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G'};
        when(qrCodeService.generateWifiQrCodePng(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(fakePng);

        mockMvc.perform(get("/api/network/wifi-qr")
                        .param("ssid", "TestHotspot")
                        .param("password", "Pass1234")
                        .param("authType", "WPA"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE));
    }

    @Test
    void testGetDiscoveredPeers() throws Exception {
        PeerDiscoveryService.DiscoveredPeer peer = new PeerDiscoveryService.DiscoveredPeer(
                "dev-1", "node-1", "Galaxy S24", "192.168.1.101", 8080, "Android", "http://192.168.1.101:8080", System.currentTimeMillis()
        );
        when(peerDiscoveryService.getDiscoveredPeers()).thenReturn(List.of(peer));

        mockMvc.perform(get("/api/network/peers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deviceId").value("dev-1"))
                .andExpect(jsonPath("$[0].deviceName").value("Galaxy S24"));

        // With excludeDeviceId
        mockMvc.perform(get("/api/network/peers").param("excludeDeviceId", "dev-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void testAnnouncePeer() throws Exception {
        PeerDiscoveryService.DiscoveredPeer peer = new PeerDiscoveryService.DiscoveredPeer(
                "dev-web", "dev-web", "iPhone Safari", "127.0.0.1", 8080, "iOS", "http://127.0.0.1:8080", System.currentTimeMillis()
        );
        when(peerDiscoveryService.registerPeer(any(), any(), any(), anyInt(), any())).thenReturn(peer);

        String json = """
                {
                    "deviceId": "dev-web",
                    "deviceName": "iPhone Safari",
                    "os": "iOS",
                    "port": 8080
                }
                """;

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/network/peers/announce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceId").value("dev-web"))
                .andExpect(jsonPath("$.deviceName").value("iPhone Safari"))
                .andExpect(jsonPath("$.os").value("iOS"));
    }

    @Test
    void testTriggerPeerScan() throws Exception {
        PeerDiscoveryService.DiscoveredPeer peer = new PeerDiscoveryService.DiscoveredPeer(
                "dev-2", "node-2", "iPhone 15", "192.168.1.102", 8080, "iOS", "http://192.168.1.102:8080", System.currentTimeMillis()
        );
        when(peerDiscoveryService.getDiscoveredPeers()).thenReturn(List.of(peer));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/network/peers/scan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deviceId").value("dev-2"))
                .andExpect(jsonPath("$[0].deviceName").value("iPhone 15"));
    }
}
