package com.w2w.share.service;

import com.w2w.share.constant.AppConstants;
import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.dto.NetworkInfoResponse;
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
        private final String interfaceType; // HOTSPOT, CAMPUS_WIFI, ETHERNET, LOOPBACK, OTHER

        public InterfaceAddressInfo(String name, String displayName, String ip, int port,
                                    boolean isLoopback, boolean isWifiOrHotspot, String interfaceType) {
            this.name = name;
            this.displayName = displayName;
            this.ip = ip;
            this.url = "http://" + ip + ":" + port;
            this.isLoopback = isLoopback;
            this.isWifiOrHotspot = isWifiOrHotspot;
            this.interfaceType = interfaceType != null ? interfaceType : (isWifiOrHotspot ? "CAMPUS_WIFI" : (isLoopback ? "LOOPBACK" : "ETHERNET"));
        }

        public InterfaceAddressInfo(String name, String displayName, String ip, int port, boolean isLoopback, boolean isWifiOrHotspot) {
            this(name, displayName, ip, port, isLoopback, isWifiOrHotspot, classifyType(name, displayName, ip, isLoopback, isWifiOrHotspot));
        }

        public String getName() { return name; }
        public String getDisplayName() { return displayName; }
        public String getIp() { return ip; }
        public String getUrl() { return url; }
        public boolean isLoopback() { return isLoopback; }
        public boolean isWifiOrHotspot() { return isWifiOrHotspot; }
        public String getInterfaceType() { return interfaceType; }
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
                String ip = addr.getHostAddress();
                boolean isLoopback = addr.isLoopbackAddress();
                String type = classifyType(ifaceName, ifaceDisplayName, ip, isLoopback, isWifi);

                result.add(new InterfaceAddressInfo(
                        ifaceName,
                        ifaceDisplayName,
                        ip,
                        serverPort,
                        isLoopback,
                        isWifi,
                        type
                ));
            }
        }
    }

    public static String classifyType(String name, String displayName, String ip, boolean isLoopback, boolean isWifi) {
        if (isLoopback || "127.0.0.1".equals(ip)) {
            return "LOOPBACK";
        }

        String lowerName = (name != null ? name : "").toLowerCase();
        String lowerDisplay = (displayName != null ? displayName : "").toLowerCase();

        // Hotspot indicators
        if (ip.startsWith("192.168.137.") // Windows Mobile Hotspot
                || ip.startsWith("192.168.43.") // Android Hotspot
                || ip.startsWith("172.20.10.") // iOS Hotspot
                || lowerName.contains("hotspot")
                || lowerDisplay.contains("hotspot")
                || lowerName.contains("direct")
                || lowerDisplay.contains("direct")
                || lowerName.contains("hostednetwork")
                || lowerName.contains("softap")
                || lowerName.contains("ap0")) {
            return "HOTSPOT";
        }

        if (isWifi || lowerName.contains("wlan") || lowerDisplay.contains("wi-fi") || lowerDisplay.contains("wireless")) {
            return "CAMPUS_WIFI";
        }

        if (lowerName.contains("eth") || lowerName.contains("en") || lowerDisplay.contains("ethernet") || lowerDisplay.contains("lan")) {
            return "ETHERNET";
        }

        return "OTHER";
    }

    private static boolean isWifiOrHotspotInterface(String name, String displayName) {
        String lowerName = name.toLowerCase();
        String lowerDisplay = displayName.toLowerCase();
        return lowerName.contains("wlan")
                || lowerName.contains("wi-fi")
                || lowerDisplay.contains("wireless")
                || lowerDisplay.contains("wi-fi")
                || lowerDisplay.contains("hotspot")
                || lowerDisplay.contains("hostednetwork")
                || lowerDisplay.contains("direct")
                || lowerName.contains("ap");
    }

    private static int compareInterfaces(InterfaceAddressInfo a, InterfaceAddressInfo b) {
        // Hotspot > Campus Wi-Fi > Ethernet > Loopback
        int priorityA = getPriority(a);
        int priorityB = getPriority(b);
        if (priorityA != priorityB) {
            return Integer.compare(priorityA, priorityB);
        }
        return Objects.toString(a.getName(), "").compareTo(Objects.toString(b.getName(), ""));
    }

    private static int getPriority(InterfaceAddressInfo info) {
        if ("HOTSPOT".equals(info.getInterfaceType())) return 1;
        if ("CAMPUS_WIFI".equals(info.getInterfaceType()) || info.isWifiOrHotspot()) return 2;
        if ("ETHERNET".equals(info.getInterfaceType())) return 3;
        if (info.isLoopback() || "LOOPBACK".equals(info.getInterfaceType())) return 5;
        return 4;
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

    @Override
    public NetworkDiagnosticsResponse runNetworkDiagnostics() {
        List<InterfaceAddressInfo> interfaces = getAvailableNetworkInterfaces();
        List<NetworkInfoResponse.InterfaceDto> dtos = interfaces.stream()
                .map(i -> new NetworkInfoResponse.InterfaceDto(
                        i.getName(),
                        i.getDisplayName(),
                        i.getIp(),
                        i.getUrl(),
                        i.isLoopback(),
                        i.isWifiOrHotspot(),
                        i.getInterfaceType()
                ))
                .toList();

        boolean hasHotspot = interfaces.stream().anyMatch(i -> "HOTSPOT".equals(i.getInterfaceType()));
        boolean hasCampusWifi = interfaces.stream().anyMatch(i -> "CAMPUS_WIFI".equals(i.getInterfaceType()));
        boolean hasEthernet = interfaces.stream().anyMatch(i -> "ETHERNET".equals(i.getInterfaceType()));

        String activeMode;
        String recommendedMode;
        boolean apIsolationSuspected = false;
        String apStatusMessage;

        if (hasHotspot) {
            activeMode = "HOTSPOT";
            recommendedMode = "OFFLINE_HOTSPOT";
            apStatusMessage = "Active Mobile Hotspot detected. 100% offline peer communication with zero AP isolation risk.";
        } else if (hasCampusWifi) {
            activeMode = "CAMPUS_WIFI";
            recommendedMode = "CAMPUS_WIFI";
            apStatusMessage = "Connected to Campus/College Wi-Fi. Transfers work locally on LAN without captive portal internet login. If peers cannot connect, switch to Offline Hotspot mode to bypass AP Isolation.";
        } else if (hasEthernet) {
            activeMode = "ETHERNET";
            recommendedMode = "ETHERNET";
            apStatusMessage = "Wired LAN active. Full throughput available.";
        } else {
            activeMode = "OFFLINE_LOCAL";
            recommendedMode = "OFFLINE_HOTSPOT";
            apStatusMessage = "No active Wi-Fi or Hotspot network detected. Enable Windows Mobile Hotspot or Phone Hotspot for peer sharing.";
        }

        // Test UDP discovery port availability
        boolean udpDiscoveryActive = true;
        try (DatagramSocket testSocket = new DatagramSocket()) {
            testSocket.setReuseAddress(true);
        } catch (Exception e) {
            udpDiscoveryActive = false;
        }

        String primaryUrl = getPrimaryNetworkUrl();
        String localIp = interfaces.stream()
                .filter(i -> !i.isLoopback())
                .map(InterfaceAddressInfo::getIp)
                .findFirst()
                .orElse("127.0.0.1");

        return new NetworkDiagnosticsResponse(
                activeMode,
                udpDiscoveryActive,
                AppConstants.DISCOVERY_PORT,
                apIsolationSuspected,
                apStatusMessage,
                recommendedMode,
                dtos,
                localIp,
                primaryUrl
        );
    }
}

