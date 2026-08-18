import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CopyIcon, CheckIcon, DownloadSimpleIcon, QrCodeIcon as QrIcon } from '@phosphor-icons/react'

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
  const [copied, setCopied] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrImageUrl = `/api/transfer/qr?text=${encodeURIComponent(url)}&size=400`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm border border-[#1c1c1c] bg-[#141414] text-white p-6 rounded-2xl">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto font-mono text-[9px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 mb-2">
            OPTICAL SCANNER
          </div>
          <DialogTitle className="text-xl font-bold font-sans">
            Direct Peer Scan
          </DialogTitle>
          <DialogDescription className="text-xs text-[#808080]">
            Point any phone camera, tablet, or QR scanner to join and claim files immediately.
          </DialogDescription>
        </DialogHeader>

        {/* High-Contrast QR Code Card */}
        <div className="my-4 p-5 rounded-2xl bg-[#000000] border border-[#1c1c1c] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

          {/* White container for maximum optical contrast & quiet zone */}
          <div className="p-3.5 bg-white rounded-xl shadow-2xl relative z-10 flex items-center justify-center min-w-[200px] min-h-[200px]">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-xl text-neutral-400">
                <QrIcon className="w-10 h-10 animate-pulse text-[#7089ba]" />
                <span className="text-[10px] font-mono mt-1 text-neutral-500">Generating QR...</span>
              </div>
            )}

            {imgError ? (
              <div className="text-center p-4 text-neutral-600 text-xs font-mono">
                Unable to load QR image
              </div>
            ) : (
              <img
                src={qrImageUrl}
                alt={`QR code for PIN ${pin}`}
                width={200}
                height={200}
                className={`w-48 h-48 block object-contain transition-opacity duration-200 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Encoded URL Preview */}
          <div className="mt-3 text-[10px] font-mono text-[#7089ba] max-w-[240px] truncate text-center bg-[#141414] px-2.5 py-1 rounded-md border border-[#222]">
            {url}
          </div>

          {/* Center 6-Digit PIN Banner */}
          <div className="mt-3 pt-3 border-t border-[#1c1c1c] w-full flex items-center justify-between text-xs">
            <span className="text-[#808080] font-mono">ENCRYPTED PIN:</span>
            <span className="font-mono text-base font-bold text-white tracking-widest bg-[#1c1c1c] px-3 py-1 rounded border border-[#282828]">
              {pin}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 flex items-center justify-center gap-2 transition-all"
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

          <a
            href={qrImageUrl}
            download={`w2w-qr-${pin}.png`}
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

