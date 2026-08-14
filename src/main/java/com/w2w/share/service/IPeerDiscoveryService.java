package com.w2w.share.service;

import java.util.List;

public interface IPeerDiscoveryService {

    void start();

    void stop();

    void broadcastAnnouncement();

    void evictStalePeers();

    List<PeerDiscoveryService.DiscoveredPeer> getDiscoveredPeers();
}
