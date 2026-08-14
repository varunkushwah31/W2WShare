package com.w2w.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.controller.TransferController;
import com.w2w.share.exception.GlobalExceptionHandler;
import com.w2w.share.metrics.TransferMetricsService;
import com.w2w.share.model.FileMetadata;
import com.w2w.share.service.NetworkDiscoveryService;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class E2ETransferIntegrationTest {

    private MockMvc mockMvc;
    private StorageService storageService;
    private SessionService sessionService;
    private RateLimiterService rateLimiterService;
    private NetworkDiscoveryService networkDiscoveryService;
    private TransferMetricsService metricsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        storageService = new StorageService();
        ReflectionTestUtils.setField(storageService, "tempDirPath", "./target/test-w2w-e2e");
        ReflectionTestUtils.setField(storageService, "maxQuotaBytes", 53687091200L);
        storageService.init();

        rateLimiterService = new RateLimiterService();
        metricsService = new TransferMetricsService(new SimpleMeterRegistry());
        sessionService = new SessionService(storageService, rateLimiterService, metricsService);
        networkDiscoveryService = new NetworkDiscoveryService();
        ReflectionTestUtils.setField(networkDiscoveryService, "serverPort", 8080);

        TransferController transferController = new TransferController(sessionService, storageService, networkDiscoveryService, metricsService);

        mockMvc = MockMvcBuilders.standaloneSetup(transferController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testEndToEndBurnAfterReadingWorkflow() throws Exception {
        // 1. Create session with Burn-After-Reading
        MvcResult createResult = mockMvc.perform(post("/api/transfer/session/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senderId\":\"sender-e2e\",\"burnAfterReading\":true,\"maxDownloads\":1,\"expiresInSeconds\":300}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.pin").exists())
                .andExpect(jsonPath("$.burnAfterReading").value(true))
                .andReturn();

        Map<?, ?> sessionMap = objectMapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        String sessionId = (String) sessionMap.get("sessionId");
        String pin = (String) sessionMap.get("pin");

        // 2. Receiver joins with PIN
        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"" + pin + "\",\"receiverId\":\"receiver-e2e\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burnAfterReading").value(true));

        // 3. Sender offers compressed file with folder path
        FileMetadata compFile = new FileMetadata(
                "App.java",
                512,
                "text/x-java-source",
                1,
                512,
                "salt123",
                "iv123",
                "tag123",
                "sha256checksum",
                "project/src/App.java",
                true,
                2048
        );

        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/batch-offer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(compFile))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BATCH_REGISTERED"));

        // 4. Sender uploads encrypted chunk
        byte[] testChunk = "AES_ENCRYPTED_AND_COMPRESSED_CHUNK_BYTES".getBytes();
        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/file/0/chunk/0")
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .content(testChunk))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SAVED"));

        // 5. Receiver downloads chunk
        mockMvc.perform(get("/api/transfer/session/" + sessionId + "/file/0/chunk/0"))
                .andExpect(status().isOk())
                .andExpect(content().bytes(testChunk));

        // 6. Receiver marks download complete -> triggers Burn-After-Reading auto-destruction
        mockMvc.perform(post("/api/transfer/session/" + sessionId + "/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burned").value(true));

        // 7. Verify session is destroyed and purged from memory and storage
        mockMvc.perform(get("/api/transfer/session/" + sessionId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("SESSION_NOT_FOUND"));

        assertFalse(storageService.hasChunk(sessionId, 0, 0));
    }
}
