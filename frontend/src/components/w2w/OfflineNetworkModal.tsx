import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  api,
  type NetworkDiagnosticsResponse,
  type NetworkInfoResponse,
  type NetworkInterfaceDto,
} from '@/lib/api'
import {
  WifiHighIcon,
  GraduationCapIcon,
  LightningIcon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  ArrowsClockwiseIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react'

export type OfflineNetworkMode = 'campus' | 'hotspot'

interface OfflineNetworkModalProps {
  isOpen: boolean
  onClose: () => void
  selectedInterface?: NetworkInterfaceDto | null
  onSelectedInterfaceChange?: (iface: NetworkInterfaceDto | null) => void
}

export const OfflineNetworkModal: React.FC<OfflineNetworkModalProps> = ({
  isOpen,
  onClose,
  selectedInterface,
  onSelectedInterfaceChange,
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
    if (!isOpen) return
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
  }, [isOpen])

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-[#222222] bg-[#0f0f0f] text-white p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold">
              OFFLINE PROTOCOL SELECTOR
            </span>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Zero Internet Needed
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-extrabold font-sans text-white">
            Offline & Campus Sharing Hub
          </DialogTitle>
          <DialogDescription className="text-xs text-[#808080]">
            Configure your local network interface, test AP isolation, or generate Wi-Fi auto-join QR codes.
          </DialogDescription>
        </DialogHeader>

        {/* Dual Mode Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#141414] border border-[#262626] my-4">
          <button
            type="button"
            onClick={() => setMode('campus')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'campus'
                ? 'bg-gradient-to-r from-blue-600 to-[#7089ba] text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <GraduationCapIcon className="w-4 h-4" />
            <span>1. College Wi-Fi LAN</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('hotspot')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'hotspot'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <LightningIcon className="w-4 h-4" />
            <span>2. Offline Hotspot (Direct)</span>
          </button>
        </div>

        {/* Active Interface Quick Switcher */}
        {networkInfo?.interfaces && networkInfo.interfaces.length > 0 && (
          <div className="space-y-1.5 pb-3 border-b border-[#1c1c1c]">
            <span className="text-[11px] font-mono text-[#808080]">Select Active Network Adapter:</span>
            <div className="flex flex-wrap items-center gap-2">
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
                    <WifiHighIcon className="w-3 h-3 text-[#7089ba]" />
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
          </div>
        )}

        {/* MODE 1: COLLEGE WI-FI CONTENT */}
        {mode === 'campus' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 text-blue-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-400 font-sans">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Captive Portal Bypass (Zero Internet Login Required)</span>
              </div>
              <p className="text-blue-200/80 leading-relaxed text-xs">
                Your device has local IP <span className="font-mono text-white font-bold">{selectedInterface?.ip || '10.x.x.x'}</span>. The captive portal only blocks WAN internet; local subnet peer file transfers communicate directly without login.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Share Address */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#808080] uppercase tracking-wider">
                    Campus Share Link
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PORT 8080
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222222] hover:bg-[#333333] text-white text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedUrl ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#808080]">
                  Open this link on any phone or laptop on the same college Wi-Fi.
                </p>
              </div>

              {/* AP Isolation Diagnostics */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#808080] uppercase tracking-wider">
                    Isolation Probe
                  </span>
                  <button
                    type="button"
                    disabled={isRunningDiagnostics}
                    onClick={handleRunDiagnostics}
                    className="px-2 py-0.5 rounded bg-[#222] hover:bg-[#333] text-[10px] font-mono text-[#7089ba] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowsClockwiseIcon className={`w-3 h-3 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiagnostics ? 'Probing...' : 'Probe'}</span>
                  </button>
                </div>
                {diagnostics && (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                      <span className="text-[#808080] font-mono">Subnet Mode:</span>
                      <span className="font-mono text-white font-bold">{diagnostics.activeNetworkMode}</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                      <span className="text-[#808080] font-mono">Subnet Radar (8888):</span>
                      <span className={`font-mono font-bold ${diagnostics.udpDiscoveryActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {diagnostics.udpDiscoveryActive ? 'ACTIVE' : 'STANDALONE'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="pt-1 flex items-center justify-between text-[10px]">
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <WarningCircleIcon className="w-3 h-3" />
                    Packets blocked?
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode('hotspot')}
                    className="text-[#7089ba] hover:underline font-mono cursor-pointer"
                  >
                    Switch to Hotspot Mode →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: OFFLINE HOTSPOT CONTENT */}
        {mode === 'hotspot' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-400 font-sans">
                <LightningIcon className="w-4 h-4" />
                <span>100% Offline Hotspot (Zero Mobile Data / No Firewall Limits)</span>
              </div>
              <p className="text-amber-200/80 leading-relaxed text-xs">
                Turn on your hotspot with Mobile Data OFF. Devices connect directly via local Wi-Fi at 50–100+ MB/s.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Wi-Fi QR Generator */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#808080] uppercase tracking-wider flex items-center gap-1">
                    <QrCodeIcon className="w-3.5 h-3.5 text-amber-400" />
                    Auto-Connect Wi-Fi QR
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-[#808080] block mb-0.5">Hotspot SSID</label>
                    <input
                      type="text"
                      value={hotspotSsid}
                      onChange={(e) => setHotspotSsid(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#808080] block mb-0.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={hotspotPassword}
                        onChange={(e) => setHotspotPassword(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-2 py-1 text-xs font-mono text-white pr-6"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1.5 top-1.5 text-[#666] hover:text-white"
                      >
                        {showPassword ? <EyeSlashIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#808080] block mb-0.5">Auth Type</label>
                    <select
                      value={hotspotAuth}
                      onChange={(e) => setHotspotAuth(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-1.5 py-1 text-xs font-mono text-white"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="nopass">Open</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-[#1e1e1e]">
                  <div className="p-2 bg-white rounded-lg shrink-0 shadow">
                    <img src={wifiQrUrl} alt="Hotspot QR" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="space-y-1.5 text-[11px] text-[#aaa]">
                    <p className="font-semibold text-white">Scan with Camera:</p>
                    <p>Phone automatically joins {hotspotSsid}.</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`SSID: ${hotspotSsid} | Password: ${hotspotPassword}`)
                        setCopiedWifi(true)
                        setTimeout(() => setCopiedWifi(false), 2000)
                      }}
                      className="px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-white text-[10px] font-mono flex items-center gap-1"
                    >
                      {copiedWifi ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
                      <span>{copiedWifi ? 'Copied!' : 'Copy Wi-Fi'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* OS Guide */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2.5">
                <span className="text-[11px] font-mono text-[#808080] uppercase tracking-wider block">
                  Quick Setup Guide
                </span>
                <div className="flex items-center gap-1 p-0.5 bg-[#0a0a0a] rounded border border-[#222]">
                  {(['win', 'android', 'mac', 'ios'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveGuideTab(t)}
                      className={`flex-1 py-0.5 text-[10px] font-mono rounded ${
                        activeGuideTab === t ? 'bg-[#222] text-white font-bold' : 'text-[#666]'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-[#ccc] space-y-1 pt-1">
                  {activeGuideTab === 'win' && (
                    <>
                      <p className="text-white font-semibold">Windows Hotspot:</p>
                      <p>1. Open Settings → Network & Internet → Mobile Hotspot.</p>
                      <p>2. Turn Mobile Hotspot ON (Works offline!).</p>
                    </>
                  )}
                  {activeGuideTab === 'android' && (
                    <>
                      <p className="text-white font-semibold">Android Hotspot:</p>
                      <p>1. Turn Mobile Data OFF.</p>
                      <p>2. Enable Portable Hotspot in Settings.</p>
                    </>
                  )}
                  {activeGuideTab === 'mac' && (
                    <>
                      <p className="text-white font-semibold">macOS Sharing:</p>
                      <p>1. System Settings → General → Sharing → Internet Sharing.</p>
                    </>
                  )}
                  {activeGuideTab === 'ios' && (
                    <>
                      <p className="text-white font-semibold">iPhone Hotspot:</p>
                      <p>1. Settings → Personal Hotspot → Allow Others to Join.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
