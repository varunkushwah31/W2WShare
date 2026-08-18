package com.w2w.share;

import com.w2w.share.service.NetworkDiscoveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class W2WShareApplication {

    private static final Logger log = LoggerFactory.getLogger(W2WShareApplication.class);
    private static final String BORDER_LINE = "================================================================================";

    public static void main(String[] args) {
        SpringApplication.run(W2WShareApplication.class, args);
    }

    @Bean
    public CommandLineRunner printStartupBanner(NetworkDiscoveryService networkDiscoveryService) {
        return args -> {
            List<NetworkDiscoveryService.InterfaceAddressInfo> interfaces = networkDiscoveryService.getAvailableNetworkInterfaces();
            String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();

            log.info(BORDER_LINE);
            log.info("            W 2 W   S H A R E  -  O F F L I N E   E 2 E E               ");
            log.info("     End-to-End Encrypted Peer File Sharing (Zero Internet Required)    ");
            log.info(BORDER_LINE);
            log.info("  Local Host URL     : http://localhost:8080");
            log.info("  Primary Network URL: {}", primaryUrl);
            log.info("--------------------------------------------------------------------------------");
            log.info("  Available Network Interfaces for Receiver Pairing:");

            if (interfaces.isEmpty()) {
                log.info("    * No external network interfaces detected (using localhost only)");
            } else {
                for (NetworkDiscoveryService.InterfaceAddressInfo iface : interfaces) {
                    String badge = resolveInterfaceBadge(iface);
                    log.info(String.format("    * %-20s %-16s %-18s -> %s", iface.getName(), iface.getIp(), badge, iface.getUrl()));
                }
            }

            log.info(BORDER_LINE);
            log.info("  How to transfer files offline:");
            log.info("  1. Connect both devices to the same Wi-Fi router OR start a Mobile Hotspot.");
            log.info("  2. Open the Primary Network URL in browser on both devices (no internet needed).");
            log.info("  3. On Sender: Select a file -> share the 6-digit PIN or QR Code.");
            log.info("  4. On Receiver: Enter PIN or scan QR code -> File decrypts automatically!");
            log.info(BORDER_LINE);
        };
    }

    private static String resolveInterfaceBadge(NetworkDiscoveryService.InterfaceAddressInfo iface) {
        if (iface.isWifiOrHotspot()) {
            return "[Wi-Fi / Hotspot]";
        }
        if (iface.isLoopback()) {
            return "[Loopback]";
        }
        return "[Ethernet/LAN]";
    }
}
