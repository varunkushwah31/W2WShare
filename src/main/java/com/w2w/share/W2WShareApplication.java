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

    public static void main(String[] args) {
        SpringApplication.run(W2WShareApplication.class, args);
    }

    @Bean
    public CommandLineRunner printStartupBanner(NetworkDiscoveryService networkDiscoveryService) {
        return args -> {
            List<NetworkDiscoveryService.InterfaceAddressInfo> interfaces = networkDiscoveryService.getAvailableNetworkInterfaces();
            String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();

            System.out.println("================================================================================");
            System.out.println("            W 2 W   S H A R E  -  O F F L I N E   E 2 E E               ");
            System.out.println("     End-to-End Encrypted Peer File Sharing (Zero Internet Required)    ");
            System.out.println("================================================================================");
            System.out.println("  Local Host URL     : http://localhost:8080");
            System.out.println("  Primary Network URL: " + primaryUrl);
            System.out.println("--------------------------------------------------------------------------------");
            System.out.println("  Available Network Interfaces for Receiver Pairing:");

            if (interfaces.isEmpty()) {
                System.out.println("    * No external network interfaces detected (using localhost only)");
            } else {
                for (NetworkDiscoveryService.InterfaceAddressInfo iface : interfaces) {
                    String badge = iface.isWifiOrHotspot() ? "[Wi-Fi / Hotspot]" : (iface.isLoopback() ? "[Loopback]" : "[Ethernet/LAN]");
                    System.out.printf("    * %-20s %-16s %-18s -> %s%n", iface.getName(), iface.getIp(), badge, iface.getUrl());
                }
            }

            System.out.println("================================================================================");
            System.out.println("  How to transfer files offline:");
            System.out.println("  1. Connect both devices to the same Wi-Fi router OR start a Mobile Hotspot.");
            System.out.println("  2. Open the Primary Network URL in browser on both devices (no internet needed).");
            System.out.println("  3. On Sender: Select a file -> share the 6-digit PIN or QR Code.");
            System.out.println("  4. On Receiver: Enter PIN or scan QR code -> File decrypts automatically!");
            System.out.println("================================================================================");
        };
    }
}
