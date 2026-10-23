import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DesktopIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FileIcon,
  VideoCameraIcon,
  MusicNotesIcon,
  ImageIcon,
  ArchiveIcon,
  CodeIcon,
} from '@phosphor-icons/react'
import { detectFileTypeCategory } from '@/lib/fileCategories'

export interface AirDropRequestData {
  sessionId: string
  pin: string
  senderDeviceId: string
  senderDeviceName: string
  targetDeviceId?: string
  files: { fileName: string; fileSize: number; mimeType?: string }[]
  totalBytes: number
}

interface AirDropModalProps {
  isOpen: boolean
  request: AirDropRequestData | null
  status: 'prompt' | 'transferring' | 'completed' | 'declined' | 'error'
  progressPercent?: number
  speedMbps?: number
  etaSeconds?: number | null
  errorMsg?: string | null
  receivedFiles?: { fileName: string; blobUrl: string; size: number }[]
  onAccept: () => void
  onDecline: () => void
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export const AirDropModal: React.FC<AirDropModalProps> = ({
  isOpen,
  request,
  status,
  progressPercent = 0,
  speedMbps = 0,
  etaSeconds = null,
  errorMsg = null,
  receivedFiles = [],
  onAccept,
  onDecline,
  onClose,
}) => {
  if (!isOpen || !request) return null

  const firstFile = request.files[0]
  const fileCategory = firstFile ? detectFileTypeCategory(firstFile.fileName, firstFile.mimeType || '') : 'other'

  const renderFileIcon = () => {
    switch (fileCategory) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-sky-400" />
      case 'video':
        return <VideoCameraIcon className="w-5 h-5 text-purple-400" />
      case 'audio':
        return <MusicNotesIcon className="w-5 h-5 text-pink-400" />
      case 'archive':
        return <ArchiveIcon className="w-5 h-5 text-amber-400" />
      case 'code':
        return <CodeIcon className="w-5 h-5 text-emerald-400" />
      default:
        return <FileIcon className="w-5 h-5 text-[#7089ba]" />
    }
  }

  // Circular progress calculations for radar progress ring
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  const isMobile = request.senderDeviceName.toLowerCase().includes('iphone') ||
    request.senderDeviceName.toLowerCase().includes('android') ||
    request.senderDeviceName.toLowerCase().includes('mobile')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md border border-[#7089ba]/40 bg-[#121212] text-paper p-5 sm:p-6 rounded-2xl relative shadow-[0_0_30px_rgba(112,137,186,0.15)] space-y-4 overflow-hidden">
        {/* Subtle CAD grid pattern and ambient glow */}
        <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#7089ba]/15 rounded-full blur-3xl pointer-events-none" />

        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="mx-auto font-mono text-[9px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>[DIRECT_AIRDROP_TUNNEL]</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white">
            {status === 'prompt' && 'Incoming Peer Transfer'}
            {status === 'transferring' && 'Streaming Encrypted Payload'}
            {status === 'completed' && 'Transfer Completed'}
            {status === 'declined' && 'Transfer Declined'}
            {status === 'error' && 'Transfer Interrupted'}
          </DialogTitle>
          <DialogDescription className="text-xs text-steel font-mono">
            {status === 'prompt' && `> SENDER: ${request.senderDeviceName} wants to stream ${request.files.length} file(s) via direct local tunnel.`}
            {status === 'transferring' && `> PIPING CHUNKS: Streaming binary data directly from ${request.senderDeviceName}...`}
            {status === 'completed' && `> STATUS_OK: Payload verified & decrypted from ${request.senderDeviceName}.`}
            {status === 'declined' && '> STATUS_REJECTED: Transfer request declined.'}
            {status === 'error' && (errorMsg || '> STATUS_ERROR: Connection interrupted during transfer.')}
          </DialogDescription>
        </DialogHeader>

        {/* Center Visual Deck */}
        <div className="relative flex items-center justify-center py-2">
          {status === 'transferring' ? (
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-[#222]"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-[#7089ba] transition-all duration-300 ease-linear"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono tracking-tight text-white">{progressPercent}%</span>
                {speedMbps > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">{speedMbps.toFixed(1)} MB/s</span>
                )}
              </div>
            </div>
          ) : status === 'completed' ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
          ) : status === 'declined' ? (
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircleIcon className="w-8 h-8" />
            </div>
          ) : (
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#7089ba]/30 animate-ping duration-3000" />
              <div className="w-14 h-14 rounded-full bg-surface-alt border border-[#282828] flex items-center justify-center text-[#7089ba] shadow-sm">
                {isMobile ? <DeviceMobileIcon className="w-7 h-7" /> : <DesktopIcon className="w-7 h-7" />}
              </div>
            </div>
          )}
        </div>

        {/* File Preview Card */}
        <div className="p-3.5 rounded-xl bg-[#161616] border border-[#282828] text-left flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-carbon border border-[#282828] flex items-center justify-center shrink-0">
            {renderFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-mono font-bold text-white truncate">
              {firstFile ? firstFile.fileName : 'Incoming Payload'}
            </div>
            <div className="text-[10px] font-mono text-steel flex items-center gap-1.5 mt-0.5">
              <span>{formatBytes(request.totalBytes)}</span>
              {request.files.length > 1 && (
                <>
                  <span>·</span>
                  <span className="text-[#7089ba]">+{request.files.length - 1} more file(s)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        {status === 'prompt' && (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onDecline}
              className="py-2.5 px-4 rounded-full border border-[#282828] bg-carbon hover:bg-[#1f1f1f] text-steel hover:text-white font-mono text-xs font-semibold transition-all cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="py-2.5 px-4 rounded-full bg-white hover:bg-white/90 text-black font-mono font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Accept & Receive
            </button>
          </div>
        )}

        {status === 'transferring' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-steel">
              <span>{speedMbps > 0 ? `${speedMbps.toFixed(1)} MB/s` : 'Direct tunnel syncing...'}</span>
              <span>{etaSeconds && etaSeconds > 0 ? `ETA ~${formatEta(etaSeconds)}` : 'In progress'}</span>
            </div>
            <button
              type="button"
              onClick={onDecline}
              className="w-full py-2 rounded-full border border-[#282828] bg-carbon hover:bg-[#1f1f1f] text-steel hover:text-[#eb5757] hover:border-[#eb5757]/40 font-mono text-xs transition-colors cursor-pointer"
            >
              Cancel Transfer
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className="space-y-2 pt-1">
            {receivedFiles.length > 0 && receivedFiles[0] && (
              <a
                href={receivedFiles[0].blobUrl}
                download={receivedFiles[0].fileName}
                className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-white/90 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <DownloadSimpleIcon className="w-3.5 h-3.5" />
                <span>Save {receivedFiles[0].fileName}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-full border border-[#282828] bg-carbon hover:bg-[#1f1f1f] text-paper font-mono text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {(status === 'declined' || status === 'error') && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-full border border-[#282828] bg-carbon hover:bg-[#1f1f1f] text-paper font-mono text-xs transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
