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
                if (iface.isUp() && !iface.isVirtual()) {
                    processNetworkInterface(iface, result);
                }
            }
        } catch (SocketException e) {
            log.error("Failed to query local network interfaces", e);
        }

        result.sort(NetworkDiscoveryService::compareInterfaces);
        return result;
    }

    private void processNetworkInterface(NetworkInterface iface, List<InterfaceAddressInfo> result) {
        String ifaceName = iface.getName() != null ? iface.getName() : "eth";
        String ifaceDisplayName = iface.getDisplayName() != null ? iface.getDisplayName() : ifaceName;
        boolean isWifi = isWifiOrHotspotInterface(ifaceName, ifaceDisplayName);

        Enumeration<InetAddress> addresses = iface.getInetAddresses();
        while (addresses.hasMoreElements()) {
            InetAddress addr = addresses.nextElement();
            if (addr instanceof Inet4Address) {
                result.add(new InterfaceAddressInfo(
                        ifaceName,
                        ifaceDisplayName,
                        addr.getHostAddress(),
                        serverPort,
                        addr.isLoopbackAddress(),
                        isWifi
                ));
            }
        }
    }

    private static boolean isWifiOrHotspotInterface(String name, String displayName) {
        String lowerName = name.toLowerCase();
        String lowerDisplay = displayName.toLowerCase();
        return lowerName.contains("wlan")
                || lowerName.contains("wi-fi")
                || lowerDisplay.contains("wireless")
                || lowerDisplay.contains("wi-fi")
                || lowerName.contains("ap");
    }

    private static int compareInterfaces(InterfaceAddressInfo a, InterfaceAddressInfo b) {
        if (a.isWifiOrHotspot() && !b.isWifiOrHotspot()) return -1;
        if (!a.isWifiOrHotspot() && b.isWifiOrHotspot()) return 1;
        if (!a.isLoopback() && b.isLoopback()) return -1;
        if (a.isLoopback() && !b.isLoopback()) return 1;
        return Objects.toString(a.getName(), "").compareTo(Objects.toString(b.getName(), ""));
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
