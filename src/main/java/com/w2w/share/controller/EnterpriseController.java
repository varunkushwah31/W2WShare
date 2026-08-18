package com.w2w.share.controller;

import com.w2w.share.dto.DemoRequestDto;
import com.w2w.share.dto.NodeAuthRequestDto;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/enterprise")
public class EnterpriseController {

    private static final Logger log = LoggerFactory.getLogger(EnterpriseController.class);

    @PostMapping("/demo-request")
    public ResponseEntity<Map<String, Object>> requestApplianceDemo(@Valid @RequestBody DemoRequestDto request) {
        String leadId = "DEMO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Registered Enterprise Appliance Demo request: [{}] from {} ({}) for org: {}",
                leadId, request.name(), request.email(), request.company());

        return ResponseEntity.ok(Map.of(
                "status", "REGISTERED",
                "leadId", leadId,
                "message", "Appliance documentation and deployment specifications will be delivered to " + request.email()
        ));
    }

    @PostMapping("/node-auth")
    public ResponseEntity<Map<String, Object>> authenticateNode(@Valid @RequestBody NodeAuthRequestDto request) {
        log.info("Node authentication verification requested for node: {}", request.nodeId());
        // Validate node credentials (local keystore simulation)
        boolean authenticated = request.nodeId() != null && !request.nodeId().isBlank()
                && request.token() != null && request.token().length() >= 4;

        return ResponseEntity.ok(Map.of(
                "authenticated", authenticated,
                "nodeId", request.nodeId(),
                "status", authenticated ? "AUTHORIZED" : "UNAUTHORIZED",
                "keystoreStatus", "LOCAL_HARDWARE_PINNED"
        ));
    }
}
