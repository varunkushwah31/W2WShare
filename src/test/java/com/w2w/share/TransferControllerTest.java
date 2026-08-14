package com.w2w.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.controller.NetworkController;
import com.w2w.share.controller.TransferController;
import com.w2w.share.exception.GlobalExceptionHandler;
import com.w2w.share.metrics.TransferMetricsService;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.service.NetworkDiscoveryService;
import com.w2w.share.service.PeerDiscoveryService;
import com.w2w.share.service.RateLimiterService;
import com.w2w.share.service.SessionService;
import com.w2w.share.service.StorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TransferControllerTest {

    private MockMvc mockMvc;
    private MockMvc networkMockMvc;
    private StorageService storageService;
    private SessionService sessionService;
    private RateLimiterService rateLimiterService;
    private NetworkDiscoveryService networkDiscoveryService;
    private TransferMetricsService metricsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        storageService = new StorageService();
        ReflectionTestUtils.setField(storageService, "tempDirPath", "./target/test-w2w-storage-ctrl");
        ReflectionTestUtils.setField(storageService, "maxQuotaBytes", 53687091200L);
        storageService.init();

        rateLimiterService = new RateLimiterService();
        metricsService = new TransferMetricsService(new SimpleMeterRegistry());
        sessionService = new SessionService(storageService, rateLimiterService, metricsService);
        networkDiscoveryService = new NetworkDiscoveryService();
        ReflectionTestUtils.setField(networkDiscoveryService, "serverPort", 8080);

        TransferController transferController = new TransferController(sessionService, storageService, networkDiscoveryService, metricsService);
        PeerDiscoveryService peerDiscoveryService = new PeerDiscoveryService();
        ReflectionTestUtils.setField(peerDiscoveryService, "serverPort", 8080);
        NetworkController networkController = new NetworkController(networkDiscoveryService, peerDiscoveryService);

        mockMvc = MockMvcBuilders.standaloneSetup(transferController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        networkMockMvc = MockMvcBuilders.standaloneSetup(networkController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testNetworkInfoEndpoint() throws Exception {
        networkMockMvc.perform(get("/api/network/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ONLINE_LOCAL"))
                .andExpect(jsonPath("$.primaryUrl").exists());
    }

    @Test
    void testExceptionHandlingOnNonExistentSession() throws Exception {
        mockMvc.perform(get("/api/transfer/session/non-existent-session-id"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Session Not Found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.errorCode").value("SESSION_NOT_FOUND"));
    }

    @Test
    void testFullMultiFileTransferAndResumptionFlow() throws Exception {
        // 1. Create session
        MvcResult createResult = mockMvc.perform(post("/api/transfer/session/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senderId\":\"test-sender\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.pin").exists())
                .andReturn();

        Map<?, ?> sessionMap = objectMapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        String sessionId = (String) sessionMap.get("sessionId");
        String pin = (String) sessionMap.get("pin");

        // 2. Fetch session by PIN
        mockMvc.perform(get("/api/transfer/session/by-pin/" + pin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId));

        // 3. Register batch offer with 2 files
        FileMetadata f1 = new FileMetadata("f1.txt", 100, "text/plain", 1, 100, "salt1", "iv1", "tag1", "sha1");
        FileMetadata f2 = new FileMetadata("f2.png", 200, "image/png", 1, 200, "salt2", "iv2", "tag2", "sha2");

        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/batch-offer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(f1, f2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BATCH_REGISTERED"))
                .andExpect(jsonPath("$.totalFiles").value(2));

        // 4. Upload file 0 chunk via binary
        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/file/0/chunk/0")
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .content("EncryptedDataBytesForFile0".getBytes()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SAVED"));

        // 5. Test Resumption Status
        mockMvc.perform(get("/api/transfer/session/" + sessionId + "/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.files[0].completedChunks[0]").value(0));

        // 6. Download file 0 chunk
        mockMvc.perform(get("/api/transfer/session/" + sessionId + "/file/0/chunk/0"))
                .andExpect(status().isOk())
                .andExpect(content().bytes("EncryptedDataBytesForFile0".getBytes()));

        // 7. Test E2EE Chat Messaging
        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senderRole\":\"sender\",\"content\":\"encrypted-chat-payload\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.message.encryptedContent").value("encrypted-chat-payload"));

        mockMvc.perform(get("/api/transfer/session/" + sessionId + "/chat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].encryptedContent").value("encrypted-chat-payload"));

        // 8. Delete session
        mockMvc.perform(delete("/api/transfer/session/" + sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SESSION_CLOSED"));
    }
}
