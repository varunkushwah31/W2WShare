package com.w2w.share.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> rootStatus() {
        return ResponseEntity.ok(Map.of(
                "service", "W2W-Share Backend API",
                "status", "UP",
                "mode", "REST_WEBSOCKET_ENGINE",
                "version", "1.0.0",
                "docs", "/swagger-ui/index.html",
                "actuator", "/actuator/health"
        ));
    }
}
