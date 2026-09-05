import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CopyIcon,
  CheckIcon,
  DownloadSimpleIcon,
  QrCodeIcon as QrIcon,
  WifiHighIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react'
import QRCode from 'qrcode'
import { QRCodeDisplay } from './QRCodeDisplay'

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
  const [downloadUrl, setDownloadUrl] = useState<string>('')

  // Hotspot Wi-Fi QR options
  const [hotspotSsid, setHotspotSsid] = useState('W2W-Offline-Share')
  const [hotspotPass, setHotspotPass] = useState('offline1234')
  const [showPass, setShowPass] = useState(false)

  const activePayload = activeTab === 'claim' ? url : `WIFI:T:WPA;S:${hotspotSsid};P:${hotspotPass};;`

  useEffect(() => {
    if (!activePayload) return
    QRCode.toDataURL(activePayload, { width: 600, margin: 2 })
      .then(setDownloadUrl)
      .catch(() => {})
  }, [activePayload])

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md border border-carbon bg-[#141414] text-white p-6 rounded-2xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto font-mono text-[9px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 mb-2 font-bold">
            OPTICAL SCANNER & OFFLINE CONNECT
          </div>
          <DialogTitle className="text-xl font-bold font-sans">
            Direct Peer QR Scanner
          </DialogTitle>
          <DialogDescription className="text-xs text-steel">
            Point any phone camera or tablet to connect and transfer files instantly.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0a0a0a] border border-[#222222] my-2">
          <button
            type="button"
            onClick={() => setActiveTab('claim')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'claim'
                ? 'bg-white text-black font-bold shadow'
                : 'text-steel hover:text-white'
            }`}
          >
            <QrIcon className="w-3.5 h-3.5" />
            <span>1. Open Transfer App</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wifi')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'wifi'
                ? 'bg-white text-black font-semibold shadow'
                : 'text-steel hover:text-white'
            }`}
          >
            <WifiHighIcon className="w-3.5 h-3.5" />
            <span>2. Auto-Join Hotspot</span>
          </button>
        </div>

        {/* Wi-Fi Settings Sub-bar if in Wi-Fi tab */}
        {activeTab === 'wifi' && (
          <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#222] grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <label className="text-[10px] text-steel block mb-0.5">Hotspot SSID</label>
              <input
                type="text"
                value={hotspotSsid}
                onChange={(e) => setHotspotSsid(e.target.value)}
                className="w-full bg-[#141414] border border-[#333] rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-steel block mb-0.5">Password</label>
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
                  {showPass ? <EyeSlashIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High-Contrast QR Code Card */}
        <div className="p-4 rounded-2xl bg-void border border-carbon flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

          {/* White container for maximum optical contrast */}
          <div className="p-3 bg-white rounded-xl shadow-2xl relative z-10 flex items-center justify-center min-w-47.5 min-h-47.5">
            <QRCodeDisplay
              value={activeTab === 'claim' ? url : `WIFI:T:WPA;S:${hotspotSsid};P:${hotspotPass};;`}
              size={180}
              alt={activeTab === 'claim' ? `QR code for PIN ${pin}` : `Wi-Fi join QR for ${hotspotSsid}`}
            />
          </div>

          {/* Context Explanations */}
          {activeTab === 'claim' ? (
            <>
              <div className="mt-3 text-[10px] font-mono text-[#7089ba] max-w-70 truncate text-center bg-[#141414] px-2.5 py-1 rounded-md border border-[#222]">
                {url}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-carbon w-full flex items-center justify-between text-xs">
                <span className="text-steel font-mono">ENCRYPTED PIN:</span>
                <span className="font-mono text-base font-bold text-white tracking-widest bg-carbon px-3 py-1 rounded border border-[#282828]">
                  {pin}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-3 text-center text-xs text-[#aaa] font-mono">
              Scan with mobile camera → Phone automatically connects to Hotspot Wi-Fi.
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
              className="w-full py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Wi-Fi Credentials Copied!' : 'Copy Wi-Fi SSID & Password'}</span>
            </button>
          )}

          <a
            href={downloadUrl || '#'}
            download={activeTab === 'claim' ? `w2w-qr-${pin}.png` : `w2w-wifi-${hotspotSsid}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-full bg-carbon border border-[#282828] text-neutral-300 font-medium text-xs hover:text-white hover:border-[#7089ba]/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <DownloadSimpleIcon className="w-3.5 h-3.5" />
            <span>Download QR Code Image</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
