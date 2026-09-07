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
import { QRCodeDisplay } from './QRCodeDisplay'
import {
  WifiHighIcon,
  LightningIcon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  ArrowsClockwiseIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  DeviceMobileIcon,
  HouseLineIcon,
  BroadcastIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'

export type OfflineNetworkMode = 'hotspot' | 'router-lan' | 'campus'

interface OfflineNetworkModalProps {
  isOpen: boolean
  onClose: () => void
  selectedInterface?: NetworkInterfaceDto | null
  onSelectedInterfaceChange?: (iface: NetworkInterfaceDto | null) => void
  initialMode?: OfflineNetworkMode
}

function getInterfaceMethodBadge(iface: NetworkInterfaceDto) {
  const isHotspot =
    iface.interfaceType === 'HOTSPOT' ||
    iface.ip.startsWith('192.168.43.') ||
    iface.ip.startsWith('172.20.10.') ||
    iface.ip.startsWith('192.168.137.')
  if (isHotspot) {
    return (
      <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold">
        Method 1: Hotspot
      </span>
    )
  }
  if (iface.interfaceType === 'STANDARD_LAN') {
    return (
      <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-400 font-bold">
        Method 2: Router LAN
      </span>
    )
  }
  if (iface.interfaceType) {
    return (
      <span className="text-[9px] px-1 rounded bg-[#222] text-[#aaa]">
        {iface.interfaceType}
      </span>
    )
  }
  return null
}

function getOsGuideLabel(tab: 'android' | 'ios' | 'win' | 'mac'): string {
  switch (tab) {
    case 'android':
      return 'Android'
    case 'ios':
      return 'iPhone / iPad'
    case 'win':
      return 'Windows'
    case 'mac':
      return 'macOS'
  }
}

interface Method1HotspotSectionProps {
  selectedInterface?: NetworkInterfaceDto | null
  activeUrl: string
  isHotspotIp: boolean
  hotspotSsid: string
  setHotspotSsid: (val: string) => void
  hotspotPassword: string
  setHotspotPassword: (val: string) => void
  hotspotAuth: string
  setHotspotAuth: (val: string) => void
  showPassword: boolean
  setShowPassword: (val: boolean) => void
  wifiQrPayload: string
  copiedWifi: boolean
  setCopiedWifi: (val: boolean) => void
  copiedUrl: boolean
  handleCopyUrl: () => void
  activeGuideTab: 'android' | 'ios' | 'win' | 'mac'
  setActiveGuideTab: (tab: 'android' | 'ios' | 'win' | 'mac') => void
}

const Method1HotspotSection: React.FC<Method1HotspotSectionProps> = ({
  selectedInterface,
  activeUrl,
  isHotspotIp,
  hotspotSsid,
  setHotspotSsid,
  hotspotPassword,
  setHotspotPassword,
  hotspotAuth,
  setHotspotAuth,
  showPassword,
  setShowPassword,
  wifiQrPayload,
  copiedWifi,
  setCopiedWifi,
  copiedUrl,
  handleCopyUrl,
  activeGuideTab,
  setActiveGuideTab,
}) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200 text-xs space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-amber-400 font-sans text-sm">
            <LightningIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Method 1: Smartphone Personal Hotspot (Recommended & Most Portable)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
            0 MB Mobile Data Used
          </span>
        </div>
        <p className="text-amber-200/80 leading-relaxed text-xs">
          Turn on your phone's <strong>Personal Hotspot</strong> with <strong>Cellular Data turned OFF</strong>. Connect your laptop and other phones to this hotspot. Transfers travel directly between devices over local 5GHz Wi-Fi at <strong>50–100+ MB/s</strong>, bypassing router firewalls, campus filters, and AP isolation completely.
        </p>
        {isHotspotIp && (
          <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-mono pt-1">
            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Active Hotspot Adapter Detected on IP: <strong>{selectedInterface?.ip}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-steel uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <QrCodeIcon className="w-3.5 h-3.5 text-amber-400" />
              Step 1: Wi-Fi Auto-Join QR
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              SCAN TO JOIN WI-FI
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="hotspot-ssid-input" className="text-[10px] font-mono text-steel block mb-0.5">Hotspot SSID</label>
              <input
                id="hotspot-ssid-input"
                type="text"
                value={hotspotSsid}
                onChange={(e) => setHotspotSsid(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-2 py-1 text-xs font-mono text-white outline-none"
              />
            </div>
            <div>
              <label htmlFor="hotspot-password-input" className="text-[10px] font-mono text-steel block mb-0.5">Password</label>
              <div className="relative">
                <input
                  id="hotspot-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={hotspotPassword}
                  onChange={(e) => setHotspotPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-2 py-1 text-xs font-mono text-white pr-6 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1.5 text-[#666] hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="hotspot-auth-select" className="text-[10px] font-mono text-steel block mb-0.5">Security</label>
              <select
                id="hotspot-auth-select"
                value={hotspotAuth}
                onChange={(e) => setHotspotAuth(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#282828] rounded px-1.5 py-1 text-xs font-mono text-white outline-none"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="nopass">Open (No Pass)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#1e1e1e]">
            <div className="p-2 bg-white rounded-lg shrink-0 shadow">
              <QRCodeDisplay value={wifiQrPayload} size={96} alt="Hotspot Wi-Fi QR" />
            </div>
            <div className="space-y-1.5 text-[11px] text-[#aaa]">
              <p className="font-semibold text-white">Scan with Camera:</p>
              <p className="text-[10px] leading-tight">Peer devices scan this QR to connect to <strong>{hotspotSsid}</strong> without typing password.</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(`SSID: ${hotspotSsid} | Password: ${hotspotPassword}`)
                  setCopiedWifi(true)
                  setTimeout(() => setCopiedWifi(false), 2000)
                }}
                className="px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-white text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedWifi ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
                <span>{copiedWifi ? 'Copied!' : 'Copy Wi-Fi Details'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-steel uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <DeviceMobileIcon className="w-3.5 h-3.5 text-emerald-400" />
              Step 2: Open W2W Share Link
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
              title="Copy local URL"
            >
              {copiedUrl ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#1e1e1e]">
            <div className="p-2 bg-white rounded-lg shrink-0 shadow">
              <QRCodeDisplay value={activeUrl} size={96} alt="W2W Share URL QR" />
            </div>
            <div className="space-y-1 text-[11px] text-[#aaa]">
              <p className="font-semibold text-white">Open in Browser:</p>
              <p className="text-[10px] leading-tight">Once connected to the hotspot, scan this QR or navigate to the URL above in Chrome/Safari.</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <ShieldCheckIcon className="w-3 h-3" />
                <span>AES-256-GCM Client Encrypted</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-steel uppercase tracking-wider font-bold">
            Quick OS Setup Guide (Zero Mobile Data)
          </span>
          <span className="text-[10px] text-steel font-mono">Select your device:</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-[#0a0a0a] rounded-lg border border-[#222]">
          {(['android', 'ios', 'win', 'mac'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveGuideTab(t)}
              className={`flex-1 py-1 text-[11px] font-mono rounded transition-all cursor-pointer ${
                activeGuideTab === t ? 'bg-[#222] text-white font-bold shadow-sm' : 'text-[#777] hover:text-white'
              }`}
            >
              {getOsGuideLabel(t)}
            </button>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-[#0c0c0c] border border-[#1e1e1e] text-[11px] text-[#ccc] space-y-1.5">
          {activeGuideTab === 'android' && (
            <>
              <p className="text-white font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Android Hotspot Setup:
              </p>
              <p>1. Swipe down and turn <strong>Mobile Data OFF</strong> (prevents any cellular data use).</p>
              <p>2. Open <strong>Settings → Portable Hotspot</strong> (or Tethering) and toggle <strong>ON</strong>.</p>
              <p>3. Connect your laptop / peer to the Android hotspot Wi-Fi.</p>
              <p>4. Open W2W Share on both devices and start transferring at 50–100+ MB/s!</p>
            </>
          )}
          {activeGuideTab === 'ios' && (
            <>
              <p className="text-white font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                iPhone / iPad Hotspot Setup:
              </p>
              <p>1. Open Control Center and turn <strong>Cellular Data OFF</strong>.</p>
              <p>2. Open <strong>Settings → Personal Hotspot</strong> and turn on <strong>Allow Others to Join</strong>.</p>
              <p>3. On receiving laptop/device, connect to the iPhone Wi-Fi network.</p>
              <p>4. Open the link in Safari or Chrome and start sharing with zero data usage!</p>
            </>
          )}
          {activeGuideTab === 'win' && (
            <>
              <p className="text-white font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Windows 10/11 Mobile Hotspot Setup:
              </p>
              <p>1. Open <strong>Settings → Network & Internet → Mobile Hotspot</strong>.</p>
              <p>2. Toggle <strong>Mobile Hotspot ON</strong> (Works completely offline!).</p>
              <p>3. Have peers join your Windows PC hotspot network.</p>
              <p>4. Windows adapter IP will be <code>192.168.137.1</code>; peers open <code>http://192.168.137.1:8080</code>.</p>
            </>
          )}
          {activeGuideTab === 'mac' && (
            <>
              <p className="text-white font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                macOS Local Wi-Fi Sharing Setup:
              </p>
              <p>1. Open <strong>System Settings → General → Sharing → Internet Sharing</strong>.</p>
              <p>2. Create a local computer-to-computer Wi-Fi network.</p>
              <p>3. Connect peer devices to this Mac Wi-Fi network.</p>
              <p>4. Open the Mac's IP link in browser.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface Method2RouterSectionProps {
  activeUrl: string
  copiedUrl: boolean
  handleCopyUrl: () => void
  isRunningDiagnostics: boolean
  handleRunDiagnostics: () => void
  diagnostics: NetworkDiagnosticsResponse | null
  onSwitchToHotspot: () => void
}

const Method2RouterSection: React.FC<Method2RouterSectionProps> = ({
  activeUrl,
  copiedUrl,
  handleCopyUrl,
  isRunningDiagnostics,
  handleRunDiagnostics,
  diagnostics,
  onSwitchToHotspot,
}) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 text-blue-200 text-xs space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-blue-400 font-sans text-sm">
            <HouseLineIcon className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Method 2: Standard Wi-Fi Router or Office/Home LAN</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
            Local Router LAN
          </span>
        </div>
        <p className="text-blue-200/80 leading-relaxed text-xs">
          Connect both sender and receiver to the same <strong>Home, Office, or Lab Wi-Fi router</strong> (or plug in with an Ethernet cable). <strong>No internet / broadband connection is needed</strong>—the router acts as a high-speed local data switch (`192.168.x.x` or `10.x.x.x`).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-steel uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <WifiHighIcon className="w-3.5 h-3.5 text-[#7089ba]" />
              Local Router Share Link
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
              title="Copy local URL"
            >
              {copiedUrl ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#1e1e1e]">
            <div className="p-2 bg-white rounded-lg shrink-0 shadow">
              <QRCodeDisplay value={activeUrl} size={96} alt="Router Share QR" />
            </div>
            <div className="space-y-1 text-[11px] text-[#aaa]">
              <p className="font-semibold text-white">Scan from any device on router:</p>
              <p className="text-[10px] leading-tight">Open camera on your iPhone, Android, or secondary laptop on the same router to pair instantly.</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-steel uppercase tracking-wider flex items-center gap-1 font-bold">
              <BroadcastIcon className="w-3.5 h-3.5 text-emerald-400" />
              Router Diagnostics
            </span>
            <button
              type="button"
              disabled={isRunningDiagnostics}
              onClick={handleRunDiagnostics}
              className="px-2 py-0.5 rounded bg-[#222] hover:bg-[#333] text-[10px] font-mono text-[#7089ba] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowsClockwiseIcon className={`w-3 h-3 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
              <span>{isRunningDiagnostics ? 'Probing...' : 'Probe LAN'}</span>
            </button>
          </div>

          {diagnostics && (
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                <span className="text-steel font-mono">Active Subnet Mode:</span>
                <span className="font-mono text-white font-bold">{diagnostics.activeNetworkMode}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                <span className="text-steel font-mono">Subnet Peer Radar (8888):</span>
                <span className={`font-mono font-bold ${diagnostics.udpDiscoveryActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {diagnostics.udpDiscoveryActive ? 'ACTIVE (READY)' : 'STANDALONE'}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e]">
                <span className="text-steel font-mono">AP Isolation Status:</span>
                <span className={`font-mono font-bold ${diagnostics.apIsolationSuspected ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {diagnostics.apIsolationSuspected ? 'BLOCKED / ISOLATED' : 'OPEN / ROUTABLE'}
                </span>
              </div>
              <div className="p-1.5 rounded bg-[#0c0c0c] border border-[#1e1e1e] text-[10px] text-steel">
                {diagnostics.apIsolationStatusMessage}
              </div>
            </div>
          )}

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] space-y-1">
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <WarningCircleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>AP Isolation / Client Isolation?</span>
            </div>
            <p className="text-steel leading-tight">
              If peer devices cannot open the link, the router may have "AP Isolation" enabled (common in campus dorms or hotel Wi-Fi).
            </p>
            <button
              type="button"
              onClick={onSwitchToHotspot}
              className="text-amber-300 hover:underline font-mono font-semibold block pt-0.5 cursor-pointer"
            >
              Switch to Method 1: Smartphone Personal Hotspot →
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
        <span className="text-[11px] font-mono text-steel uppercase tracking-wider font-bold block">
          How to Transfer on Local Wi-Fi Router (No Internet Needed)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-[#222] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] flex items-center justify-center">1</span>{' '}
              <span>Join Same Router</span>
            </div>
            <p className="text-steel text-[10px]">
              Connect your PC and the receiver device to the same Wi-Fi network. Internet cable can be unplugged.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-[#222] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] flex items-center justify-center">2</span>{' '}
              <span>Share Room PIN</span>
            </div>
            <p className="text-steel text-[10px]">
              Stage files on sender, generate transfer vault, and share the 6-digit PIN with the receiver.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-[#222] space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] flex items-center justify-center">3</span>{' '}
              <span>Direct Decrypt</span>
            </div>
            <p className="text-steel text-[10px]">
              Receiver enters the 6-digit PIN. Chunks stream directly over local Wi-Fi with hardware AES-256-GCM.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const OfflineNetworkModal: React.FC<OfflineNetworkModalProps> = ({
  isOpen,
  onClose,
  selectedInterface,
  onSelectedInterfaceChange,
  initialMode = 'hotspot',
}) => {
  const [mode, setMode] = useState<OfflineNetworkMode>(initialMode === 'campus' ? 'router-lan' : initialMode)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null)
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnosticsResponse | null>(null)
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedWifi, setCopiedWifi] = useState(false)

  const [hotspotSsid, setHotspotSsid] = useState('W2W-Offline-Share')
  const [hotspotPassword, setHotspotPassword] = useState('offline1234')
  const [hotspotAuth, setHotspotAuth] = useState('WPA')
  const [showPassword, setShowPassword] = useState(false)
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'win' | 'mac'>('android')

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
          } else if (diag.activeNetworkMode === 'STANDARD_LAN' || diag.activeNetworkMode === 'CAMPUS_WIFI') {
            setMode('router-lan')
          }
          if (!selectedInterface && net.interfaces.length > 0) {
            const preferred =
              net.interfaces.find((i) => i.interfaceType === 'HOTSPOT') ||
              net.interfaces.find((i) => i.interfaceType === 'STANDARD_LAN') ||
              net.interfaces.find((i) => !i.isLoopback) ||
              net.interfaces[0]
            onSelectedInterfaceChange?.(preferred)
          }
        }
      } catch {
        // standalone mode fallback
      }
    }

    fetchNet()
    return () => {
      active = false
    }
  }, [isOpen, selectedInterface, onSelectedInterfaceChange])

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

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(activeUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const wifiQrPayload =
    hotspotAuth === 'nopass'
      ? `WIFI:T:nopass;S:${hotspotSsid};;`
      : `WIFI:T:${hotspotAuth};S:${hotspotSsid};P:${hotspotPassword};;`

  const isHotspotIp = Boolean(
    selectedInterface?.ip &&
      (selectedInterface.ip.startsWith('192.168.43.') ||
        selectedInterface.ip.startsWith('172.20.10.') ||
        selectedInterface.ip.startsWith('192.168.137.') ||
        selectedInterface.interfaceType === 'HOTSPOT')
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-carbon bg-[#141414] text-white p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold">
              OFFLINE PROTOCOL SELECTOR
            </span>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% Offline • Zero Internet Needed</span>
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-extrabold font-sans text-white">
            Offline Sharing Methods
          </DialogTitle>
          <DialogDescription className="text-xs text-steel">
            Select your preferred offline network topology. Neither method requires active internet or cellular data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-4 p-1.5 rounded-xl bg-[#0a0a0a] border border-[#262626]">
          <button
            type="button"
            onClick={() => setMode('hotspot')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              mode === 'hotspot'
                ? 'bg-white text-black shadow-lg'
                : 'text-steel hover:text-white hover:bg-[#181818]'
            }`}
          >
            <div className={`p-1.5 rounded-md shrink-0 ${mode === 'hotspot' ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
              <LightningIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-sans font-bold text-xs">Method 1: Personal Hotspot</span>
                <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${mode === 'hotspot' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  RECOMMENDED
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${mode === 'hotspot' ? 'text-neutral-600' : 'text-steel'}`}>
                Most portable • Zero cellular data • Bypasses AP Isolation
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('router-lan')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              mode === 'router-lan'
                ? 'bg-white text-black shadow-lg'
                : 'text-steel hover:text-white hover:bg-[#181818]'
            }`}
          >
            <div className={`p-1.5 rounded-md shrink-0 ${mode === 'router-lan' ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/10 text-[#7089ba]'}`}>
              <WifiHighIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-sans font-bold text-xs">Method 2: Wi-Fi Router / LAN</span>
              </div>
              <p className={`text-[10px] mt-0.5 ${mode === 'router-lan' ? 'text-neutral-600' : 'text-steel'}`}>
                Home / Office / Lab router (No internet/WAN needed)
              </p>
            </div>
          </button>
        </div>

        {networkInfo?.interfaces && networkInfo.interfaces.length > 0 && (
          <div className="space-y-1.5 pb-3 border-b border-carbon">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-steel">Active Network Adapter:</span>
              <span className="text-[10px] font-mono text-[#7089ba]">
                {selectedInterface?.ip ? `IP: ${selectedInterface.ip}` : 'Select Interface'}
              </span>
            </div>
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
                        ? 'bg-[#1e293b] border-[#7089ba] text-white font-semibold shadow-sm'
                        : 'bg-[#141414] border-[#222222] text-steel hover:text-white hover:border-[#333333]'
                    }`}
                  >
                    <WifiHighIcon className="w-3 h-3 text-[#7089ba]" />
                    <span>{iface.displayName || iface.name}</span>{' '}
                    <span className="text-[#7089ba] font-bold">({iface.ip})</span>
                    {getInterfaceMethodBadge(iface)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {mode === 'hotspot' && (
          <Method1HotspotSection
            selectedInterface={selectedInterface}
            activeUrl={activeUrl}
            isHotspotIp={isHotspotIp}
            hotspotSsid={hotspotSsid}
            setHotspotSsid={setHotspotSsid}
            hotspotPassword={hotspotPassword}
            setHotspotPassword={setHotspotPassword}
            hotspotAuth={hotspotAuth}
            setHotspotAuth={setHotspotAuth}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            wifiQrPayload={wifiQrPayload}
            copiedWifi={copiedWifi}
            setCopiedWifi={setCopiedWifi}
            copiedUrl={copiedUrl}
            handleCopyUrl={handleCopyUrl}
            activeGuideTab={activeGuideTab}
            setActiveGuideTab={setActiveGuideTab}
          />
        )}

        {mode === 'router-lan' && (
          <Method2RouterSection
            activeUrl={activeUrl}
            copiedUrl={copiedUrl}
            handleCopyUrl={handleCopyUrl}
            isRunningDiagnostics={isRunningDiagnostics}
            handleRunDiagnostics={handleRunDiagnostics}
            diagnostics={diagnostics}
            onSwitchToHotspot={() => setMode('hotspot')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
