import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DeviceMobileIcon,
  QrCodeIcon,
  ShareNetworkIcon,
  WifiHighIcon,
  CheckIcon,
  CopyIcon,
  ShieldCheckIcon,
  DownloadSimpleIcon,
  LightningIcon,
  HardDrivesIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { api, type NetworkInterfaceDto } from '@/lib/api'
import { copyToClipboard } from '@/lib/clipboard'
import { QRCodeDisplay } from './QRCodeDisplay'

interface MobileCompanionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedInterface?: NetworkInterfaceDto | null
}

function getInterfaceBadge(iface: NetworkInterfaceDto): string {
  if (iface.isWifiOrHotspot) {
    return '(Wi-Fi)'
  }
  if (iface.isLoopback) {
    return '(Local)'
  }
  return ''
}

export const MobileCompanionModal: React.FC<MobileCompanionModalProps> = ({
  isOpen,
  onClose,
  selectedInterface,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'qr' | 'features' | 'hotspot'>('qr')
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterfaceDto[]>([])
  const [userSelectedIface, setUserSelectedIface] = useState<NetworkInterfaceDto | null>(null)

  // Compute active interface dynamically from user selection, selectedInterface prop, or detected LAN interfaces
  const activeIface = useMemo(() => {
    if (userSelectedIface) return userSelectedIface
    if (selectedInterface) return selectedInterface
    if (networkInterfaces.length > 0) {
      return (
        networkInterfaces.find((i) => i.isWifiOrHotspot && !i.isLoopback && i.ip !== '127.0.0.1') ||
        networkInterfaces.find((i) => !i.isLoopback && i.ip !== '127.0.0.1') ||
        networkInterfaces[0]
      )
    }
    return null
  }, [userSelectedIface, selectedInterface, networkInterfaces])

  // Discover local interfaces (LAN / Wi-Fi) on mount/open
  useEffect(() => {
    if (!isOpen) return
    let active = true

    api.getNetworkInfo()
      .then((info) => {
        if (!active || !info?.interfaces?.length) return
        setNetworkInterfaces(info.interfaces)
      })
      .catch(() => {
        // Fallback gracefully in offline mode
      })

    return () => {
      active = false
    }
  }, [isOpen])

  // Compute effective mobile companion URL (using LAN IP and active frontend port)
  const currentHostUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const currentPort = window.location.port
    const currentProtocol = window.location.protocol || 'http:'

    if (activeIface?.ip && activeIface.ip !== '127.0.0.1') {
      const portPart = currentPort ? `:${currentPort}` : ''
      return `${currentProtocol}//${activeIface.ip}${portPart}`
    }

    if (activeIface?.url) {
      return activeIface.url
    }

    return window.location.origin
  }, [activeIface])

  const isLocalhost = currentHostUrl.includes('localhost') || currentHostUrl.includes('127.0.0.1')

  const handleCopy = async () => {
    if (!currentHostUrl) return
    const success = await copyToClipboard(currentHostUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg border border-carbon bg-[#141414] text-white p-6 rounded-2xl cyber-grid shadow-2xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto font-mono text-[9px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-0.5 rounded-full border border-[#7089ba]/20 mb-2 font-bold inline-flex items-center gap-1.5">
            <DeviceMobileIcon className="w-3.5 h-3.5 text-[#7089ba]" />
            <span>CROSS-PLATFORM MOBILE COMPANION</span>
          </div>
          <DialogTitle className="text-2xl font-extrabold font-sans text-white">
            W2W Mobile Companion
          </DialogTitle>
          <DialogDescription className="text-xs text-steel">
            Zero app stores, zero cloud persistence. Instant direct transfer for iOS & Android.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex items-center p-1 rounded-xl bg-[#181818] border border-[#282828] my-2">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-steel hover:text-white'
            }`}
          >
            <QrCodeIcon className="w-3.5 h-3.5" />
            <span>1. Scan QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-steel hover:text-white'
            }`}
          >
            <LightningIcon className="w-3.5 h-3.5" />
            <span>2. Features</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hotspot')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'hotspot'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-steel hover:text-white'
            }`}
          >
            <WifiHighIcon className="w-3.5 h-3.5" />
            <span>3. Offline Modes</span>
          </button>
        </div>

        {/* Tab 1: QR & Fast Connect */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            {/* Interface selector chips if multiple interfaces exist */}
            {networkInterfaces.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-[#111] rounded-lg border border-[#222]">
                <span className="text-[10px] font-mono text-steel uppercase px-1">Network IP:</span>
                {networkInterfaces.map((iface) => {
                  const isSelected = activeIface?.ip === iface.ip
                  return (
                    <button
                      key={iface.ip || iface.name}
                      type="button"
                      onClick={() => setUserSelectedIface(iface)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7089ba] text-black font-bold shadow-sm'
                          : 'bg-[#1a1a1a] text-steel hover:text-white border border-[#2a2a2a]'
                      }`}
                    >
                      {iface.ip} {getInterfaceBadge(iface)}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="p-4 rounded-xl bg-black border border-[#222] flex flex-col items-center justify-center relative">
              <div className="p-2.5 rounded-xl bg-white shadow-lg animate-pulse-cyan">
                <QRCodeDisplay
                  value={currentHostUrl}
                  size={208}
                  alt="W2W Share Mobile QR Code"
                />
              </div>
              <p className="font-mono text-[11px] text-[#7089ba] mt-3 font-semibold">
                Scan with any iPhone / Android Camera or QR Scanner
              </p>
            </div>

            {isLocalhost && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono flex items-center gap-2 text-left">
                <WarningIcon className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Mobile phones cannot reach <code className="bg-black/40 px-1 py-0.5 rounded">localhost</code>. Connect to the same Wi-Fi and select your LAN IP above.
                </span>
              </div>
            )}

            {/* Direct URL & Copy */}
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-between gap-2">
              <div className="min-w-0 text-left">
                <div className="text-[10px] font-mono text-steel uppercase">Local Mobile Access Link</div>
                <div className="text-xs font-mono text-white truncate font-medium">{currentHostUrl}</div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white border border-[#333] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Mobile Native Capabilities (PWA & Share Sheet) */}
        {activeTab === 'features' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#7089ba]/10 border border-[#7089ba]/30 flex items-center justify-center shrink-0 text-[#7089ba]">
                <DownloadSimpleIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">1-Click PWA Installation</div>
                <p className="text-[11px] text-steel mt-0.5 leading-relaxed">
                  Open link on Chrome (Android) or Safari (iOS) and tap <span className="text-[#7089ba] font-semibold">"Add to Home Screen"</span>. Works 100% offline like a native app.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#7089ba]/10 border border-[#7089ba]/30 flex items-center justify-center shrink-0 text-[#7089ba]">
                <ShareNetworkIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">System Share Target</div>
                <p className="text-[11px] text-steel mt-0.5 leading-relaxed">
                  Share photos, 4K videos, or PDFs from any app directly into W2W Share via your phone's native Share menu.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
                <HardDrivesIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-bold text-xs">Zero-Storage Streaming</div>
                <p className="text-[11px] text-steel mt-0.5 leading-relaxed">
                  Raw binary chunks pipe directly through browser memory buffers with AES-256-GCM hardware encryption. Zero cloud storage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Offline Modes (Method 1: Hotspot & Method 2: Wi-Fi Router) */}
        {activeTab === 'hotspot' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#141414] border border-amber-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <LightningIcon className="w-4 h-4" />
                  <span>Method 1: Smartphone Hotspot (Recommended)</span>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                  0 MB DATA
                </span>
              </div>
              <p className="text-[11px] text-steel leading-relaxed">
                Turn on your phone's <strong className="text-white">Personal Hotspot</strong> with Mobile Data <strong className="text-white">OFF</strong>. Connect laptop to phone and transfer directly over 5GHz Wi-Fi at 50–100+ MB/s.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141414] border border-blue-900/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <WifiHighIcon className="w-4 h-4" />
                  <span>Method 2: Standard Wi-Fi Router / Home LAN</span>
                </div>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                  ROUTER LAN
                </span>
              </div>
              <p className="text-[11px] text-steel leading-relaxed">
                Connect both devices to the same home or office Wi-Fi router. Broadband cable can be unplugged—router switches local packets without internet.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 shrink-0" />
              <span>100% Offline • Zero cloud persistence • Client-side AES-256-GCM hardware encryption</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
