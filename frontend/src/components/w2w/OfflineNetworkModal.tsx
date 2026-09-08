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
import { copyToClipboard } from '@/lib/clipboard'
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
  DesktopIcon,
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
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/25">
        HOTSPOT
      </span>
    )
  }
  if (iface.interfaceType === 'STANDARD_LAN') {
    return (
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#7089ba]/15 text-[#7089ba] font-bold border border-[#7089ba]/25">
        ROUTER LAN
      </span>
    )
  }
  if (iface.isLoopback) {
    return (
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-steel border border-[#2a2a2a]">
        LOOPBACK
      </span>
    )
  }
  if (iface.interfaceType) {
    return (
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-ash border border-[#2a2a2a]">
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

function getPortLabel(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.port) {
      return `PORT ${parsed.port}`
    }
    return parsed.protocol === 'https:' ? 'PORT 443' : 'PORT 80'
  } catch {
    const match = new RegExp(/:(\d+)/).exec(url)
    return match ? `PORT ${match[1]}` : 'PORT 8080'
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
  const portLabel = getPortLabel(activeUrl)

  return (
    <div className="space-y-4 pt-1">
      {/* Spotlight Info Card */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] text-xs space-y-2.5 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <LightningIcon className="w-4 h-4 shrink-0" weight="fill" />
            </div>
            <span className="font-bold text-white font-sans text-sm">
              Smartphone Personal Hotspot
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#7089ba]/10 text-[#7089ba] border border-[#7089ba]/20 font-bold">
              50–100+ MB/s
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            0 MB Mobile Data Used
          </span>
        </div>
        <p className="text-ash leading-relaxed text-xs">
          Turn on your phone's <strong className="text-white">Personal Hotspot</strong> with <strong className="text-emerald-400">Cellular Data turned OFF</strong>. Connect your laptop and other devices to this hotspot. Transfers travel directly over local 5GHz Wi-Fi with zero cellular data used, bypassing router firewalls, campus filters, and client isolation.
        </p>
        {isHotspotIp && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono pt-1 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded-lg">
            <CheckCircleIcon className="w-4 h-4 shrink-0" weight="fill" />
            <span>Active Hotspot Adapter Detected on IP: <strong className="text-white">{selectedInterface?.ip}</strong></span>
          </div>
        )}
      </div>

      {/* 2-Step Flow: Step 1 Wi-Fi + Step 2 URL Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Wi-Fi Auto-Join QR */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border border-[#242424] space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#202020]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/25 font-bold">
                  STEP 1
                </span>
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <QrCodeIcon className="w-4 h-4 text-[#7089ba]" />
                  Wi-Fi Auto-Join QR
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                SCAN TO JOIN
              </span>
            </div>

            {/* Hotspot Credentials Inputs */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <label htmlFor="hotspot-ssid-input" className="text-[10px] font-mono text-steel block mb-1">
                    Hotspot SSID
                  </label>
                  <input
                    id="hotspot-ssid-input"
                    type="text"
                    value={hotspotSsid}
                    onChange={(e) => setHotspotSsid(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] focus:ring-1 focus:ring-[#7089ba] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label htmlFor="hotspot-auth-select" className="text-[10px] font-mono text-steel block mb-1">
                    Security
                  </label>
                  <select
                    id="hotspot-auth-select"
                    value={hotspotAuth}
                    onChange={(e) => setHotspotAuth(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] focus:ring-1 focus:ring-[#7089ba] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors cursor-pointer"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="nopass">Open (No Pass)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="hotspot-password-input" className="text-[10px] font-mono text-steel block mb-1">
                  Hotspot Password
                </label>
                <div className="relative">
                  <input
                    id="hotspot-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={hotspotPassword}
                    onChange={(e) => setHotspotPassword(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] focus:ring-1 focus:ring-[#7089ba] rounded-lg px-3 py-2 text-xs font-mono text-white pr-9 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Display + Camera Scan Instructions */}
          <div className="flex items-center gap-4 pt-3 border-t border-[#202020]">
            <div className="p-3 bg-white rounded-xl shrink-0 shadow-lg flex items-center justify-center">
              <QRCodeDisplay value={wifiQrPayload} size={112} alt="Hotspot Wi-Fi QR" />
            </div>
            <div className="space-y-2 text-xs text-ash min-w-0 flex-1">
              <div>
                <p className="font-semibold text-white text-sm">Scan with Camera</p>
                <p className="text-xs text-steel leading-relaxed mt-0.5">
                  Peer devices scan this QR to join <strong className="text-white">{hotspotSsid}</strong> without typing password.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const success = await copyToClipboard(`SSID: ${hotspotSsid} | Password: ${hotspotPassword}`)
                  if (success) {
                    setCopiedWifi(true)
                    setTimeout(() => setCopiedWifi(false), 2000)
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#303030] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer w-fit"
              >
                {copiedWifi ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                <span>{copiedWifi ? 'Copied Details!' : 'Copy Wi-Fi Details'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Open W2W Share Link */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border border-[#242424] space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#202020]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
                  STEP 2
                </span>
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <DeviceMobileIcon className="w-4 h-4 text-emerald-400" />
                  Open W2W Share Link
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                {portLabel}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-steel block mb-1">
                Direct Browser Access URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activeUrl}
                  className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-white select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#303030] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0 font-medium"
                  title="Copy local URL"
                >
                  {copiedUrl ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Display + Browser Instructions */}
          <div className="flex items-center gap-4 pt-3 border-t border-[#202020]">
            <div className="p-3 bg-white rounded-xl shrink-0 shadow-lg flex items-center justify-center">
              <QRCodeDisplay value={activeUrl} size={112} alt="W2W Share URL QR" />
            </div>
            <div className="space-y-2 text-xs text-ash min-w-0 flex-1">
              <div>
                <p className="font-semibold text-white text-sm">Open in Web Browser</p>
                <p className="text-xs text-steel leading-relaxed mt-0.5">
                  Once connected to the hotspot, scan this QR or open the URL above in Chrome/Safari.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>AES-256-GCM Hardware Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick OS Setup Guide */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border border-[#242424] space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <DeviceMobileIcon className="w-4 h-4 text-[#7089ba]" />
            <span className="text-xs sm:text-sm font-mono text-white font-bold uppercase tracking-wider">
              Quick OS Setup Guide
            </span>
          </div>
          <span className="text-xs font-mono text-steel">Zero Cellular Data Mode</span>
        </div>

        {/* Segmented OS tab selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-[#0a0a0a] rounded-xl border border-[#222]">
          {(['android', 'ios', 'win', 'mac'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveGuideTab(t)}
              className={`py-2 px-3 text-xs font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeGuideTab === t
                  ? 'bg-[#1e1e1e] text-white font-bold border border-[#333333] shadow-sm'
                  : 'text-steel hover:text-white hover:bg-[#141414]'
              }`}
            >
              {t === 'android' || t === 'ios' ? (
                <DeviceMobileIcon className="w-3.5 h-3.5" />
              ) : (
                <DesktopIcon className="w-3.5 h-3.5" />
              )}
              <span>{getOsGuideLabel(t)}</span>
            </button>
          ))}
        </div>

        {/* Responsive 4-Column Step Cards */}
        <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#202020] space-y-3">
          {activeGuideTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm pb-1.5 border-b border-carbon">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Android Hotspot Setup (100% Offline):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-ash">
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">1</span>
                  <p>Swipe down and turn <strong className="text-white">Mobile Data OFF</strong> (prevents any cellular data use).</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">2</span>
                  <p>Open <strong className="text-white">Settings → Portable Hotspot</strong> and toggle <strong className="text-emerald-400">ON</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">3</span>
                  <p>Connect your laptop / peer to the Android hotspot Wi-Fi network.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">4</span>
                  <p>Open W2W Share on both devices and start transferring at <strong className="text-emerald-400">50–100+ MB/s</strong>!</p>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm pb-1.5 border-b border-carbon">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>iPhone / iPad Hotspot Setup (100% Offline):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-ash">
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">1</span>
                  <p>Open Control Center and turn <strong className="text-white">Cellular Data OFF</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">2</span>
                  <p>Open <strong className="text-white">Settings → Personal Hotspot</strong> and turn on <strong className="text-emerald-400">Allow Others to Join</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">3</span>
                  <p>On receiving device, connect to the iPhone Wi-Fi network.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">4</span>
                  <p>Open link in Safari or Chrome and transfer files with <strong className="text-emerald-400">zero data usage</strong>.</p>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'win' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm pb-1.5 border-b border-carbon">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Windows 10/11 Mobile Hotspot Setup:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-ash">
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">1</span>
                  <p>Open <strong className="text-white">Settings → Network & Internet → Mobile Hotspot</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">2</span>
                  <p>Toggle <strong className="text-emerald-400">Mobile Hotspot ON</strong> (Works completely offline!).</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">3</span>
                  <p>Have peers join your Windows PC hotspot Wi-Fi.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">4</span>
                  <p>Peers open the Windows adapter link (usually <code className="text-emerald-400">192.168.137.1</code>).</p>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'mac' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm pb-1.5 border-b border-carbon">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>macOS Local Wi-Fi Sharing Setup:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-ash">
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">1</span>
                  <p>Open <strong className="text-white">System Settings → General → Sharing → Internet Sharing</strong>.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">2</span>
                  <p>Create a local computer-to-computer Wi-Fi network.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">3</span>
                  <p>Connect peer devices to this Mac Wi-Fi network.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5 flex flex-col justify-start">
                  <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">4</span>
                  <p>Open Mac's IP link in browser to start direct sharing.</p>
                </div>
              </div>
            </div>
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
  const portLabel = getPortLabel(activeUrl)

  return (
    <div className="space-y-4 pt-1">
      {/* Spotlight Info Card */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] text-xs space-y-2.5 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/25">
              <HouseLineIcon className="w-4 h-4 shrink-0" weight="fill" />
            </div>
            <span className="font-bold text-white font-sans text-sm">
              Standard Wi-Fi Router or Office/Home LAN
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/30 font-bold">
            Local Router LAN
          </span>
        </div>
        <p className="text-ash leading-relaxed text-xs">
          Connect sender and receiver to the same <strong className="text-white">Home, Office, or Lab Wi-Fi router</strong> (or connect via Ethernet cable). <strong className="text-white">No internet or broadband connection is required</strong>—the router acts as a high-speed local data switch (<code className="text-[#7089ba]">192.168.x.x</code> or <code className="text-[#7089ba]">10.x.x.x</code>).
        </p>
      </div>

      {/* 2-Column: Local Share QR & LAN Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Local Router Share Link */}
        <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/25 font-bold">
                  LINK
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <WifiHighIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                  Local Router Share Link
                </span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#7089ba]/10 text-[#7089ba] border border-[#7089ba]/20 font-semibold">
                {portLabel}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-mono text-steel block mb-1">
                Subnet Direct URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={activeUrl}
                  className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#303030] text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title="Copy local URL"
                >
                  {copiedUrl ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-2 border-t border-[#202020]">
            <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-lg flex items-center justify-center">
              <QRCodeDisplay value={activeUrl} size={104} alt="Router Share QR" />
            </div>
            <div className="space-y-1 text-xs text-ash min-w-0 flex-1">
              <p className="font-semibold text-white text-xs">Scan from any device on router</p>
              <p className="text-[11px] text-steel leading-tight">
                Open camera on your iPhone, Android, or secondary laptop on the same router to pair instantly.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                <ShieldCheckIcon className="w-3 h-3" />
                <span>Zero Cloud Dependency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Router Diagnostics */}
        <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#202020]">
              <span className="text-xs font-mono text-white uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <BroadcastIcon className="w-3.5 h-3.5 text-emerald-400" />
                Router Diagnostics
              </span>
              <button
                type="button"
                disabled={isRunningDiagnostics}
                onClick={handleRunDiagnostics}
                className="px-2.5 py-1 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#303030] text-[10px] font-mono text-[#7089ba] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowsClockwiseIcon className={`w-3 h-3 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                <span>{isRunningDiagnostics ? 'Probing...' : 'Probe LAN'}</span>
              </button>
            </div>

            {diagnostics && (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                  <span className="text-steel font-mono text-[11px]">Subnet Mode:</span>
                  <span className="font-mono text-white font-bold text-xs">{diagnostics.activeNetworkMode}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                  <span className="text-steel font-mono text-[11px]">Subnet Peer Radar (8888):</span>
                  <span className={`font-mono font-bold text-xs ${diagnostics.udpDiscoveryActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {diagnostics.udpDiscoveryActive ? 'ACTIVE (READY)' : 'STANDALONE'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f]">
                  <span className="text-steel font-mono text-[11px]">AP Isolation Status:</span>
                  <span className={`font-mono font-bold text-xs ${diagnostics.apIsolationSuspected ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {diagnostics.apIsolationSuspected ? 'BLOCKED / ISOLATED' : 'OPEN / ROUTABLE'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[#0c0c0c] border border-[#1f1f1f] text-[11px] text-steel">
                  {diagnostics.apIsolationStatusMessage}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <WarningCircleIcon className="w-4 h-4 shrink-0" />
              <span>AP Isolation / Client Isolation?</span>
            </div>
            <p className="text-ash text-[11px] leading-relaxed">
              If peer devices cannot open the link, the router may have "AP Isolation" enabled (common in campus dorms or hotel Wi-Fi).
            </p>
            <button
              type="button"
              onClick={onSwitchToHotspot}
              className="text-amber-300 hover:text-amber-200 hover:underline font-mono text-xs font-semibold flex items-center gap-1 pt-0.5 cursor-pointer"
            >
              <span>Switch to Method 1: Smartphone Personal Hotspot</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Step Router Transfer Guide */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#242424] space-y-3">
        <span className="text-xs font-mono text-white uppercase tracking-wider font-bold block">
          How to Transfer on Local Wi-Fi Router (No Internet Needed)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-[#0c0c0c] border border-[#202020] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">1</span>
              <span>Join Same Router</span>
            </div>
            <p className="text-steel text-[11px] leading-relaxed">
              Connect PC and receiver to the same Wi-Fi network or LAN cable. Internet cable can be unplugged.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#0c0c0c] border border-[#202020] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">2</span>
              <span>Share Room PIN</span>
            </div>
            <p className="text-steel text-[11px] leading-relaxed">
              Stage files on sender, generate transfer vault, and share the 6-digit PIN with the receiver.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#0c0c0c] border border-[#202020] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7089ba]/15 text-[#7089ba] font-mono text-xs flex items-center justify-center font-bold">3</span>
              <span>Direct Decrypt</span>
            </div>
            <p className="text-steel text-[11px] leading-relaxed">
              Receiver enters the PIN. Chunks stream directly over local Wi-Fi with hardware AES-256-GCM.
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
    const success = await copyToClipboard(activeUrl)
    if (success) {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
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
      <DialogContent className="w-[94vw] max-w-5xl max-h-[90vh] overflow-y-auto border border-carbon bg-[#121212] text-white p-6 sm:p-8 rounded-2xl shadow-2xl space-y-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold">
                OFFLINE PROTOCOL SELECTOR
              </span>
              <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>100% Offline • Zero Internet Needed</span>
              </span>
            </div>
            <span className="text-[11px] font-mono text-steel hidden sm:inline-block">
              AES-256-GCM Hardware Encrypted Mesh
            </span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold font-sans text-white tracking-tight">
            Offline Sharing Methods
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-steel">
            Select your preferred offline network topology. Neither method requires active internet or cellular data.
          </DialogDescription>
        </DialogHeader>

        {/* Cohesive Blueprint Method Switcher Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
          <button
            type="button"
            onClick={() => setMode('hotspot')}
            className={`relative flex items-center gap-3.5 p-4 rounded-xl text-left transition-all cursor-pointer border ${
              mode === 'hotspot'
                ? 'bg-[#181c26] border-[#7089ba] shadow-[0_0_20px_rgba(112,137,186,0.15)] ring-1 ring-[#7089ba]/40'
                : 'bg-[#0f0f0f] border-[#222222] text-steel hover:border-[#333333] hover:text-white hover:bg-[#151515]'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                mode === 'hotspot'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-[#1a1a1a] text-steel border border-[#262626]'
              }`}
            >
              <LightningIcon className="w-5 h-5" weight={mode === 'hotspot' ? 'fill' : 'regular'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`font-sans font-bold text-sm sm:text-base ${mode === 'hotspot' ? 'text-white' : 'text-ash'}`}>
                  Method 1: Personal Hotspot
                </span>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold tracking-wider">
                  RECOMMENDED
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${mode === 'hotspot' ? 'text-steel' : 'text-graphite'}`}>
                Most portable • Zero cellular data • Bypasses AP Isolation
              </p>
            </div>
            {mode === 'hotspot' && (
              <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#7089ba] shadow-[0_0_8px_#7089ba]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode('router-lan')}
            className={`relative flex items-center gap-3.5 p-4 rounded-xl text-left transition-all cursor-pointer border ${
              mode === 'router-lan'
                ? 'bg-[#181c26] border-[#7089ba] shadow-[0_0_20px_rgba(112,137,186,0.15)] ring-1 ring-[#7089ba]/40'
                : 'bg-[#0f0f0f] border-[#222222] text-steel hover:border-[#333333] hover:text-white hover:bg-[#151515]'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                mode === 'router-lan'
                  ? 'bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/30'
                  : 'bg-[#1a1a1a] text-steel border border-[#262626]'
              }`}
            >
              <WifiHighIcon className="w-5 h-5" weight={mode === 'router-lan' ? 'fill' : 'regular'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`font-sans font-bold text-sm sm:text-base ${mode === 'router-lan' ? 'text-white' : 'text-ash'}`}>
                  Method 2: Wi-Fi Router / LAN
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${mode === 'router-lan' ? 'text-steel' : 'text-graphite'}`}>
                Home / Office / Lab router (No internet/WAN needed)
              </p>
            </div>
            {mode === 'router-lan' && (
              <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#7089ba] shadow-[0_0_8px_#7089ba]" />
            )}
          </button>
        </div>

        {/* Polished Active Network Adapter Selector Bar */}
        {networkInfo?.interfaces && networkInfo.interfaces.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#0e0e0e] border border-[#202020] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono shrink-0">
              <WifiHighIcon className="w-4 h-4 text-[#7089ba]" />
              <span className="text-steel uppercase tracking-wider text-[11px] font-semibold">Active Network Adapter:</span>
              <span className="text-white font-bold">{selectedInterface?.ip || 'None'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {networkInfo.interfaces.map((iface) => {
                const isSelected = selectedInterface?.ip === iface.ip

                return (
                  <button
                    key={iface.ip}
                    type="button"
                    onClick={() => onSelectedInterfaceChange?.(iface)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#181f2c] border-[#7089ba] text-white shadow-sm ring-1 ring-[#7089ba]/30'
                        : 'bg-[#141414] border-[#242424] text-steel hover:text-white hover:border-[#383838]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#7089ba] shadow-[0_0_6px_#7089ba]' : 'bg-steel'}`} />
                    <span className="font-semibold">{iface.displayName || iface.name}</span>
                    <span className="text-ash font-mono">({iface.ip})</span>
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
