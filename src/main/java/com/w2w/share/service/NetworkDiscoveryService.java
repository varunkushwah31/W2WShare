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

        // Hotspot indicators
        if (ip.startsWith("192.168.137.") // Windows Mobile Hotspot
                || ip.startsWith("192.168.43.") // Android Hotspot
                || ip.startsWith("172.20.10.") // iOS Hotspot
                || lowerName.contains(STR_HOTSPOT)
                || lowerDisplay.contains(STR_HOTSPOT)
                || lowerName.contains(STR_DIRECT)
                || lowerDisplay.contains(STR_DIRECT)
                || lowerName.contains("hostednetwork")
                || lowerName.contains("softap")
                || lowerName.contains("ap0")) {
            return TYPE_HOTSPOT;
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
        // Hotspot > Standard LAN > Campus Wi-Fi > Ethernet > Loopback
        int priorityA = getPriority(a);
        int priorityB = getPriority(b);
        if (priorityA != priorityB) {
            return Integer.compare(priorityA, priorityB);
        }
        return Objects.toString(a.getName(), "").compareTo(Objects.toString(b.getName(), ""));
    }

    private static int getPriority(InterfaceAddressInfo info) {
        if (TYPE_HOTSPOT.equals(info.getInterfaceType())) return 1;
        if (TYPE_STANDARD_LAN.equals(info.getInterfaceType())) return 2;
        if (TYPE_CAMPUS_WIFI.equals(info.getInterfaceType()) || info.isWifiOrHotspot()) return 3;
        if (TYPE_ETHERNET.equals(info.getInterfaceType())) return 4;
        if (info.isLoopback() || TYPE_LOOPBACK.equals(info.getInterfaceType())) return 6;
        return 5;
    }

    @Value("${w2w.public-url:}")
    private String publicUrl;

    @Override
    public String getPrimaryNetworkUrl() {
        if (publicUrl != null && !publicUrl.isBlank()) {
            return publicUrl.replaceAll("/+$", "");
        }
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

        boolean hasHotspot = interfaces.stream().anyMatch(i -> TYPE_HOTSPOT.equals(i.getInterfaceType()));
        boolean hasStandardLan = interfaces.stream().anyMatch(i -> TYPE_STANDARD_LAN.equals(i.getInterfaceType()));
        boolean hasCampusWifi = interfaces.stream().anyMatch(i -> TYPE_CAMPUS_WIFI.equals(i.getInterfaceType()));
        boolean hasEthernet = interfaces.stream().anyMatch(i -> TYPE_ETHERNET.equals(i.getInterfaceType()));

        String activeMode;
        String recommendedMode;
        boolean apIsolationSuspected = false;
        String apStatusMessage;

        if (hasHotspot) {
            activeMode = TYPE_HOTSPOT;
            recommendedMode = "METHOD_1_HOTSPOT";
            apStatusMessage = "Active Mobile Hotspot detected (Method 1). 100% offline peer communication with zero AP isolation risk.";
        } else if (hasStandardLan) {
            activeMode = TYPE_STANDARD_LAN;
            recommendedMode = "METHOD_2_ROUTER_LAN";
            apStatusMessage = "Connected to Standard Wi-Fi Router / Home LAN (Method 2). High local throughput. If router blocks peer packets, switch to Method 1 (Smartphone Hotspot).";
        } else if (hasCampusWifi) {
            activeMode = TYPE_CAMPUS_WIFI;
            recommendedMode = "METHOD_1_HOTSPOT";
            apStatusMessage = "Connected to Campus/College Wi-Fi. Transfers work locally on LAN without captive portal internet login. If peers cannot connect due to AP Isolation, switch to Method 1 (Smartphone Personal Hotspot).";
        } else if (hasEthernet) {
            activeMode = TYPE_ETHERNET;
            recommendedMode = "METHOD_2_ROUTER_LAN";
            apStatusMessage = "Wired LAN active (Method 2). Full throughput available.";
        } else {
            activeMode = "OFFLINE_LOCAL";
            recommendedMode = "METHOD_1_HOTSPOT";
            apStatusMessage = "No active Wi-Fi or Hotspot network detected. Enable Smartphone Personal Hotspot (Method 1) or connect to a Wi-Fi Router (Method 2).";
        }

        // Test UDP discovery port availability
        boolean udpDiscoveryActive = true;
        try (DatagramSocket testSocket = new DatagramSocket()) {
            testSocket.setReuseAddress(true);
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

