import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArrowRightIcon, KeyIcon, LockKeyIcon, ShieldCheckIcon } from '@phosphor-icons/react'

interface BookDemoModalProps {
  isOpen: boolean
  onClose: () => void
  onClaim?: (pin: string) => void
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({
  isOpen,
  onClose,
  onClaim,
}) => {
  const [pinValue, setPinValue] = useState('')

  const handleClose = () => {
    setPinValue('')
    onClose()
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanPin = pinValue.trim()
    if (cleanPin.length === 6) {
      if (onClaim) {
        onClaim(cleanPin)
      } else {
        window.location.href = `/?pin=${cleanPin}#workspace`
      }
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md border border-carbon bg-[#141414] text-white p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 mb-2 text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/25 flex items-center gap-1 font-medium">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>INSTANT DECRYPT</span>
            </span>
          </div>

          <DialogTitle className="text-2xl font-bold tracking-tight text-white font-sans">
            Claim Transfer by PIN
          </DialogTitle>
          <DialogDescription className="text-xs text-steel leading-relaxed">
            Enter the 6-digit claim PIN to locate the transfer session and decrypt incoming file streams in-browser.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="claim-pin-input" className="block text-[11px] font-mono uppercase text-steel tracking-wider">
              6-Digit Claim PIN
            </label>
            <div className="relative flex items-center">
              <KeyIcon className="w-5 h-5 text-[#7089ba] absolute left-3.5 pointer-events-none" />
              <input
                id="claim-pin-input"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="e.g. 849201"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3 pl-11 pr-4 bg-void border border-[#2a2a2a] focus:outline-none rounded-xl text-base font-mono tracking-[0.2em] text-white transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-void border border-[#202020] text-xs font-mono text-steel flex items-center justify-between">
            <span>CRYPTO CIPHER:</span>
            <span className="text-white font-medium">AES-256-GCM / PBKDF2</span>
          </div>

          {/* Submit Action Pill Button */}
          <button
            type="submit"
            disabled={pinValue.trim().length !== 6}
            className="w-full py-3 px-4 mt-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all group shadow-md"
          >
            <span>Claim & Decrypt Files</span>
            <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-steel pt-1">
            <LockKeyIcon className="w-3 h-3 text-[#7089ba]" />
            <span>100% OFFLINE · ZERO INTERNET REQUIRED</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const ClaimPinModal = BookDemoModal
export const QuickClaimModal = BookDemoModal
