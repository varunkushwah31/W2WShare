import React, { useState, useEffect } from 'react'
import { api, type DiscoveredPeer, type NetworkInfoResponse, type NetworkDiagnosticsResponse } from '@/lib/api'
import { OfflineNetworkModal } from './OfflineNetworkModal'
import {
  DesktopIcon,
  DeviceMobileIcon,
  WifiHighIcon,
  ArrowsClockwiseIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  LightningIcon,
} from '@phosphor-icons/react'

interface PeerRadarPanelProps {
  onSelectPeer?: (peer: DiscoveredPeer) => void
}

export const PeerRadarPanel: React.FC<PeerRadarPanelProps> = ({ onSelectPeer }) => {
  const [peers, setPeers] = useState<DiscoveredPeer[]>([])
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null)
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnosticsResponse | null>(null)
  const [scanning, setScanning] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [peersData, netData, diagData] = await Promise.all([
          api.getDiscoveredPeers(),
          api.getNetworkInfo(),
          api.getNetworkDiagnostics(),
        ])
        if (active) {
          setPeers(peersData)
          setNetworkInfo(netData)
          setDiagnostics(diagData)
          setScanning(false)
        }
      } catch {
        // Keep state
      }
    }

    load()
    const timer = setInterval(load, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleRefresh = async () => {
    setScanning(true)
    try {
      const [peersData, netData] = await Promise.all([
        api.getDiscoveredPeers(),
        api.getNetworkInfo(),
      ])
      setPeers(peersData)
      setNetworkInfo(netData)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Radar Visual Header Banner */}
      <div className="p-8 rounded-2xl bg-[#141414] border border-[#1c1c1c] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />

        {/* Left Info */}
        <div className="space-y-3 relative z-10 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7089ba]/10 border border-[#7089ba]/20 font-mono text-[10px] uppercase tracking-wider text-[#7089ba]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7089ba] animate-ping" />
            <span>AIRDROP-STYLE SUB-NETWORK BEACON</span>
          </div>

          <h3 className="text-2xl font-bold text-white font-sans">
            Subnet Peer Radar
          </h3>

          <p className="text-xs text-[#808080] leading-relaxed">
            Automatic UDP discovery broadcasts on port 8888 across your local Wi-Fi. Devices running W2WShare appear on your drafting table in real time.
          </p>

          {networkInfo && (
            <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#808080]">
              <span className="flex items-center gap-1 text-white">
                <WifiHighIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                {networkInfo.primaryUrl}
              </span>
              <span>·</span>
              <span>Uptime: {Math.floor(networkInfo.uptimeSeconds / 60)}m</span>
            </div>
          )}
        </div>

        {/* Right Radar Wireframe Scanner Widget */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
          {/* Concentric circles */}
          <div className="absolute inset-0 rounded-full border border-[#282828]" />
          <div className="absolute inset-6 rounded-full border border-[#202020] border-dashed" />
          <div className="absolute inset-14 rounded-full border border-[#1a1a1a]" />
          <div className="absolute inset-20 rounded-full border border-[#141414]" />

          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#1c1c1c]" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#1c1c1c]" />

          {/* Sweeper beam */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-[#7089ba]/10 to-transparent animate-spin duration-[4000ms]" />

          {/* Center Origin Node */}
          <div className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center relative z-10 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-[#7089ba]" />
          </div>

          {/* Peer blips on radar */}
          {peers.map((peer, idx) => {
            const angle = (idx * 95 * Math.PI) / 180
            const radius = 60 + (idx % 3) * 15
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return (
              <div
                key={peer.deviceId}
                className="absolute w-3 h-3 rounded-full bg-[#7089ba] border-2 border-white animate-pulse"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                title={peer.deviceName}
              />
            )
          })}
        </div>
      </div>

      {/* Discovered Peers List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-[#808080] uppercase tracking-wider">
            DISCOVERED PEER HARDWARE ({peers.length})
          </div>
          <button
            onClick={handleRefresh}
            type='button'
            className="flex items-center gap-1.5 text-xs text-[#808080] hover:text-white transition-colors"
          >
            <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>Refresh Scan</span>
          </button>
        </div>

        {peers.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#141414] border border-[#1c1c1c] text-center space-y-3">
            <WifiHighIcon className="w-10 h-10 text-[#4d4d4d] mx-auto animate-pulse" />
            <div className="text-sm font-semibold text-white">
              Searching for peers on your local Wi-Fi subnet...
            </div>
            <p className="text-xs text-[#808080] max-w-sm mx-auto">
              Open W2WShare on your phone, laptop, or another browser tab on the same local network to auto-connect.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {peers.map((peer) => {
              const isMobile = peer.os?.toLowerCase().includes('android') || peer.os?.toLowerCase().includes('ios')
              return (
                <div
                  key={peer.deviceId}
                  className="p-4 rounded-xl bg-[#141414] border border-[#1c1c1c] hover:border-[#2a2a2a] transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center text-[#7089ba] shrink-0">
                      {isMobile ? <DeviceMobileIcon className="w-5 h-5" /> : <DesktopIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white font-sans">
                        {peer.deviceName || 'Local Device'}
                      </div>
                      <div className="text-[11px] text-[#808080] font-mono flex items-center gap-2">
                        <span>{peer.ip}</span>
                        <span>·</span>
                        <span>{peer.os || 'OS Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectPeer?.(peer)}
                    type='button'
                    className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all flex items-center gap-1 shrink-0"
                  >
                    <span>Connect</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Local Network Interfaces Info Table */}
      {networkInfo?.interfaces && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-3">
          <div className="text-xs font-mono text-[#808080] uppercase tracking-wider flex items-center justify-between">
            <span>NETWORK INTERFACE TOPOLOGY</span>
            <span className="text-[#7089ba] flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              100% OFFLINE READY
            </span>
          </div>

          {diagnostics && (
            <div className="p-3 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f] text-xs font-mono flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[#808080]">Subnet Mode: </span>
                  <span className="text-white font-bold">{diagnostics.activeNetworkMode}</span>
                </div>
                <div>
                  <span className="text-[#808080]">Radar UDP (8888): </span>
                  <span className={`font-bold ${diagnostics.udpDiscoveryActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {diagnostics.udpDiscoveryActive ? 'ACTIVE' : 'STANDALONE'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-[#222] hover:bg-[#333] text-white text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer border border-[#333]"
              >
                <LightningIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Hotspot & Campus Config</span>
              </button>
            </div>
          )}

          <div className="divide-y divide-[#1c1c1c]">
            {networkInfo.interfaces.map((iface, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{iface.displayName || iface.name}</span>
                  {iface.isWifiOrHotspot && (
                    <span className="text-[9px] bg-[#7089ba]/10 text-[#7089ba] px-1.5 py-0.2 rounded border border-[#7089ba]/20">
                      WIFI / HOTSPOT
                    </span>
                  )}
                  {iface.isLoopback && (
                    <span className="text-[9px] bg-[#1c1c1c] text-[#808080] px-1.5 py-0.2 rounded border border-[#282828]">
                      LOOPBACK
                    </span>
                  )}
                </div>
                <div className="text-[#808080]">{iface.ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Network & Hotspot Modal */}
      <OfflineNetworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
