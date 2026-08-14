package com.w2w.share.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.*;
import java.util.*;

@Service
public class NetworkDiscoveryService implements INetworkDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(NetworkDiscoveryService.class);

    public static class InterfaceAddressInfo {
        private final String name;
        private final String displayName;
        private final String ip;
        private final String url;
        private final boolean isLoopback;
        private final boolean isWifiOrHotspot;

        public InterfaceAddressInfo(String name, String displayName, String ip, int port, boolean isLoopback, boolean isWifiOrHotspot) {
            this.name = name;
            this.displayName = displayName;
            this.ip = ip;
            this.url = "http://" + ip + ":" + port;
            this.isLoopback = isLoopback;
            this.isWifiOrHotspot = isWifiOrHotspot;
        }

        public String getName() { return name; }
        public String getDisplayName() { return displayName; }
        public String getIp() { return ip; }
        public String getUrl() { return url; }
        public boolean isLoopback() { return isLoopback; }
        public boolean isWifiOrHotspot() { return isWifiOrHotspot; }
    }

    @Value("${server.port:8080}")
    private int serverPort;

    @Override
    public List<InterfaceAddressInfo> getAvailableNetworkInterfaces() {
        List<InterfaceAddressInfo> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces == null) return result;

            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (!iface.isUp() || iface.isVirtual()) continue;

                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address) {
                        String ip = addr.getHostAddress();
                        boolean isLoopback = addr.isLoopbackAddress();
                        boolean isWifi = iface.getName().toLowerCase().contains("wlan")
                                || iface.getName().toLowerCase().contains("wi-fi")
                                || iface.getDisplayName().toLowerCase().contains("wireless")
                                || iface.getDisplayName().toLowerCase().contains("wi-fi")
                                || iface.getName().toLowerCase().contains("ap");

                        result.add(new InterfaceAddressInfo(
                                iface.getName(),
                                iface.getDisplayName(),
                                ip,
                                serverPort,
                                isLoopback,
                                isWifi
                        ));
                    }
                }
            }
        } catch (SocketException e) {
            log.error("Failed to query local network interfaces", e);
        }

        result.sort((a, b) -> {
            if (a.isWifiOrHotspot() && !b.isWifiOrHotspot()) return -1;
            if (!a.isWifiOrHotspot() && b.isWifiOrHotspot()) return 1;
            if (!a.isLoopback() && b.isLoopback()) return -1;
            if (a.isLoopback() && !b.isLoopback()) return 1;
            return a.getName().compareTo(b.getName());
        });

        return result;
    }

    @Override
    public String getPrimaryNetworkUrl() {
        List<InterfaceAddressInfo> interfaces = getAvailableNetworkInterfaces();
        for (InterfaceAddressInfo info : interfaces) {
            if (!info.isLoopback()) {
                return info.getUrl();
            }
        }
        return "http://localhost:" + serverPort;
    }
}
