package com.w2w.share.service;

import com.w2w.share.constant.AppConstants;
import com.w2w.share.dto.NetworkDiagnosticsResponse;
import com.w2w.share.dto.NetworkInfoResponse;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.*;
import java.util.*;

@Service
public class NetworkDiscoveryService implements INetworkDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(NetworkDiscoveryService.class);

    public static final String TYPE_HOTSPOT = "HOTSPOT";
    public static final String TYPE_STANDARD_LAN = "STANDARD_LAN";
    public static final String TYPE_CAMPUS_WIFI = "CAMPUS_WIFI";
    public static final String TYPE_ETHERNET = "ETHERNET";
    public static final String TYPE_LOOPBACK = "LOOPBACK";
    public static final String TYPE_OTHER = "OTHER";

    public static final String METHOD_1_HOTSPOT = "METHOD_1_HOTSPOT";
    public static final String METHOD_2_ROUTER_LAN = "METHOD_2_ROUTER_LAN";

    private static final String STR_HOTSPOT = "hotspot";
    private static final String STR_DIRECT = "direct";
    private static final String STR_WIFI = "wi-fi";

    @Getter
    public static class InterfaceAddressInfo {
        private final String name;
        private final String displayName;
        private final String ip;
        private final String url;
        private final boolean isLoopback;
        private final boolean isWifiOrHotspot;
        private final String interfaceType; // HOTSPOT, STANDARD_LAN, CAMPUS_WIFI, ETHERNET, LOOPBACK, OTHER

        public InterfaceAddressInfo(String name, String displayName, String ip, int port,
                                    boolean isLoopback, boolean isWifiOrHotspot, String interfaceType) {
            this.name = name;
            this.displayName = displayName;
            this.ip = ip;
            this.url = "http://" + ip + ":" + port;
            this.isLoopback = isLoopback;
            this.isWifiOrHotspot = isWifiOrHotspot;
            this.interfaceType = resolveInterfaceType(interfaceType, isWifiOrHotspot, isLoopback);
        }

        public InterfaceAddressInfo(String name, String displayName, String ip, int port, boolean isLoopback, boolean isWifiOrHotspot) {
            this(name, displayName, ip, port, isLoopback, isWifiOrHotspot, classifyType(name, displayName, ip, isLoopback, isWifiOrHotspot));
        }

        private static String resolveInterfaceType(String interfaceType, boolean isWifiOrHotspot, boolean isLoopback) {
            if (interfaceType != null) {
                return interfaceType;
            }
            if (isWifiOrHotspot) {
                return TYPE_STANDARD_LAN;
            }
            if (isLoopback) {
                return TYPE_LOOPBACK;
            }
            return TYPE_ETHERNET;
        }

    }

    @Value("${server.port:8080}")
    private int serverPort;

    @Override
    public List<InterfaceAddressInfo> getAvailableNetworkInterfaces() {
        List<InterfaceAddressInfo> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();

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
            return TYPE_LOOPBACK;
        }

        String lowerName = (name != null ? name : "").toLowerCase();
        String lowerDisplay = (displayName != null ? displayName : "").toLowerCase();

        if (isHotspotAddress(ip, lowerName, lowerDisplay)) {
            return TYPE_HOTSPOT;
        }

        if (isVpnOrVirtualInterface(lowerName, lowerDisplay)) {
            return TYPE_OTHER;
        }

        if (isWifi || lowerName.contains("wlan") || lowerDisplay.contains(STR_WIFI) || lowerDisplay.contains("wireless")) {
            if (ip.startsWith("10.")) {
                return TYPE_CAMPUS_WIFI;
            }
            return TYPE_STANDARD_LAN;
        }

        if (lowerName.contains("eth") || lowerName.contains("en") || lowerDisplay.contains("ethernet") || lowerDisplay.contains("lan")) {
            return TYPE_ETHERNET;
        }

        if (ip.startsWith("192.168.") || ip.startsWith("172.")) {
            return TYPE_STANDARD_LAN;
        }

        return TYPE_OTHER;
    }

    private static boolean isHotspotAddress(String ip, String lowerName, String lowerDisplay) {
        if (ip.startsWith("192.168.137.") || ip.startsWith("192.168.43.") || ip.startsWith("172.20.10.")) {
            return true;
        }
        return lowerName.contains(STR_HOTSPOT)
                || lowerDisplay.contains(STR_HOTSPOT)
                || lowerName.contains(STR_DIRECT)
                || lowerDisplay.contains(STR_DIRECT)
                || lowerName.contains("hostednetwork")
                || lowerName.contains("softap")
                || lowerName.startsWith("ap0");
    }

    private static boolean isVpnOrVirtualInterface(String lowerName, String lowerDisplay) {
        return lowerDisplay.contains("warp") || lowerDisplay.contains("vpn") || lowerDisplay.contains("tunnel")
                || lowerDisplay.contains("wireguard") || lowerName.startsWith("tap") || lowerName.startsWith("tun")
                || lowerDisplay.contains("docker") || lowerDisplay.contains("wsl")
                || lowerName.contains("veth") || lowerName.contains("docker");
    }

    private static boolean isWifiOrHotspotInterface(String name, String displayName) {
        String lowerName = name.toLowerCase();
        String lowerDisplay = displayName.toLowerCase();
        return lowerName.contains("wlan")
                || lowerName.contains(STR_WIFI)
                || lowerDisplay.contains("wireless")
                || lowerDisplay.contains(STR_WIFI)
                || lowerDisplay.contains(STR_HOTSPOT)
                || lowerDisplay.contains("hostednetwork")
                || lowerDisplay.contains(STR_DIRECT)
                || lowerName.contains("ap");
    }

    private static int compareInterfaces(InterfaceAddressInfo a, InterfaceAddressInfo b) {
        // Hotspot > Wi-Fi > Standard LAN > Campus Wi-Fi > Ethernet > Other > Loopback
        int priorityA = getPriority(a);
        int priorityB = getPriority(b);
        if (priorityA != priorityB) {
            return Integer.compare(priorityA, priorityB);
        }
        return Objects.toString(a.getName(), "").compareTo(Objects.toString(b.getName(), ""));
    }

    private static int getPriority(InterfaceAddressInfo info) {
        if (TYPE_HOTSPOT.equals(info.getInterfaceType())) return 1;
        if (info.isWifiOrHotspot()) return 2;
        if (TYPE_STANDARD_LAN.equals(info.getInterfaceType())) return 3;
        if (TYPE_CAMPUS_WIFI.equals(info.getInterfaceType())) return 4;
        if (TYPE_ETHERNET.equals(info.getInterfaceType())) return 5;
        if (TYPE_OTHER.equals(info.getInterfaceType())) return 6;
        if (info.isLoopback() || TYPE_LOOPBACK.equals(info.getInterfaceType())) return 8;
        return 7;
    }

    @Value("${w2w.public-url:}")
    private String publicUrl;

    @Override
    public String getPrimaryNetworkUrl() {
        if (publicUrl != null && !publicUrl.isBlank()) {
            String url = publicUrl.trim();
            while (url.endsWith("/")) {
                url = url.substring(0, url.length() - 1);
            }
            return url;
        }
        List<InterfaceAddressInfo> interfaces = getAvailableNetworkInterfaces();
        for (InterfaceAddressInfo info : interfaces) {
            if (!info.isLoopback()) {
                return info.getUrl();
            }
        }
        return "http://localhost:" + serverPort;
    }

    private record DiagnosticModeResolution(String activeMode, String recommendedMode, String apStatusMessage) {}

    private static DiagnosticModeResolution resolveDiagnosticMode(
            boolean hasHotspot, boolean hasStandardLan, boolean hasCampusWifi, boolean hasEthernet) {
        if (hasHotspot) {
            return new DiagnosticModeResolution(TYPE_HOTSPOT, METHOD_1_HOTSPOT,
                    "Active Mobile Hotspot detected (Method 1). 100% offline peer communication with zero AP isolation risk.");
        }
        if (hasStandardLan) {
            return new DiagnosticModeResolution(TYPE_STANDARD_LAN, METHOD_2_ROUTER_LAN,
                    "Connected to Standard Wi-Fi Router / Home LAN (Method 2). High local throughput. If router blocks peer packets, switch to Method 1 (Smartphone Hotspot).");
        }
        if (hasCampusWifi) {
            return new DiagnosticModeResolution(TYPE_CAMPUS_WIFI, METHOD_1_HOTSPOT,
                    "Connected to Campus/College Wi-Fi. Transfers work locally on LAN without captive portal internet login. If peers cannot connect due to AP Isolation, switch to Method 1 (Smartphone Personal Hotspot).");
        }
        if (hasEthernet) {
            return new DiagnosticModeResolution(TYPE_ETHERNET, METHOD_2_ROUTER_LAN,
                    "Wired LAN active (Method 2). Full throughput available.");
        }
        return new DiagnosticModeResolution("OFFLINE_LOCAL", METHOD_1_HOTSPOT,
                "No active Wi-Fi or Hotspot network detected. Enable Smartphone Personal Hotspot (Method 1) or connect to a Wi-Fi Router (Method 2).");
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

        boolean hasHotspot = interfaces.stream().anyMatch(i -> TYPE_HOTSPOT.equals(i.getInterfaceType()));
        boolean hasStandardLan = interfaces.stream().anyMatch(i -> TYPE_STANDARD_LAN.equals(i.getInterfaceType()));
        boolean hasCampusWifi = interfaces.stream().anyMatch(i -> TYPE_CAMPUS_WIFI.equals(i.getInterfaceType()));
        boolean hasEthernet = interfaces.stream().anyMatch(i -> TYPE_ETHERNET.equals(i.getInterfaceType()));

        DiagnosticModeResolution resolution = resolveDiagnosticMode(hasHotspot, hasStandardLan, hasCampusWifi, hasEthernet);
        String activeMode = resolution.activeMode();
        String recommendedMode = resolution.recommendedMode();
        boolean apIsolationSuspected = false;
        String apStatusMessage = resolution.apStatusMessage();

        // Test UDP discovery port availability with SO_REUSEADDR on DISCOVERY_PORT
        boolean udpDiscoveryActive;
        try (DatagramSocket testSocket = new DatagramSocket(null)) {
            testSocket.setReuseAddress(true);
            testSocket.bind(new InetSocketAddress(AppConstants.DISCOVERY_PORT));
            udpDiscoveryActive = true;
        } catch (Exception _) {
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

