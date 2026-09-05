import React, { useState } from 'react'
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
} from '@phosphor-icons/react'
import { api, type NetworkInterfaceDto } from '@/lib/api'

interface MobileCompanionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedInterface?: NetworkInterfaceDto | null
}

export const MobileCompanionModal: React.FC<MobileCompanionModalProps> = ({
  isOpen,
  onClose,
  selectedInterface,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'qr' | 'features' | 'hotspot'>('qr')

  const currentHostUrl = typeof window !== 'undefined'
    ? (selectedInterface?.url || window.location.origin)
    : ''

  const qrImageUrl = api.getTransferQrUrl(currentHostUrl, 360)

  const handleCopy = () => {
    if (!currentHostUrl) return
    navigator.clipboard.writeText(currentHostUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <span>3. Hotspot</span>
          </button>
        </div>

        {/* Tab 1: QR & Fast Connect */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-black border border-[#222] flex flex-col items-center justify-center relative">
              <div className="p-2.5 rounded-xl bg-white/95 border border-[#7089ba]/40 shadow-lg animate-pulse-cyan">
                <img
                  src={qrImageUrl}
                  alt="W2W Share Mobile QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              </div>
              <p className="font-mono text-[11px] text-[#7089ba] mt-3 font-semibold">
                Scan with any iPhone / Android Camera or QR Scanner
              </p>
            </div>

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

        {/* Tab 3: Direct Hotspot (Zero Router / Zero Wi-Fi required) */}
        {activeTab === 'hotspot' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#141414] border border-carbon">
              <div className="flex items-center gap-2 text-[#7089ba] font-bold mb-2">
                <WifiHighIcon className="w-4 h-4" />
                <span>Zero-Internet Field Operation</span>
              </div>
              <p className="text-[11px] text-steel leading-relaxed">
                No Wi-Fi router or campus network? Turn on your mobile phone's <strong className="text-white">Personal Hotspot</strong> and connect your laptop to it.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141414] border border-carbon space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-steel">1. Turn on Mobile Hotspot</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-steel">2. Connect Computer to Phone</span>
                <span className="text-white font-semibold">Wi-Fi / USB</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-steel">3. Scan QR on Phone Screen</span>
                <span className="text-emerald-400 font-semibold">Done</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 shrink-0" />
              <span>Full local speeds: 40MB/s – 100MB/s over 5GHz Hotspot with 0MB cellular data consumed!</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
