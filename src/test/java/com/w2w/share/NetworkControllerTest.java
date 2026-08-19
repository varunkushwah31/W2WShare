package com.w2w.share;

import com.w2w.share.controller.NetworkController;
import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.service.INetworkDiscoveryService;
import com.w2w.share.service.IPeerDiscoveryService;
import com.w2w.share.service.IQrCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
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
}
