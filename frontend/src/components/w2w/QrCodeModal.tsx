import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Copy as CopyIcon,
  Check as CheckIcon,
  DownloadSimple as DownloadSimpleIcon,
  QrCode as QrIcon,
  WifiHigh,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'

interface QrCodeModalProps {
  isOpen: boolean
  onClose: () => void
  pin: string
  url: string
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  pin,
  url,
}) => {
  const [activeTab, setActiveTab] = useState<'claim' | 'wifi'>('claim')
  const [copied, setCopied] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Hotspot Wi-Fi QR options
  const [hotspotSsid, setHotspotSsid] = useState('W2W-Offline-Share')
  const [hotspotPass, setHotspotPass] = useState('offline1234')
  const [showPass, setShowPass] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const claimQrUrl = `/api/transfer/qr?text=${encodeURIComponent(url)}&size=400`
  const wifiQrUrl = api.getWifiQrUrl(hotspotSsid, hotspotPass, 'WPA', 400)

  const currentQrUrl = activeTab === 'claim' ? claimQrUrl : wifiQrUrl

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md border border-[#1c1c1c] bg-[#141414] text-white p-6 rounded-2xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto font-mono text-[9px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 mb-2 font-bold">
            OPTICAL SCANNER & OFFLINE CONNECT
          </div>
          <DialogTitle className="text-xl font-bold font-sans">
            Direct Peer QR Scanner
          </DialogTitle>
          <DialogDescription className="text-xs text-[#808080]">
            Point any phone camera or tablet to connect and transfer files instantly.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0a0a0a] border border-[#222222] my-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('claim')
              setImgLoaded(false)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'claim'
                ? 'bg-white text-black font-bold shadow'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <QrIcon className="w-3.5 h-3.5" />
            <span>1. Open Transfer App</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('wifi')
              setImgLoaded(false)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'wifi'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-[#808080] hover:text-white'
            }`}
          >
            <WifiHigh className="w-3.5 h-3.5" />
            <span>2. Auto-Join Hotspot</span>
          </button>
        </div>

        {/* Wi-Fi Settings Sub-bar if in wifi tab */}
        {activeTab === 'wifi' && (
          <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#222] grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <label className="text-[10px] text-[#808080] block mb-0.5">Hotspot SSID</label>
              <input
                type="text"
                value={hotspotSsid}
                onChange={(e) => setHotspotSsid(e.target.value)}
                className="w-full bg-[#141414] border border-[#333] rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#808080] block mb-0.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={hotspotPass}
                  onChange={(e) => setHotspotPass(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333] rounded px-2 py-1 text-xs text-white pr-6"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-1.5 top-1.5 text-[#666] hover:text-white"
                >
                  {showPass ? <EyeSlash className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High-Contrast QR Code Card */}
        <div className="p-4 rounded-2xl bg-[#000000] border border-[#1c1c1c] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

          {/* White container for maximum optical contrast */}
          <div className="p-3 bg-white rounded-xl shadow-2xl relative z-10 flex items-center justify-center min-w-[190px] min-h-[190px]">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-xl text-neutral-400">
                <QrIcon className="w-8 h-8 animate-pulse text-[#7089ba]" />
                <span className="text-[10px] font-mono mt-1 text-neutral-500">Generating QR...</span>
              </div>
            )}

            {imgError ? (
              <div className="text-center p-4 text-neutral-600 text-xs font-mono">
                Unable to render QR image
              </div>
            ) : (
              <img
                key={currentQrUrl}
                src={currentQrUrl}
                alt={activeTab === 'claim' ? `QR code for PIN ${pin}` : `Wi-Fi join QR for ${hotspotSsid}`}
                width={190}
                height={190}
                className={`w-44 h-44 block object-contain transition-opacity duration-200 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Context Explanations */}
          {activeTab === 'claim' ? (
            <>
              <div className="mt-3 text-[10px] font-mono text-[#7089ba] max-w-[280px] truncate text-center bg-[#141414] px-2.5 py-1 rounded-md border border-[#222]">
                {url}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-[#1c1c1c] w-full flex items-center justify-between text-xs">
                <span className="text-[#808080] font-mono">ENCRYPTED PIN:</span>
                <span className="font-mono text-base font-bold text-white tracking-widest bg-[#1c1c1c] px-3 py-1 rounded border border-[#282828]">
                  {pin}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-3 text-center text-xs text-[#aaa] font-mono">
              Scan with mobile camera $\to$ Phone automatically connects to Hotspot Wi-Fi.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {activeTab === 'claim' ? (
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-black" weight="bold" />
                  <span>Link Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-black" />
                  <span>Copy Direct Transfer Link</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`SSID: ${hotspotSsid} | Password: ${hotspotPass}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="w-full py-2.5 px-4 rounded-full bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Wi-Fi Credentials Copied!' : 'Copy Wi-Fi SSID & Password'}</span>
            </button>
          )}

          <a
            href={currentQrUrl}
            download={activeTab === 'claim' ? `w2w-qr-${pin}.png` : `w2w-wifi-${hotspotSsid}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-full bg-[#1c1c1c] border border-[#282828] text-neutral-300 font-medium text-xs hover:text-white hover:border-neutral-500 flex items-center justify-center gap-2 transition-all"
          >
            <DownloadSimpleIcon className="w-3.5 h-3.5" />
            <span>Download QR Code Image</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
