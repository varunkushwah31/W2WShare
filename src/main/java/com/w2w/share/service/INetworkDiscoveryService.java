package com.w2w.share.service;

import java.util.List;

public interface INetworkDiscoveryService {

    List<NetworkDiscoveryService.InterfaceAddressInfo> getAvailableNetworkInterfaces();

    String getPrimaryNetworkUrl();
}
