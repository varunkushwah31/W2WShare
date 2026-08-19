package com.w2w.share.service;

import com.w2w.share.dto.NetworkDiagnosticsResponse;
import java.util.List;

public interface INetworkDiscoveryService {

    List<NetworkDiscoveryService.InterfaceAddressInfo> getAvailableNetworkInterfaces();

    String getPrimaryNetworkUrl();

    NetworkDiagnosticsResponse runNetworkDiagnostics();
}

