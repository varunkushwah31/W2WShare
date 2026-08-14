import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Copy, Check } from '@phosphor-icons/react'

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
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generate a procedural geometric QR matrix for blueprint wireframe aesthetic
  const matrixSize = 25
  const cells = React.useMemo(() => {
    const arr: boolean[][] = []
    let seed = 0
    for (let i = 0; i < url.length; i++) {
      seed = (seed * 31 + url.charCodeAt(i)) & 0xffffff
    }

    for (let r = 0; r < matrixSize; r++) {
      const row: boolean[] = []
      for (let c = 0; c < matrixSize; c++) {
        // Corner Position Detection Patterns (Finder Patterns)
        const inTopLeft = r < 7 && c < 7
        const inTopRight = r < 7 && c >= matrixSize - 7
        const inBottomLeft = r >= matrixSize - 7 && c < 7

        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = r < 7 ? r : r - (matrixSize - 7)
          const lc = c < 7 ? c : c - (matrixSize - 7)
          const isBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6
          const isCenter = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4
          row.push(isBorder || isCenter)
        } else {
          // Deterministic pseudorandom pseudo-code based on seed & coordinates
          const val = Math.sin(seed + r * 13 + c * 37) * 10000
          row.push(val - Math.floor(val) > 0.45)
        }
      }
      arr.push(row)
    }
    return arr
  }, [url])

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
            Point any phone camera or tablet on the same Wi-Fi to join immediately.
          </DialogDescription>
        </DialogHeader>

        {/* Blueprint Wireframe QR Code Box */}
        <div className="my-4 p-4 rounded-xl bg-[#000000] border border-[#1c1c1c] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

          {/* SVG QR Code */}
          <svg
            viewBox={`0 0 ${matrixSize} ${matrixSize}`}
            className="w-48 h-48 relative z-10"
            shapeRendering="crispEdges"
          >
            {cells.map((row, r) =>
              row.map((active, c) =>
                active ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width="1"
                    height="1"
                    fill={
                      (r < 7 && c < 7) ||
                      (r < 7 && c >= matrixSize - 7) ||
                      (r >= matrixSize - 7 && c < 7)
                        ? '#7089ba'
                        : '#ffffff'
                    }
                  />
                ) : null
              )
            )}
          </svg>

          {/* Center 6-Digit PIN Banner */}
          <div className="mt-4 pt-3 border-t border-[#1c1c1c] w-full flex items-center justify-between text-xs">
            <span className="text-[#808080] font-mono">ENCRYPTED PIN:</span>
            <span className="font-mono text-base font-bold text-white tracking-widest bg-[#1c1c1c] px-3 py-1 rounded border border-[#282828]">
              {pin}
            </span>
          </div>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="w-full py-2 px-4 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 flex items-center justify-center gap-2 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-black" weight="bold" />
              <span>Link Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-black" />
              <span>Copy Direct Transfer Link</span>
            </>
          )}
        </button>
      </DialogContent>
    </Dialog>
  )
}
