import React, { useState, useEffect } from 'react'
import {
  api,
  type NetworkDiagnosticsResponse,
  type NetworkInfoResponse,
  type NetworkInterfaceDto,
} from '@/lib/api'
import {
  WifiHigh,
  GraduationCap,
  Lightning,
  QrCode,
  Copy,
  Check,
  ArrowsClockwise,
  WarningCircle,
  CheckCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'

export type OfflineNetworkMode = 'campus' | 'hotspot'

interface OfflineSharingHubProps {
  onSelectedInterfaceChange?: (iface: NetworkInterfaceDto | null) => void
  selectedInterface?: NetworkInterfaceDto | null
}

export const OfflineSharingHub: React.FC<OfflineSharingHubProps> = ({
  onSelectedInterfaceChange,
  selectedInterface,
}) => {
  const [mode, setMode] = useState<OfflineNetworkMode>('campus')
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null)
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnosticsResponse | null>(null)
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedWifi, setCopiedWifi] = useState(false)

  // Hotspot generator inputs
  const [hotspotSsid, setHotspotSsid] = useState('W2W-Offline-Share')
  const [hotspotPassword, setHotspotPassword] = useState('offline1234')
  const [hotspotAuth, setHotspotAuth] = useState('WPA')
  const [showPassword, setShowPassword] = useState(false)
  const [activeGuideTab, setActiveGuideTab] = useState<'win' | 'android' | 'mac' | 'ios'>('win')

  useEffect(() => {
    let active = true
    const fetchNet = async () => {
      try {
        const [net, diag] = await Promise.all([
          api.getNetworkInfo(),
          api.getNetworkDiagnostics(),
        ])
        if (active) {
          setNetworkInfo(net)
          setDiagnostics(diag)
          if (diag.activeNetworkMode === 'HOTSPOT') {
            setMode('hotspot')
          }
          // Default selected interface if not chosen
          if (!selectedInterface && net.interfaces.length > 0) {
            const preferred = net.interfaces.find((i) => !i.isLoopback) || net.interfaces[0]
            onSelectedInterfaceChange?.(preferred)
          }
        }
      } catch {
        // standalone mode fallback
      }
    }

    fetchNet()
  }, [])

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true)
    try {
      const diag = await api.getNetworkDiagnostics()
      const net = await api.getNetworkInfo()
      setDiagnostics(diag)
      setNetworkInfo(net)
    } finally {
      setTimeout(() => setIsRunningDiagnostics(false), 500)
    }
  }

  const activeUrl = selectedInterface?.url || networkInfo?.primaryUrl || 'http://localhost:8080'

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const wifiQrUrl = api.getWifiQrUrl(hotspotSsid, hotspotPassword, hotspotAuth, 360)

  return (
    <div className="w-full rounded-2xl bg-[#0f0f0f] border border-[#222222] p-5 sm:p-7 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background Tech Mesh */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#7089ba]/5 via-transparent to-transparent pointer-events-none" />

      {/* Header & Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1c1c1c] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold">
              OFFLINE PROTOCOL SELECTOR
            </span>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Zero Internet Needed
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white font-sans">
            Offline & Campus Sharing Hub
          </h3>
        </div>

        {/* Dual Mode Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#141414] border border-[#262626] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMode('campus')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'campus'
                ? 'bg-gradient-to-r from-blue-600 to-[#7089ba] text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>1. College Wi-Fi LAN</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('hotspot')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'hotspot'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <Lightning className="w-4 h-4" />
            <span>2. Offline Hotspot (Direct)</span>
          </button>
        </div>
      </div>

      {/* Active Interface Quick Switcher */}
      {networkInfo && networkInfo.interfaces && networkInfo.interfaces.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-[#181818] text-xs font-mono">
          <span className="text-[#808080]">Active Network Interface:</span>
          {networkInfo.interfaces.map((iface) => {
            const isSelected = selectedInterface?.ip === iface.ip
            return (
              <button
                key={iface.ip}
                type="button"
                onClick={() => onSelectedInterfaceChange?.(iface)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#1e293b] border-[#7089ba] text-white font-semibold'
                    : 'bg-[#141414] border-[#222222] text-[#808080] hover:text-white hover:border-[#333333]'
                }`}
              >
                <WifiHigh className="w-3 h-3 text-[#7089ba]" />
                <span>{iface.displayName || iface.name}</span>
                <span className="text-[#7089ba] font-bold">({iface.ip})</span>
                {iface.interfaceType && (
                  <span className="text-[9px] px-1 rounded bg-[#222] text-[#aaa]">
                    {iface.interfaceType}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* MODE 1: COLLEGE WI-FI CONTENT */}
      {mode === 'campus' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Insight Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-blue-950/20 border border-blue-900/30 text-blue-200 text-xs sm:text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-400 font-sans">
              <CheckCircle className="w-4 h-4" />
              <span>Captive Portal Bypass Active (Zero Internet Login Required)</span>
            </div>
            <p className="text-blue-200/80 leading-relaxed text-xs">
              When connected to College Wi-Fi, your device receives a local private IP address (e.g. <span className="font-mono text-white font-bold">{selectedInterface?.ip || '10.x.x.x'}</span>). The captive portal login gate only restricts WAN internet; <strong>local subnet file transfers work directly between peers without login</strong>.
            </p>
          </div>

          {/* College Mode Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Direct Access URL Card */}
            <div className="p-5 rounded-xl bg-[#141414] border border-[#222222] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#808080] uppercase tracking-wider">
                  Campus Share Address
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  HTTP PORT 8080
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activeUrl}
                  className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-white select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-lg bg-[#222222] hover:bg-[#333333] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-[11px] text-[#808080] leading-relaxed">
                Senders and receivers connected to the same college Wi-Fi can open this link directly in Chrome, Safari, Firefox, or Edge.
              </p>
            </div>

            {/* Right: AP Isolation Diagnostics Card */}
            <div className="p-5 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#808080] uppercase tracking-wider">
                  Network Diagnostics & Isolation Probe
                </span>
                <button
                  type="button"
                  disabled={isRunningDiagnostics}
                  onClick={handleRunDiagnostics}
                  className="px-2.5 py-1 rounded bg-[#222] hover:bg-[#333] text-[11px] font-mono text-[#7089ba] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowsClockwise className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                  <span>{isRunningDiagnostics ? 'Testing...' : 'Test Network'}</span>
                </button>
              </div>

              {diagnostics && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                    <span className="text-[#808080] font-mono">Active Subnet Mode:</span>
                    <span className="font-mono text-white font-bold">{diagnostics.activeNetworkMode}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                    <span className="text-[#808080] font-mono">UDP Subnet Radar (8888):</span>
                    <span className={`font-mono font-bold ${diagnostics.udpDiscoveryActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {diagnostics.udpDiscoveryActive ? 'ACTIVE & BOUND' : 'STANDALONE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#aaa] pt-1">
                    {diagnostics.apIsolationStatusMessage}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-[11px]">
                <span className="text-amber-400/90 flex items-center gap-1">
                  <WarningCircle className="w-3.5 h-3.5" />
                  College AP Isolation blocking packets?
                </span>
                <button
                  type="button"
                  onClick={() => setMode('hotspot')}
                  className="text-[#7089ba] hover:underline font-mono cursor-pointer"
                >
                  Switch to Hotspot Mode &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: 100% OFFLINE HOTSPOT CONTENT */}
      {mode === 'hotspot' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Insight Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-amber-200 text-xs sm:text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 font-sans">
              <Lightning className="w-4 h-4" />
              <span>100% Offline Hotspot Mode (Zero Mobile Data / No College Firewall)</span>
            </div>
            <p className="text-amber-200/80 leading-relaxed text-xs">
              Turn on your laptop or phone hotspot with <strong>Mobile Data switched OFF</strong>. Devices connect directly via local Wi-Fi at maximum hardware speed (50–100+ MB/s) with 0 data consumed and zero firewall restrictions.
            </p>
          </div>

          {/* Hotspot Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Quick Wi-Fi Auto-Connect QR Generator (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-xl bg-[#141414] border border-[#222222] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#808080] uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  Wi-Fi Auto-Connect QR Generator
                </span>
                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Scan $\to$ Auto Connect
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SSID Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#808080]">Hotspot Network Name (SSID)</label>
                  <input
                    type="text"
                    value={hotspotSsid}
                    onChange={(e) => setHotspotSsid(e.target.value)}
                    placeholder="e.g. MyLaptopHotspot"
                    className="w-full bg-[#0a0a0a] border border-[#282828] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-[#7089ba] focus:outline-none"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#808080]">Hotspot Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={hotspotPassword}
                      onChange={(e) => setHotspotPassword(e.target.value)}
                      placeholder="Leave blank if open"
                      className="w-full bg-[#0a0a0a] border border-[#282828] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-[#7089ba] focus:outline-none pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-[#666] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#808080]">Security Type</label>
                  <select
                    value={hotspotAuth}
                    onChange={(e) => setHotspotAuth(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#282828] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-[#7089ba] focus:outline-none cursor-pointer"
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="nopass">Open (No Password)</option>
                  </select>
                </div>
              </div>

              {/* QR Preview & Steps */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-2 border-t border-[#1e1e1e]">
                {/* High Contrast Wi-Fi QR Card */}
                <div className="p-2.5 bg-white rounded-xl shadow-lg shrink-0">
                  <img
                    src={wifiQrUrl}
                    alt="Wi-Fi Hotspot Auto-Connect QR"
                    width={130}
                    height={130}
                    className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                  />
                </div>

                <div className="space-y-2 text-xs w-full">
                  <div className="font-semibold text-white">How receivers join in 2 seconds:</div>
                  <ol className="list-decimal list-inside space-y-1 text-[#aaa] text-[11px]">
                    <li>Open phone camera and point at the QR on the left.</li>
                    <li>Tap <strong className="text-white">"Join {hotspotSsid}"</strong> pop-up.</li>
                    <li>Then open <span className="font-mono text-[#7089ba]">{activeUrl}</span> to receive or send files.</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`SSID: ${hotspotSsid} | Password: ${hotspotPassword}`)
                      setCopiedWifi(true)
                      setTimeout(() => setCopiedWifi(false), 2000)
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-white text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedWifi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWifi ? 'Wi-Fi Details Copied!' : 'Copy Wi-Fi Info'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Step-by-Step Hotspot Setup Guide (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#808080] uppercase tracking-wider">
                  Hotspot Setup Guide
                </span>
                <span className="text-[10px] font-mono text-[#808080]">No Data Needed</span>
              </div>

              {/* OS Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#0a0a0a] rounded-lg border border-[#222]">
                {(
                  [
                    { id: 'win', label: 'Windows' },
                    { id: 'android', label: 'Android' },
                    { id: 'mac', label: 'macOS' },
                    { id: 'ios', label: 'iOS' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveGuideTab(t.id)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded transition-all cursor-pointer ${
                      activeGuideTab === t.id
                        ? 'bg-[#222] text-white font-bold'
                        : 'text-[#666] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Guide Contents */}
              <div className="text-[11px] text-[#ccc] space-y-2 min-h-[140px] pt-1">
                {activeGuideTab === 'win' && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Windows 11 / 10 Hotspot:</p>
                    <p>1. Open <strong className="text-white">Settings $\to$ Network & Internet $\to$ Mobile Hotspot</strong>.</p>
                    <p>2. Toggle <strong className="text-emerald-400">Mobile Hotspot: ON</strong>.</p>
                    <p>3. Note: Even if you have no internet connected, Windows will host the local Wi-Fi subnet (<code className="text-[#7089ba]">192.168.137.1</code>).</p>
                  </div>
                )}

                {activeGuideTab === 'android' && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">Android Portable Hotspot:</p>
                    <p>1. Turn <strong className="text-amber-400">Mobile Data: OFF</strong> (to protect mobile data plan).</p>
                    <p>2. Go to <strong className="text-white">Settings $\to$ Portable Hotspot / Tethering</strong> and turn ON.</p>
                    <p>3. Other phones/laptops connect to this hotspot for high-speed offline transfers.</p>
                  </div>
                )}

                {activeGuideTab === 'mac' && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">macOS Wi-Fi Sharing:</p>
                    <p>1. Open <strong className="text-white">System Settings $\to$ General $\to$ Sharing</strong>.</p>
                    <p>2. Enable <strong className="text-white">Internet Sharing</strong> via Wi-Fi.</p>
                    <p>3. Devices connect locally over the Mac's wireless interface.</p>
                  </div>
                )}

                {activeGuideTab === 'ios' && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">iPhone Personal Hotspot:</p>
                    <p>1. Open <strong className="text-white">Settings $\to$ Personal Hotspot</strong>.</p>
                    <p>2. Toggle <strong className="text-white">Allow Others to Join: ON</strong>.</p>
                    <p>3. Connect sender and receiver to this network.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
