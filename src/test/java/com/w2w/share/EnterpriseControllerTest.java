package com.w2w.share;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w2w.share.controller.EnterpriseController;
import com.w2w.share.dto.DemoRequestDto;
import com.w2w.share.dto.NodeAuthRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EnterpriseControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        EnterpriseController controller = new EnterpriseController();
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testDemoRequestSuccess() throws Exception {
        DemoRequestDto dto = new DemoRequestDto(
                "Alex Vance", "engineer@defense-lab.org", "Air-Gapped Systems Cluster", "Local Air-Gapped LAN"
        );

        mockMvc.perform(post("/api/enterprise/demo-request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REGISTERED"))
                .andExpect(jsonPath("$.leadId").exists());
    }

    @Test
    void testNodeAuthSuccess() throws Exception {
        NodeAuthRequestDto dto = new NodeAuthRequestDto("node-01.w2w.local", "secret-token-1234");

        mockMvc.perform(post("/api/enterprise/node-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.status").value("AUTHORIZED"));
    }
}
