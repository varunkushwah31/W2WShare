import React from 'react'
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
        return <ImageIcon className="w-8 h-8 text-sky-400" />
      case 'video':
        return <VideoCameraIcon className="w-8 h-8 text-purple-400" />
      case 'audio':
        return <MusicNotesIcon className="w-8 h-8 text-pink-400" />
      case 'archive':
        return <ArchiveIcon className="w-8 h-8 text-amber-400" />
      case 'code':
        return <CodeIcon className="w-8 h-8 text-emerald-400" />
      default:
        return <FileIcon className="w-8 h-8 text-blue-400" />
    }
  }

  // Circular progress calculations for AirDrop ring
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#18181b]/95 border border-white/10 shadow-2xl p-6 text-center text-white overflow-hidden backdrop-blur-2xl">
        {/* Subtle background ambient pulse glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#0071e3]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-[#30d158]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top AirDrop Radar Symbol */}
        <div className="relative flex items-center justify-center mb-4">
          {status === 'transferring' ? (
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-white/10"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  className="stroke-[#0071e3] transition-all duration-300 ease-linear"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono tracking-tight">{progressPercent}%</span>
                {speedMbps > 0 && (
                  <span className="text-[10px] text-steel font-mono">{speedMbps.toFixed(1)} MB/s</span>
                )}
              </div>
            </div>
          ) : status === 'completed' ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in zoom-in-90 duration-300">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
          ) : status === 'declined' ? (
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircleIcon className="w-10 h-10" />
            </div>
          ) : (
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#0071e3]/30 animate-ping duration-3000" />
              <div className="absolute inset-2 rounded-full border border-[#0071e3]/40" />
              <div className="w-16 h-16 rounded-full bg-[#0071e3]/15 border border-[#0071e3]/50 flex items-center justify-center shadow-lg shadow-[#0071e3]/10">
                {request.senderDeviceName.toLowerCase().includes('iphone') || request.senderDeviceName.toLowerCase().includes('android') ? (
                  <DeviceMobileIcon className="w-8 h-8 text-[#0071e3]" />
                ) : (
                  <DesktopIcon className="w-8 h-8 text-[#0071e3]" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sender & Context Header */}
        <div className="space-y-1 mb-5">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#0071e3] font-semibold">
            AirDrop
          </div>
          <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
            {request.senderDeviceName}
          </h3>
          <p className="text-xs text-white/60">
            {status === 'prompt' && 'would like to share with you'}
            {status === 'transferring' && 'Sending file via direct encrypted peer tunnel...'}
            {status === 'completed' && 'File transfer complete! Decrypted & verified.'}
            {status === 'declined' && 'AirDrop request was declined.'}
            {status === 'error' && (errorMsg || 'Transfer interrupted')}
          </p>
        </div>

        {/* File Preview Card */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-6 text-left flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            {renderFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {firstFile ? firstFile.fileName : 'Incoming Payload'}
            </div>
            <div className="text-[11px] font-mono text-white/50 flex items-center gap-1.5 mt-0.5">
              <span>{formatBytes(request.totalBytes)}</span>
              {request.files.length > 1 && (
                <>
                  <span>·</span>
                  <span className="text-[#0071e3]">+{request.files.length - 1} more</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        {status === 'prompt' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white/80 font-medium text-xs transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="py-2.5 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-lg shadow-[#0071e3]/25 transition-all cursor-pointer active:scale-95"
            >
              Accept
            </button>
          </div>
        )}

        {status === 'transferring' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
              <span>{speedMbps > 0 ? `${speedMbps.toFixed(1)} MB/s` : 'Connecting...'}</span>
              <span>{etaSeconds && etaSeconds > 0 ? `ETA ~${formatEta(etaSeconds)}` : 'In progress'}</span>
            </div>
            <button
              type="button"
              onClick={onDecline}
              className="w-full py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel Transfer
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className="space-y-3">
            {receivedFiles.length > 0 && receivedFiles[0] && (
              <a
                href={receivedFiles[0].blobUrl}
                download={receivedFiles[0].fileName}
                className="w-full py-2.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <DownloadSimpleIcon className="w-4 h-4" />
                <span>Save {receivedFiles[0].fileName}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {(status === 'declined' || status === 'error') && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
