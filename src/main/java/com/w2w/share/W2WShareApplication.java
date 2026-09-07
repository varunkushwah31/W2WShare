package com.w2w.share;

import com.w2w.share.service.NetworkDiscoveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.List;

@EnableScheduling
@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })
public class W2WShareApplication {

    private static final Logger log = LoggerFactory.getLogger(W2WShareApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(W2WShareApplication.class, args);
    }

    @Bean
    public CommandLineRunner printStartupBanner(NetworkDiscoveryService networkDiscoveryService) {
        return _ -> {
            List<NetworkDiscoveryService.InterfaceAddressInfo> interfaces = networkDiscoveryService.getAvailableNetworkInterfaces();
            String primaryUrl = networkDiscoveryService.getPrimaryNetworkUrl();

            StringBuilder ifacesBuilder = new StringBuilder();
            if (interfaces.isEmpty()) {
                ifacesBuilder.append(String.format("    * No external network interfaces detected (using localhost only)%n"));
            } else {
                for (NetworkDiscoveryService.InterfaceAddressInfo iface : interfaces) {
                    String badge = resolveInterfaceBadge(iface);
                    ifacesBuilder.append(String.format("    * %-20s %-16s %-18s -> %s%n", iface.getName(), iface.getIp(), badge, iface.getUrl()));
                }
            }

            String banner = """
                
                ================================================================================
                            W 2 W   S H A R E  -  O F F L I N E   E 2 E E
                     End-to-End Encrypted Peer File Sharing (Zero Internet Required)
                ================================================================================
                  Local Host URL     : http://localhost:8080
                  Primary Network URL: %s
                --------------------------------------------------------------------------------
                  Available Network Interfaces for Receiver Pairing:
                %s================================================================================
                  How to transfer files offline:
                  1. Connect both devices to the same Wi-Fi router OR start a Mobile Hotspot.
                  2. Open the Primary Network URL in browser on both devices (no internet needed).
                  3. On Sender: Select a file -> share the 6-digit PIN or QR Code.
                  4. On Receiver: Enter PIN or scan QR code -> File decrypts automatically!
                ================================================================================
                """.formatted(primaryUrl, ifacesBuilder.toString());

            log.info(banner);
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
