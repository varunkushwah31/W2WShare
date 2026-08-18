package com.w2w.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.controller.AuditLedgerController;
import com.w2w.share.dto.AuditReceiptDto;
import com.w2w.share.dto.AuditRecordDto;
import com.w2w.share.service.IAuditLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuditLedgerControllerTest {

    private MockMvc mockMvc;
    private IAuditLedgerService auditLedgerService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        auditLedgerService = Mockito.mock(IAuditLedgerService.class);
        AuditLedgerController controller = new AuditLedgerController(auditLedgerService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testGetLedger() throws Exception {
        AuditRecordDto record = new AuditRecordDto(
                "TX-8942-A", System.currentTimeMillis(), "SENT", "report.parquet", 4000L, 2, "sha256", "AES", true, true
        );
        when(auditLedgerService.getAllRecords()).thenReturn(List.of(record));

        mockMvc.perform(get("/api/audit/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("TX-8942-A"))
                .andExpect(jsonPath("$[0].fileName").value("report.parquet"));
    }

    @Test
    void testRecordTransaction() throws Exception {
        AuditRecordDto record = new AuditRecordDto(
                "TX-NEW", System.currentTimeMillis(), "RECEIVED", "video.mp4", 5000000L, 5, "sha", "AES", false, false
        );
        when(auditLedgerService.recordTransaction(any(AuditRecordDto.class))).thenReturn(record);

        mockMvc.perform(post("/api/audit/ledger")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(record)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("TX-NEW"))
                .andExpect(jsonPath("$.direction").value("RECEIVED"));
    }

    @Test
    void testGetReceiptFound() throws Exception {
        AuditReceiptDto receipt = new AuditReceiptDto(
                "1.0.0 (Offline E2EE)", "TX-REC", "2026-08-18T12:00:00Z", "SENT", "spec.pdf", 1024L, 1, "AES-256", "sha", false, false, "VALID"
        );
        when(auditLedgerService.getReceipt("TX-REC")).thenReturn(Optional.of(receipt));

        mockMvc.perform(get("/api/audit/ledger/TX-REC/receipt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transaction_id").value("TX-REC"))
                .andExpect(jsonPath("$.file_name").value("spec.pdf"));
    }

    @Test
    void testClearLedger() throws Exception {
        mockMvc.perform(delete("/api/audit/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LEDGER_CLEARED"));
    }
}
