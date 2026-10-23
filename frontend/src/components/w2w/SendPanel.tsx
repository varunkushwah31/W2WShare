import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { api, getWebSocketUrl, getLocalDeviceInfo, type FileMetadata, type DiscoveredPeer } from '@/lib/api'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
import { copyToClipboard } from '@/lib/clipboard'
import { WebRtcPeerManager } from '@/lib/webrtc'
import { TransferTelemetryChart } from './TransferTelemetryChart'
import { QrCodeModal } from './QrCodeModal'
import {
  UploadSimpleIcon,
  FolderSimpleIcon,
  FileIcon,
  TrashIcon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  FlameIcon,
  ShieldCheckIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  VideoCameraIcon,
  MusicNotesIcon,
  ArchiveIcon,
  CodeIcon,
  TimerIcon,
  LightningIcon,
  CameraIcon,
  ShareNetworkIcon,
  TelevisionSimpleIcon,
  PlusCircleIcon,
  PaperPlaneRightIcon,
  DesktopIcon,
  DeviceMobileIcon,
  BroadcastIcon,
} from '@phosphor-icons/react'
import { Slider } from '@/components/ui/slider'
import { detectFileTypeCategory, type FileCategoryType, calculateOptimalChunkSize } from '@/lib/fileCategories'
import { useWakeLock } from '@/lib/useWakeLock'

interface ExpiryPreset {
  minutes: number
  label: string
  fullLabel: string
  tag: string
  description: string
}

const EXPIRY_PRESETS: readonly ExpiryPreset[] = [
  { minutes: 5, label: '5m', fullLabel: '5 minutes', tag: 'EPHEMERAL', description: 'Ultra-fast auto-destruct window' },
  { minutes: 15, label: '15m', fullLabel: '15 minutes', tag: 'STANDARD', description: 'Optimal for quick local P2P transfers' },
  { minutes: 30, label: '30m', fullLabel: '30 minutes', tag: 'COLLAB', description: 'Convenient for team collaboration' },
  { minutes: 60, label: '1h', fullLabel: '1 hour', tag: 'EXTENDED', description: 'Generous transfer & claim window' },
  { minutes: 360, label: '6h', fullLabel: '6 hours', tag: 'HALF-DAY', description: 'Extended multi-device claim time' },
  { minutes: 1440, label: '24h', fullLabel: '24 hours', tag: 'FULL DAY', description: 'Maximum vault retention limit' },
] as const

interface SelectedFileItem {
  file: File
  relativePath: string
  size: number
  previewUrl?: string
  typeCategory: FileCategoryType
}

interface PreparedFile {
  item: SelectedFileItem
  keyObj: import('@/lib/crypto').DerivedKeyObj
  metadata: FileMetadata
  compressedBlob?: Blob
}

interface SendPanelProps {
  selectedInterface?: import('@/lib/api').NetworkInterfaceDto | null
  targetPeer?: import('@/lib/api').DiscoveredPeer | null
  onClearTargetPeer?: () => void
  onSessionCreated?: (sessionId: string, pin: string) => void
}

const resolveJoinUrl = (
  sessionJoinUrl: string,
  pin: string,
  selectedInterface?: import('@/lib/api').NetworkInterfaceDto | null
): string => {
  if (selectedInterface?.url) {
    return `${selectedInterface.url}/?pin=${pin}&code=${pin}&mode=receiver`
  }
  if (typeof window === 'undefined') return sessionJoinUrl
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal && window.location.origin) {
    return `${window.location.origin}/?pin=${pin}&code=${pin}&mode=receiver`
  }
  return sessionJoinUrl ? `${sessionJoinUrl}&code=${pin}&mode=receiver` : `${window.location.origin}/?pin=${pin}&code=${pin}&mode=receiver`
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const formatEta = (seconds: number): string => {
  if (seconds < 60) return `~${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `~${mins}m ${secs}s`
}

/**
 * Slices and encrypts ONLY the requested chunk on the fly.
 * Keeps browser RAM usage capped at ~20-60MB regardless of total file size (even 50GB).
 */
const getChunkSlice = async (
  prepared: PreparedFile,
  chunkIndex: number
): Promise<Uint8Array> => {
  const source = prepared.compressedBlob || prepared.item.file
  const chunkSize = prepared.metadata.chunkSize || 2 * 1024 * 1024
  const start = chunkIndex * chunkSize
  const end = Math.min(start + chunkSize, source.size)
  const sliceBlob = source.slice(start, end)
  const sliceBuffer = await sliceBlob.arrayBuffer()
  return cryptoEngine.encryptChunk(
    sliceBuffer,
    prepared.keyObj,
    chunkIndex,
    prepared.metadata.iv
  )
}

const prepareSingleFile = async (
  item: SelectedFileItem,
  pin: string,
  burnAfter: boolean,
  enableCompression: boolean,
  sessionSalt?: string
): Promise<PreparedFile> => {
  let isCompressed = false
  let compressedBlob: Blob | undefined
  let effectiveSize = item.size

  // Only compress small-to-medium files (< 50MB) to conserve RAM
  if (enableCompression && item.size < 50 * 1024 * 1024 && compressor.shouldCompress(item.file.name, item.file.type)) {
    try {
      const rawBuffer = await item.file.arrayBuffer()
      const compBuffer = await compressor.compressBuffer(rawBuffer)
      if (compBuffer.byteLength < rawBuffer.byteLength) {
        compressedBlob = new Blob([compBuffer])
        effectiveSize = compBuffer.byteLength
        isCompressed = true
      }
    } catch {
      // non-fatal fallback
    }
  }

  const salt = sessionSalt || cryptoEngine.generateSalt(16)
  const iv = cryptoEngine.generateIv(12)
  const keyObj = await cryptoEngine.deriveKey(pin, salt)

  let sha256 = ''
  if (item.size <= 100 * 1024 * 1024) {
    try {
      const buf = compressedBlob ? await compressedBlob.arrayBuffer() : await item.file.arrayBuffer()
      sha256 = await cryptoEngine.calculateSha256(buf)
    } catch {
      // non-fatal
    }
  }

  const chunkSize = calculateOptimalChunkSize(effectiveSize)
  const totalChunks = Math.ceil(effectiveSize / chunkSize) || 1

  const metadata: FileMetadata = {
    fileName: item.file.name,
    relativePath: item.relativePath,
    fileSize: effectiveSize,
    originalSize: item.size,
    mimeType: item.file.type || 'application/octet-stream',
    totalChunks,
    chunkSize,
    iv,
    salt,
    sha256,
    burnAfterReading: burnAfter,
    isCompressed,
  }

  return {
    item,
    keyObj,
    metadata,
    compressedBlob,
  }
}

async function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const dirReader = dirEntry.createReader()
  const readBatch = async (): Promise<FileSystemEntry[]> => {
    const batch: FileSystemEntry[] = await new Promise((resolve) =>
      dirReader.readEntries(resolve, () => resolve([]))
    )
    if (batch.length === 0) return []
    const next = await readBatch()
    return batch.concat(next)
  }
  return readBatch()
}

async function sendSingleChunk(
  targetSessionId: string,
  fIdx: number,
  cIdx: number,
  chunkData: Uint8Array,
  attempt = 0
): Promise<void> {
  try {
    await api.uploadFileChunk(targetSessionId, fIdx, cIdx, chunkData)
  } catch (err) {
    if (attempt >= 2) throw err
    await new Promise((res) => setTimeout(res, (attempt + 1) * 150))
    return sendSingleChunk(targetSessionId, fIdx, cIdx, chunkData, attempt + 1)
  }
}

async function recordSentAuditLog(
  preparedFiles: PreparedFile[],
  burnAfter: boolean,
  persistVault = false
): Promise<void> {
  await Promise.all(
    preparedFiles.map(async (prep) => {
      const txId = cryptoEngine.generateSecureTxId()
      try {
        await api.recordAuditTransaction({
          id: txId,
          timestamp: Date.now(),
          direction: 'SENT',
          fileName: prep.metadata.fileName,
          fileSize: prep.metadata.fileSize,
          totalChunks: prep.metadata.totalChunks,
          sha256: prep.metadata.sha256,
          cipher: 'AES-256-GCM / PBKDF2 (100k)',
          burned: burnAfter,
          isCompressed: !!prep.metadata.isCompressed,
        })

        // Wire up 7-day database vault persistence for non-burned items
        if (persistVault && !burnAfter && prep.item.file.size <= 50 * 1024 * 1024) {
          try {
            await api.persistAuditFile(txId, prep.item.file, prep.metadata.mimeType)
          } catch {
            // Non-blocking vault persistence
          }
        }
      } catch {
        // Non-blocking audit persistence fallback
      }
    })
  )
}

async function traverseFileSystemEntry(
  entry: FileSystemEntry | null,
  path = ''
): Promise<SelectedFileItem[]> {
  if (!entry) return []
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    return new Promise((resolve) => {
      fileEntry.file(
        (file: File) => {
          const typeCategory = detectFileTypeCategory(file.name, file.type)
          const previewUrl = typeCategory === 'image' ? URL.createObjectURL(file) : undefined
          resolve([
            {
              file,
              relativePath: path + file.name,
              size: file.size,
              previewUrl,
              typeCategory,
            },
          ])
        },
        () => resolve([])
      )
    })
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry
    const children = await readDirectoryEntries(dirEntry)
    const subItemsList = await Promise.all(
      children.map((child) => traverseFileSystemEntry(child, `${path}${entry.name}/`))
    )
    return subItemsList.flat()
  }
  return []
}

async function extractDroppedItems(items: DataTransferItemList): Promise<SelectedFileItem[]> {
  const itemLists = await Promise.all(
    Array.from(items).map(async (item) => {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
      if (entry) {
        return traverseFileSystemEntry(entry)
      }
      const file = item.getAsFile()
      if (file) {
        const typeCategory = detectFileTypeCategory(file.name, file.type)
        const previewUrl = typeCategory === 'image' ? URL.createObjectURL(file) : undefined
        return [
          {
            file,
            relativePath: file.name,
            size: file.size,
            previewUrl,
            typeCategory,
          },
        ]
      }
      return []
    })
  )
  return itemLists.flat()
}

function mapFilesToSelectedItems(fileList: FileList | File[]): SelectedFileItem[] {
  return Array.from(fileList).map((file) => {
    const typeCategory = detectFileTypeCategory(file.name, file.type)
    const previewUrl = typeCategory === 'image' ? URL.createObjectURL(file) : undefined
    return {
      file,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      size: file.size,
      previewUrl,
      typeCategory,
    }
  })
}

interface SignalingMessage {
  type: string
  payload?: unknown
}

function handleSignalingEvent(
  signal: SignalingMessage,
  rtc: WebRtcPeerManager,
  setPeerConnected: (v: boolean) => void,
  handleResendChunk: (fIdx: number, cIdx: number) => void,
  onStreamingNeeded: () => void,
  onAirDropStatusChange?: (accepted: boolean) => void
) {
  switch (signal.type) {
    case 'PEER_CONNECTED':
      setPeerConnected(true)
      soundEngine.peerConnect()
      void rtc.initSenderOffer()
      onStreamingNeeded()
      break
    case 'PEER_DISCONNECTED':
      setPeerConnected(false)
      break
    case 'WEBRTC_ANSWER':
      if (signal.payload) void rtc.handleRemoteAnswer(signal.payload as RTCSessionDescriptionInit)
      break
    case 'WEBRTC_ICE_CANDIDATE':
      if (signal.payload) void rtc.handleRemoteIceCandidate(signal.payload as RTCIceCandidateInit)
      break
    case 'AIRDROP_RESPONSE': {
      const payload = signal.payload as { accepted?: boolean } | undefined
      if (payload && typeof payload.accepted === 'boolean') {
        onAirDropStatusChange?.(payload.accepted)
        if (payload.accepted) {
          onStreamingNeeded()
        }
      }
      break
    }
    case 'RESEND_CHUNK': {
      const payload = signal.payload as { fileIndex?: unknown; chunkIndex?: unknown } | undefined
      if (typeof payload?.fileIndex === 'number' && typeof payload?.chunkIndex === 'number') {
        handleResendChunk(payload.fileIndex, payload.chunkIndex)
      }
      break
    }
    case 'REQUEST_WEBRTC_CHUNKS':
      onStreamingNeeded()
      break
  }
}

interface NearbyPeerCardProps {
  peer: DiscoveredPeer
  isTarget: boolean
  airDropStatus: string
  isTransferring: boolean
  hasFiles: boolean
  onSelect: (peer: DiscoveredPeer) => void
}

function getPeerButtonBadge(isTarget: boolean, airDropStatus: string, hasFiles: boolean) {
  if (isTarget && airDropStatus === 'waiting') {
    return {
      classes: 'border border-amber-400/40 bg-amber-400/10 text-amber-300 font-mono text-[10px]',
      label: '[WAITING...]',
    }
  }
  if (isTarget && airDropStatus === 'accepted') {
    return {
      classes: 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-400 font-mono text-[10px]',
      label: '[CONNECTED]',
    }
  }
  if (isTarget && airDropStatus === 'declined') {
    return {
      classes: 'border border-rose-400/40 bg-rose-400/10 text-rose-400 font-mono text-[10px]',
      label: '[DECLINED]',
    }
  }
  if (isTarget) {
    return {
      classes: 'border border-[#7089ba] bg-[#7089ba]/20 text-white font-mono text-[10px] shadow-[0_0_10px_rgba(112,137,186,0.2)]',
      label: hasFiles ? 'TRANSMIT FILES →' : 'TARGET ACTIVE',
    }
  }
  return {
    classes: 'border border-[#282828] bg-carbon text-steel font-mono text-[10px] group-hover:text-black group-hover:bg-white group-hover:border-white shadow-xs',
    label: hasFiles ? 'TRANSMIT FILES →' : 'SELECT TARGET',
  }
}

const NearbyPeerCard: React.FC<NearbyPeerCardProps> = ({
  peer,
  isTarget,
  airDropStatus,
  isTransferring,
  hasFiles,
  onSelect,
}) => {
  const isMobile = peer.os?.toLowerCase().includes('android') || peer.os?.toLowerCase().includes('ios')
  const badge = getPeerButtonBadge(isTarget, airDropStatus, hasFiles)

  return (
    <button
      key={peer.deviceId}
      type="button"
      onClick={() => onSelect(peer)}
      disabled={isTransferring && !isTarget}
      className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer relative overflow-hidden ${
        isTarget
          ? 'border-[#7089ba] bg-[#161616] shadow-[0_0_15px_rgba(112,137,186,0.15)] ring-1 ring-[#7089ba]/50'
          : 'border-[#242424] bg-surface-alt/70 hover:border-[#7089ba]/60 hover:bg-[#181818]'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-8 h-8 rounded-lg bg-carbon border border-[#282828] flex items-center justify-center text-[#7089ba] group-hover:text-white transition-colors">
          {isMobile ? <DeviceMobileIcon className="w-4 h-4" /> : <DesktopIcon className="w-4 h-4" />}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-carbon border border-[#242424]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[9px] text-steel font-bold uppercase tracking-wider">ONLINE</span>
        </div>
      </div>

      <div className="min-w-0 w-full space-y-1">
        <div className="text-xs font-mono font-bold text-white truncate group-hover:text-white">
          {peer.deviceName || 'Nearby Device'}
        </div>
        <div className="text-[10px] text-steel font-mono truncate flex items-center gap-1.5">
          <span className="font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-1.5 py-0.5 rounded border border-[#7089ba]/20 font-bold uppercase tracking-wider">
            {peer.os || 'PEER'}
          </span>
          <span>·</span>
          <span>{peer.ip}</span>
        </div>
      </div>

      <div className={`w-full py-1.5 px-2 rounded-full font-medium transition-all text-center flex items-center justify-center gap-1.5 ${badge.classes}`}>
        {isTarget && airDropStatus === 'waiting' && <ArrowsClockwiseIcon className="w-3 h-3 animate-spin" />}
        {isTarget && airDropStatus === 'accepted' && <CheckCircleIcon className="w-3 h-3" />}
        <span>{badge.label}</span>
      </div>
    </button>
  )
}

function renderSessionStatusIndicator(transferDone: boolean, isTransferring: boolean) {
  if (transferDone) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#7089ba] font-mono">
        <CheckCircleIcon className="w-4 h-4" weight="bold" />
        <span>Payload ready on local network. Receiver can claim PIN.</span>
      </div>
    )
  }
  if (isTransferring) {
    return (
      <div className="flex items-center gap-2 text-xs text-steel font-mono">
        <ArrowsClockwiseIcon className="w-4 h-4 animate-spin text-[#7089ba]" />
        <span>Live streaming payload directly to peer...</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-amber-300 font-mono">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
      <span>Waiting for receiver to connect and claim PIN...</span>
    </div>
  )
}

function useFileStaging() {
  const [files, setFiles] = useState<SelectedFileItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...mapFilesToSelectedItems(newFiles)])
  }, [])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const collected = await extractDroppedItems(e.dataTransfer.items)
      if (collected.length > 0) {
        setFiles((prev) => [...prev, ...collected])
        return
      }
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }, [addFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }, [addFiles])

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFiles = e.target.files
    if (targetFiles && targetFiles.length > 0) {
      setFiles((prev) => [...prev, ...mapFilesToSelectedItems(targetFiles)])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const item = prev[index]
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
      return []
    })
  }, [])

  const totalBytes = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files])

  return {
    files,
    setFiles,
    fileInputRef,
    folderInputRef,
    cameraInputRef,
    handleFileDrop,
    handleFileInput,
    handleFolderInput,
    removeFile,
    clearFiles,
    totalBytes,
  }
}

function useAirDropDiscovery(targetPeer?: DiscoveredPeer | null) {
  const [nearbyPeers, setNearbyPeers] = useState<DiscoveredPeer[]>([])
  const [selectedAirDropPeer, setSelectedAirDropPeer] = useState<DiscoveredPeer | null>(null)
  const [airDropStatus, setAirDropStatus] = useState<'idle' | 'waiting' | 'accepted' | 'declined' | 'transferring'>('idle')
  const airDropTargetPeer = selectedAirDropPeer || targetPeer

  useEffect(() => {
    let cancelled = false
    const pollPeers = async () => {
      try {
        const peers = await api.getDiscoveredPeers()
        if (!cancelled) setNearbyPeers(peers)
      } catch {
        // Non-blocking discovery
      }
    }
    void pollPeers()
    const timer = setInterval(pollPeers, 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return {
    nearbyPeers,
    selectedAirDropPeer,
    setSelectedAirDropPeer,
    airDropStatus,
    setAirDropStatus,
    airDropTargetPeer,
  }
}

interface StagedFilesQueueProps {
  files: SelectedFileItem[]
  totalBytes: number
  burnAfter: boolean
  setBurnAfter: (v: boolean) => void
  persistVault: boolean
  setPersistVault: (v: boolean) => void
  enableCompression: boolean
  setEnableCompression: (v: boolean) => void
  setExpiryMinutes: (v: number) => void
  activePresetIndex: number
  activePreset: ExpiryPreset
  getVaultButtonClass: () => string
  onClearFiles: () => void
  onRemoveFile: (idx: number) => void
  onStartTransfer: () => void
  isTransferring: boolean
}

const StagedFilesQueue: React.FC<StagedFilesQueueProps> = ({
  files,
  totalBytes,
  burnAfter,
  setBurnAfter,
  persistVault,
  setPersistVault,
  enableCompression,
  setEnableCompression,
  setExpiryMinutes,
  activePresetIndex,
  activePreset,
  getVaultButtonClass,
  onClearFiles,
  onRemoveFile,
  onStartTransfer,
  isTransferring,
}) => {
  return (
    <div className="dashed-container p-4 sm:p-8 rounded-2xl bg-carbon relative space-y-5">
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between dashed-divider-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-white font-bold tracking-tight">
              BATCH QUEUE ({files.length} {files.length === 1 ? 'FILE' : 'FILES'})
            </span>
            <span className="font-mono text-xs text-steel">
              · {formatBytes(totalBytes)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearFiles}
            className="text-xs font-mono text-steel hover:text-[#eb5757] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>

        {/* Staged File List */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {files.map((item, idx) => (
            <div
              key={`${item.relativePath}-${item.size}-${item.file.lastModified}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-carbon/70 border border-[#242424] text-xs hover:border-[#333] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.relativePath}
                    className="w-10 h-10 rounded-lg object-cover border border-[#7089ba]/30 shrink-0 bg-black"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center shrink-0">
                    {item.typeCategory === 'video' && <VideoCameraIcon className="w-5 h-5 text-purple-400" />}
                    {item.typeCategory === 'audio' && <MusicNotesIcon className="w-5 h-5 text-pink-400" />}
                    {item.typeCategory === 'archive' && <ArchiveIcon className="w-5 h-5 text-amber-400" />}
                    {item.typeCategory === 'code' && <CodeIcon className="w-5 h-5 text-emerald-400" />}
                    {item.typeCategory === 'document' && <FileIcon className="w-5 h-5 text-blue-400" />}
                    {item.typeCategory === 'other' && <FileIcon className="w-5 h-5 text-[#7089ba]" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-white font-mono font-medium">{item.relativePath}</div>
                  <div className="flex items-center gap-2 text-[10px] text-steel font-mono mt-0.5">
                    <span className="uppercase text-[#7089ba] font-bold">[{item.typeCategory}]</span>
                    <span>·</span>
                    <span>{formatBytes(item.size)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  className="p-1.5 rounded-lg text-steel hover:text-[#eb5757] hover:bg-[#eb5757]/10 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Transfer Configurations */}
        <div className="pt-2 dashed-divider-t space-y-4">
          {/* Options Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = !burnAfter
                setBurnAfter(next)
                if (next) setPersistVault(false)
              }}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                burnAfter
                  ? 'border-white bg-white text-black font-semibold shadow-xs'
                  : 'border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424]'
              }`}
            >
              <FlameIcon className={`w-3.5 h-3.5 ${burnAfter ? 'text-black' : 'text-[#7089ba]'}`} weight={burnAfter ? 'fill' : 'regular'} />
              <span>Burn After Reading</span>
            </button>

            <button
              type="button"
              disabled={burnAfter}
              onClick={() => !burnAfter && setPersistVault(!persistVault)}
              title={burnAfter ? 'Unavailable with Burn After Reading' : 'Retain encrypted file payload in local database for 7 days'}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 ${getVaultButtonClass()}`}
            >
              <ArchiveIcon className={`w-3.5 h-3.5 ${persistVault && !burnAfter ? 'text-black' : 'text-[#7089ba]'}`} weight={persistVault && !burnAfter ? 'fill' : 'regular'} />
              <span>7-Day Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setEnableCompression(!enableCompression)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                enableCompression
                  ? 'border-white bg-white text-black font-semibold shadow-xs'
                  : 'border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424]'
              }`}
            >
              <LightningIcon className={`w-3.5 h-3.5 ${enableCompression ? 'text-black' : 'text-[#7089ba]'}`} weight={enableCompression ? 'fill' : 'regular'} />
              <span>Gzip Pre-Compression</span>
            </button>
          </div>

          {/* Slider for Expiration Window */}
          <div className="p-4 rounded-2xl bg-carbon/50 dashed-container-subtle space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-carbon border border-[#282828] flex items-center justify-center text-[#7089ba]">
                  <TimerIcon className="w-3 h-3" />
                </div>
                <span className="text-steel">Expires:</span>
                <span className="text-white font-bold">{activePreset.fullLabel}</span>
              </div>
              <span className="font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20 font-bold uppercase tracking-wider">
                {activePreset.tag}
              </span>
            </div>

            {/* Slider Track */}
            <div className="px-1 py-0.5">
              <Slider
                value={[activePresetIndex !== -1 ? activePresetIndex : 1]}
                min={0}
                max={EXPIRY_PRESETS.length - 1}
                step={1}
                onValueChange={(val) => {
                  const preset = EXPIRY_PRESETS[val[0]]
                  if (preset) {
                    setExpiryMinutes(preset.minutes)
                  }
                }}
                aria-label="Expires in"
                className="w-full"
              />
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center justify-between gap-1 p-0.5 rounded-full bg-[#141414] border border-[#242424]">
              {EXPIRY_PRESETS.map((preset, idx) => {
                const isSelected = (activePresetIndex !== -1 ? activePresetIndex : 1) === idx
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setExpiryMinutes(preset.minutes)}
                    className={`flex-1 py-1 rounded-full text-center font-mono text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-xs'
                        : 'text-steel hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <button
          type="button"
          onClick={onStartTransfer}
          disabled={isTransferring}
          className="w-full py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <ShieldCheckIcon className="w-4 h-4" />
          <span>{persistVault ? 'Generate 7-Day Encrypted Vault' : 'Start Live Direct Transfer (P2P)'}</span>
        </button>
      </div>
    </div>
  )
}

interface ActiveTransferSessionViewProps {
  pin: string
  effectiveJoinUrl: string
  peerConnected: boolean
  isDirectP2p: boolean
  files: SelectedFileItem[]
  totalEncryptedBytes: number
  totalBytes: number
  uploadedBytes: number
  transferSpeedMbps: number
  transferEtaSeconds: number | null
  progressPercent: number
  statusMessage: string
  transferDone: boolean
  isTransferring: boolean
  enableCompression: boolean
  originalTotalBytes: number
  currentChunkInfo: { current: number; total: number }
  isScreenSharing: boolean
  screenStream: MediaStream | null
  liveNoteText: string
  setLiveNoteText: (v: string) => void
  liveNoteSent: boolean
  linkCopied: boolean
  liveFileInputRef: React.RefObject<HTMLInputElement | null>
  liveFolderInputRef: React.RefObject<HTMLInputElement | null>
  onOpenQrModal: () => void
  onCopyLink: () => void
  onNativeShare: () => void
  onToggleScreenShare: () => void
  onSendLiveNote: () => void
  onLiveAddFiles: (files: File[]) => void
  onLiveFileDrop: (e: React.DragEvent) => void
  onCancelSession: () => void
}

const ActiveTransferSessionView: React.FC<ActiveTransferSessionViewProps> = ({
  pin,
  peerConnected,
  isDirectP2p,
  files,
  totalEncryptedBytes,
  totalBytes,
  uploadedBytes,
  transferSpeedMbps,
  transferEtaSeconds,
  progressPercent,
  statusMessage,
  transferDone,
  isTransferring,
  enableCompression,
  originalTotalBytes,
  currentChunkInfo,
  isScreenSharing,
  screenStream,
  liveNoteText,
  setLiveNoteText,
  liveNoteSent,
  linkCopied,
  liveFileInputRef,
  liveFolderInputRef,
  onOpenQrModal,
  onCopyLink,
  onNativeShare,
  onToggleScreenShare,
  onSendLiveNote,
  onLiveAddFiles,
  onLiveFileDrop,
  onCancelSession,
}) => {
  return (
    <div className="dashed-container p-4 sm:p-8 rounded-2xl bg-carbon relative space-y-6">
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />

      {/* Top Banner: PIN Display & QR/Share Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 dashed-divider-b">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba]">
              OFFLINE CLAIM PIN / ROOM CODE
            </span>
            <span className="font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-1.5 py-0.2 rounded border border-[#7089ba]/20 font-bold">
              MANGO-P2P READY
            </span>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-white mt-1">
            {pin}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenQrModal}
            className="p-2.5 rounded-full bg-carbon border border-[#282828] text-white hover:border-[#7089ba]/60 hover:text-[#7089ba] transition-all cursor-pointer"
            title="Show QR Code"
          >
            <QrCodeIcon className="w-5 h-5" />
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={onNativeShare}
              className="px-3.5 py-2 rounded-full bg-[#7089ba]/15 text-[#7089ba] border border-[#7089ba]/30 hover:bg-[#7089ba]/25 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Share PIN and link via mobile sheet"
            >
              <ShareNetworkIcon className="w-3.5 h-3.5" />
              <span>Share PIN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCopyLink}
            className="px-3.5 py-2 rounded-full bg-carbon border border-[#282828] text-white text-xs font-mono hover:border-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {linkCopied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" weight="bold" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Peer Presence Banner (Inspired by MangoShare) */}
      <div
        className={`p-3.5 rounded-xl border font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all ${
          peerConnected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm'
            : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              peerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{peerConnected ? 'RECEIVER CONNECTED' : 'WAITING FOR RECEIVER TO JOIN...'}</span>
              {isDirectP2p && (
                <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30">
                  WEBRTC DIRECT P2P
                </span>
              )}
            </div>
            <div className="text-[10px] text-steel mt-0.5">
              {peerConnected
                ? 'High-speed browser-to-browser encrypted pipe established.'
                : 'Share PIN with recipient on this Wi-Fi / Hotspot to initiate transfer.'}
            </div>
          </div>
        </div>
        {peerConnected && (
          <span className="text-[10px] text-emerald-400/80 font-mono self-end sm:self-center">
            Zero Cloud Storage
          </span>
        )}
      </div>

      {/* Live Mango-style Dynamic Streaming Room Controls */}
      <div className="p-4 rounded-2xl bg-carbon/50 border border-[#242424] space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7089ba]" />
            Live Room Utilities
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={`px-3 py-1.5 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                isScreenSharing
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-sm'
                  : 'border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424]'
              }`}
            >
              <TelevisionSimpleIcon className="w-3.5 h-3.5" />
              <span>{isScreenSharing ? 'Stop Screen Cast' : 'Cast Display'}</span>
            </button>

            <button
              type="button"
              onClick={() => liveFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full border border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424] text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircleIcon className="w-3.5 h-3.5 text-[#7089ba]" />
              <span>Add Files</span>
            </button>

            <button
              type="button"
              onClick={() => liveFolderInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full border border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424] text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FolderSimpleIcon className="w-3.5 h-3.5 text-[#7089ba]" />
              <span>Add Folder</span>
            </button>

            <input
              ref={liveFileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onLiveAddFiles(Array.from(e.target.files))
                }
              }}
              className="hidden"
            />
            <input
              ref={liveFolderInputRef}
              type="file"
              // @ts-expect-error non-standard webkitdirectory attribute
              webkitdirectory=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onLiveAddFiles(Array.from(e.target.files))
                }
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Live Drop Target Area */}
        <button
          type="button"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onLiveFileDrop}
          onClick={() => liveFileInputRef.current?.click()}
          className="w-full border border-dashed border-[#2e2e2e] hover:border-[#7089ba]/60 bg-[#121212] rounded-xl p-3 text-center cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-steel">
            <PlusCircleIcon className="w-4 h-4 text-[#7089ba]" />
            <span>Drop files or folders here to dynamically stream to peer</span>
          </div>
        </button>

        {/* Live Screen Casting Active Notice */}
        {isScreenSharing && screenStream && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-bold">LIVE SCREEN CAST ACTIVE</span>
              <span className="text-[10px] text-steel">· Streaming display to receiver via WebRTC</span>
            </div>
            <button
              type="button"
              onClick={onToggleScreenShare}
              className="px-2.5 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[11px] cursor-pointer"
            >
              Stop Screen Cast
            </button>
          </div>
        )}

        {/* Live Room Files Manifest */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-steel">
              <span>ROOM MANIFEST ({files.length} {files.length === 1 ? 'FILE' : 'FILES'})</span>
              <span>{formatBytes(totalEncryptedBytes || totalBytes)}</span>
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {files.map((item, idx) => (
                <div
                  key={`${item.relativePath}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#222] text-xs font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileIcon className="w-3.5 h-3.5 text-[#7089ba] shrink-0" />
                    <span className="truncate text-white">{item.relativePath}</span>
                    <span className="text-[10px] text-steel shrink-0">· {formatBytes(item.size)}</span>
                  </div>
                  <span className="text-[9px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded font-bold shrink-0">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Quick Note / Clipboard Relay Input */}
        <div className="pt-2 dashed-divider-t flex gap-2 items-center">
          <input
            type="text"
            value={liveNoteText}
            onChange={(e) => setLiveNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendLiveNote()}
            placeholder="Type note or paste text/URL to beam instantly to receiver clipboard..."
            className="flex-1 bg-[#121212] border border-[#282828] rounded-full px-3.5 py-1.5 text-xs text-white placeholder-graphite font-mono focus:outline-hidden focus:border-[#7089ba]/60"
          />
          <button
            type="button"
            onClick={onSendLiveNote}
            disabled={!liveNoteText.trim()}
            className="px-3 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-30 transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            {liveNoteSent ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Beamed!</span>
              </>
            ) : (
              <>
                <PaperPlaneRightIcon className="w-3.5 h-3.5" />
                <span>Beam</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress & Speed Telemetry Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-paper flex items-center gap-2">
            <span>Progress: {progressPercent}%</span>
            {currentChunkInfo.total > 0 && (
              <span className="text-steel text-[10px]">({currentChunkInfo.current}/{currentChunkInfo.total} chunks)</span>
            )}
          </span>
          <span className="text-steel">
            {formatBytes(uploadedBytes)} / {formatBytes(totalEncryptedBytes || totalBytes)}
            {transferEtaSeconds !== null && transferEtaSeconds > 0 && (
              <span className="text-[#7089ba] ml-2">ETA: {formatEta(transferEtaSeconds)}</span>
            )}
          </span>
        </div>

        {/* Segmented Progress Track */}
        <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#282828]">
          <div
            className="h-full bg-white transition-all duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono pt-1 text-steel">
          <span className="truncate max-w-sm">
            {transferDone
              ? 'Transfer completed! Receiver claimed payload.'
              : statusMessage}
          </span>
          {transferSpeedMbps > 0 && (
            <span className="text-emerald-400 font-semibold">{transferSpeedMbps.toFixed(2)} MB/s</span>
          )}
        </div>
      </div>

      {/* Live Real-Time Telemetry & Throughput Chart */}
      <TransferTelemetryChart
        currentSpeedMbps={transferSpeedMbps}
        totalBytes={totalEncryptedBytes || totalBytes}
        transferredBytes={uploadedBytes}
        isDirectP2p={isDirectP2p}
        isCompressed={enableCompression}
        originalSizeBytes={originalTotalBytes}
        currentChunk={currentChunkInfo.current}
        totalChunks={currentChunkInfo.total}
      />

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        {renderSessionStatusIndicator(transferDone, isTransferring)}

        <button
          type="button"
          onClick={onCancelSession}
          className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-steel hover:text-[#eb5757] hover:border-[#eb5757]/40 transition-colors cursor-pointer"
        >
          Terminate Session
        </button>
      </div>
    </div>
  )
}

export const SendPanel: React.FC<SendPanelProps> = ({
  selectedInterface,
  targetPeer,
  onClearTargetPeer,
  onSessionCreated,
}) => {
  const {
    files,
    setFiles,
    fileInputRef,
    folderInputRef,
    cameraInputRef,
    handleFileDrop,
    handleFileInput,
    handleFolderInput,
    removeFile,
    clearFiles,
    totalBytes,
  } = useFileStaging()

  const {
    nearbyPeers,
    setSelectedAirDropPeer,
    airDropStatus,
    setAirDropStatus,
    airDropTargetPeer,
  } = useAirDropDiscovery(targetPeer)

  const [burnAfter, setBurnAfter] = useState(false)
  const [expiryMinutes, setExpiryMinutes] = useState(15)
  const [enableCompression, setEnableCompression] = useState(true)
  const [persistVault, setPersistVault] = useState(false)

  const activePresetIndex = Math.max(
    0,
    EXPIRY_PRESETS.findIndex((p) => p.minutes === expiryMinutes)
  )
  const activePreset = EXPIRY_PRESETS[activePresetIndex !== -1 ? activePresetIndex : 1]

  // Transfer state
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferDone, setTransferDone] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentChunkInfo, setCurrentChunkInfo] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [transferSpeedMbps, setTransferSpeedMbps] = useState(0)
  const [transferEtaSeconds, setTransferEtaSeconds] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)

  // Real-time Peer Connection Presence (MangoShare inspired)
  const [peerConnected, setPeerConnected] = useState(false)

  // Telemetry & WebRTC state
  const [isDirectP2p, setIsDirectP2p] = useState(false)
  const [totalEncryptedBytes, setTotalEncryptedBytes] = useState(0)
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [originalTotalBytes, setOriginalTotalBytes] = useState(0)
  const preparedFilesRef = useRef<PreparedFile[]>([])
  const sessionSaltRef = useRef<string | null>(null)
  const rtcManagerRef = useRef<WebRtcPeerManager | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const isStreamingRtcRef = useRef(false)

  // Live Screen Sharing & Live Notes
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [liveNoteText, setLiveNoteText] = useState('')
  const [liveNoteSent, setLiveNoteSent] = useState(false)
  const liveFileInputRef = useRef<HTMLInputElement>(null)
  const liveFolderInputRef = useRef<HTMLInputElement>(null)

  // Screen WakeLock to prevent mobile browsers from sleeping during transfer
  const { acquireWakeLock, releaseWakeLock } = useWakeLock(isTransferring)

  // Selective chunk retransmission handler
  const handleResendChunk = useCallback(async (fIdx: number, cIdx: number) => {
    const prep = preparedFilesRef.current[fIdx]
    if (!prep) return
    try {
      const chunkData = await getChunkSlice(prep, cIdx)
      const rtc = rtcManagerRef.current
      if (rtc) {
        await rtc.sendChunk(fIdx, cIdx, prep.metadata.totalChunks, chunkData, wsRef.current)
      } else if (sessionId) {
        await api.uploadFileChunk(sessionId, fIdx, cIdx, chunkData)
      }
    } catch (err) {
      console.warn(`[Retransmit] Failed to resend chunk ${fIdx}-${cIdx}:`, err)
    }
  }, [sessionId])

  // Live direct streaming handler: Streams chunks directly to receiver via WebRTC / WebSocket relay with telemetry
  const streamLiveToPeer = useCallback(async (prepared: PreparedFile[]) => {
    const rtc = rtcManagerRef.current
    const ws = wsRef.current
    if (prepared.length === 0 || isStreamingRtcRef.current) return
    if (!rtc?.isChannelOpen() && ws?.readyState !== WebSocket.OPEN) return

    isStreamingRtcRef.current = true
    setIsTransferring(true)
    setTransferDone(false)
    await acquireWakeLock()

    const totalBytesAllFiles = prepared.reduce(
      (acc, p) => acc + p.metadata.fileSize,
      0
    )
    let uploadedBytesTotal = 0
    const startTime = Date.now()

    try {
      setStatusMessage('Streaming live encrypted chunks directly to peer...')

      const streamSingleFile = async (fIdx: number): Promise<void> => {
        if (fIdx >= prepared.length) return
        const p = prepared[fIdx]
        const totalChunks = p.metadata.totalChunks

        const sendChunkStep = async (cIdx: number): Promise<void> => {
          if (cIdx >= totalChunks) return
          const chunkData = await getChunkSlice(p, cIdx)
          const sent = rtc
            ? await rtc.sendChunk(fIdx, cIdx, totalChunks, chunkData, wsRef.current)
            : false

          if (!sent && persistVault && sessionId) {
            await api.uploadFileChunk(sessionId, fIdx, cIdx, chunkData)
          }

          uploadedBytesTotal += chunkData.length
          setUploadedBytes(uploadedBytesTotal)
          setCurrentChunkInfo({ current: cIdx + 1, total: totalChunks })

          const elapsedSec = (Date.now() - startTime) / 1000
          if (elapsedSec > 0) {
            const speed = uploadedBytesTotal / (1024 * 1024) / elapsedSec
            setTransferSpeedMbps(speed)
            const remainingBytes = Math.max(0, totalBytesAllFiles - uploadedBytesTotal)
            if (speed > 0) {
              setTransferEtaSeconds(Math.max(1, Math.round(remainingBytes / (speed * 1024 * 1024))))
            }
          }

          const percent = Math.min(
            99,
            Math.round((uploadedBytesTotal / totalBytesAllFiles) * 100)
          )
          setProgressPercent(percent)
          setStatusMessage(`Live streaming chunk (${cIdx + 1}/${totalChunks}) - ${p.metadata.fileName}`)

          return sendChunkStep(cIdx + 1)
        }

        await sendChunkStep(0)
        return streamSingleFile(fIdx + 1)
      }

      await streamSingleFile(0)

      setProgressPercent(100)
      setTransferEtaSeconds(0)
      setIsTransferring(false)
      setTransferDone(true)
      setStatusMessage('Live direct stream completed! All chunks delivered to peer.')
      soundEngine.transferComplete()

      await recordSentAuditLog(prepared, burnAfter, persistVault)
    } catch (err) {
      console.warn('Live direct stream error:', err)
      setStatusMessage(`Live stream error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      isStreamingRtcRef.current = false
      await releaseWakeLock()
    }
  }, [acquireWakeLock, releaseWakeLock, burnAfter, persistVault, sessionId])

  // Connect WebSocket signaling and setup WebRTC when session is active
  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) wsRef.current.close()
      if (rtcManagerRef.current) rtcManagerRef.current.close()
      return
    }

    const rtc = new WebRtcPeerManager('sender')
    rtcManagerRef.current = rtc

    rtc.onStateChange((state, stats) => {
      setIsDirectP2p(stats.isDirectP2p)
      if (stats.currentMbps > 0) {
        setTransferSpeedMbps(stats.currentMbps)
      }
      if (state === 'CONNECTED' && preparedFilesRef.current.length > 0) {
        void streamLiveToPeer(preparedFilesRef.current)
      }
    })

    rtc.onResendChunk((fileIndex, chunkIndex) => {
      void handleResendChunk(fileIndex, chunkIndex)
    })

    rtc.onRequestChunks(() => {
      if (preparedFilesRef.current.length > 0) {
        void streamLiveToPeer(preparedFilesRef.current)
      }
    })

    const wsUrl = getWebSocketUrl('/ws/signaling')

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    rtc.setSignalingSender((signal) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(signal))
      }
    })

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'REGISTER_SENDER', payload: sessionId }))
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        rtc.handleBinaryPacket(event.data)
        return
      }
      try {
        const signal = JSON.parse(event.data)
        handleSignalingEvent(
          signal,
          rtc,
          setPeerConnected,
          (fIdx, cIdx) => void handleResendChunk(fIdx, cIdx),
          () => {
            if (preparedFilesRef.current.length > 0) {
              void streamLiveToPeer(preparedFilesRef.current)
            }
          },
          (accepted) => setAirDropStatus(accepted ? 'accepted' : 'declined')
        )
      } catch (err) {
        console.warn('Signaling message error:', err)
      }
    }

    ws.onerror = (err) => {
      console.warn('[Signaling] Sender WebSocket error, keeping fallback active:', err)
    }

    ws.onclose = () => {
      console.debug('[Signaling] Sender WebSocket closed')
    }

    return () => {
      try {
        ws.close()
      } catch {
        // Socket already closed
      }
      rtc.close()
    }
  }, [sessionId, streamLiveToPeer, handleResendChunk, setAirDropStatus])

  const streamPreparedFiles = useCallback(async (
    targetSessionId: string,
    preparedFiles: PreparedFile[],
    baseFileIndex = 0
  ) => {
    let uploadedBytesTotal = 0
    const totalBytesAllFiles = preparedFiles.reduce(
      (acc, p) => acc + p.metadata.fileSize,
      0
    )
    setTotalEncryptedBytes((prev) => (baseFileIndex > 0 ? prev + totalBytesAllFiles : totalBytesAllFiles))
    const startTime = Date.now()
    const UPLOAD_CONCURRENCY = 6

    const uploadFileSequential = async (fileIdx: number): Promise<void> => {
      if (fileIdx >= preparedFiles.length) return
      const prep = preparedFiles[fileIdx]
      const fIdx = baseFileIndex + fileIdx
      const totalChunks = prep.metadata.totalChunks

      let nextChunkIdx = 0
      let completedChunks = 0

      const runWorker = async (): Promise<void> => {
        const cIdx = nextChunkIdx++
        if (cIdx >= totalChunks) return

        // Slices and encrypts chunk on the fly
        const chunkData = await getChunkSlice(prep, cIdx)
        await sendSingleChunk(targetSessionId, fIdx, cIdx, chunkData)

        completedChunks++
        uploadedBytesTotal += chunkData.length
        setUploadedBytes(uploadedBytesTotal)
        setCurrentChunkInfo({ current: completedChunks, total: totalChunks })

        const elapsedSec = (Date.now() - startTime) / 1000
        if (elapsedSec > 0) {
          const speed = uploadedBytesTotal / (1024 * 1024) / elapsedSec
          setTransferSpeedMbps(speed)
          const remainingBytes = Math.max(0, totalBytesAllFiles - uploadedBytesTotal)
          if (speed > 0) {
            setTransferEtaSeconds(Math.max(1, Math.round(remainingBytes / (speed * 1024 * 1024))))
          }
        }

        const percent = Math.min(
          99,
          Math.round((uploadedBytesTotal / totalBytesAllFiles) * 100)
        )
        setProgressPercent(percent)
        setStatusMessage(`Streaming chunks (${completedChunks}/${totalChunks})`)

        return runWorker()
      }

      const workers = Array.from(
        { length: Math.min(UPLOAD_CONCURRENCY, totalChunks) },
        () => runWorker()
      )
      await Promise.all(workers)
      return uploadFileSequential(fileIdx + 1)
    }

    await uploadFileSequential(0)
    setTransferEtaSeconds(0)
  }, [])

  const startAirDropToPeer = async (peer: DiscoveredPeer) => {
    setSelectedAirDropPeer(peer)
    setAirDropStatus('waiting')

    if (files.length === 0) {
      fileInputRef.current?.click()
      return
    }

    try {
      setIsTransferring(true)
      setStatusMessage(`Requesting AirDrop to ${peer.deviceName}...`)
      await acquireWakeLock()

      const totalRaw = files.reduce((acc, f) => acc + f.size, 0)
      setOriginalTotalBytes(totalRaw)

      // 1. Create offline transfer session
      const sessionRes = await api.createSession({
        burnAfterReading: burnAfter,
        expiresInSeconds: expiryMinutes * 60,
      })
      setSessionId(sessionRes.sessionId)
      setPin(sessionRes.pin)
      setJoinUrl(sessionRes.joinUrl)
      onSessionCreated?.(sessionRes.sessionId, sessionRes.pin)

      setStatusMessage('Deriving keys & encrypting session...')
      const sessionSalt = cryptoEngine.generateSalt(16)
      sessionSaltRef.current = sessionSalt

      const preparedFiles = await Promise.all(
        files.map((item) =>
          prepareSingleFile(item, sessionRes.pin, burnAfter, enableCompression, sessionSalt)
        )
      )
      const batchMetadata = preparedFiles.map((p) => p.metadata)
      preparedFilesRef.current = preparedFiles
      const totalBytesSum = preparedFiles.reduce((acc, p) => acc + p.metadata.fileSize, 0)
      setTotalEncryptedBytes(totalBytesSum)

      await api.offerBatch(sessionRes.sessionId, batchMetadata)

      const localDevice = getLocalDeviceInfo()
      const reqPayload = {
        sessionId: sessionRes.sessionId,
        pin: sessionRes.pin,
        senderDeviceId: localDevice.deviceId,
        senderDeviceName: localDevice.deviceName,
        targetDeviceId: peer.deviceId,
        files: files.map((f) => ({
          fileName: f.file.name,
          fileSize: f.size,
          mimeType: f.file.type,
        })),
        totalBytes: totalRaw,
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'AIRDROP_REQUEST', payload: reqPayload }))
      }
      await api.requestAirDrop(reqPayload)

      setStatusMessage(`AirDrop request sent to ${peer.deviceName}. Waiting for acceptance...`)
    } catch (err: unknown) {
      console.error(err)
      setIsTransferring(false)
      setAirDropStatus('idle')
      setStatusMessage(`AirDrop failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const startTransfer = async () => {
    if (files.length === 0) return
    setIsTransferring(true)
    setTransferDone(false)
    setProgressPercent(0)
    setStatusMessage('Initializing offline E2EE session...')
    await acquireWakeLock()

    const totalRaw = files.reduce((acc, f) => acc + f.size, 0)
    setOriginalTotalBytes(totalRaw)

    try {
      // 1. Create Transfer Session
      const sessionRes = await api.createSession({
        burnAfterReading: burnAfter,
        expiresInSeconds: expiryMinutes * 60,
      })
      setSessionId(sessionRes.sessionId)
      setPin(sessionRes.pin)
      setJoinUrl(resolveJoinUrl(sessionRes.joinUrl, sessionRes.pin, selectedInterface))
      if (onSessionCreated) {
        onSessionCreated(sessionRes.sessionId, sessionRes.pin)
      }

      soundEngine.peerConnect()
      setStatusMessage('Deriving AES-256 keys & processing batch...')

      // 2. Encrypt File Batch with shared session salt (derives master key once, instant for 100+ files)
      const sessionSalt = cryptoEngine.generateSalt(16)
      sessionSaltRef.current = sessionSalt

      const preparedFiles = await Promise.all(
        files.map((item) =>
          prepareSingleFile(item, sessionRes.pin, burnAfter, enableCompression, sessionSalt)
        )
      )
      const batchMetadata = preparedFiles.map((p) => p.metadata)

      preparedFilesRef.current = preparedFiles
      const totalBytesSum = preparedFiles.reduce((acc, p) => acc + p.metadata.fileSize, 0)
      setTotalEncryptedBytes(totalBytesSum)

      // 3. Register batch offer
      await api.offerBatch(sessionRes.sessionId, batchMetadata)

      if (persistVault) {
        // 7-Day Server Vault Mode: Pre-upload encrypted chunks to server storage
        setStatusMessage('Uploading encrypted payload to 7-Day Server Vault...')
        await streamPreparedFiles(sessionRes.sessionId, preparedFiles, 0)
        await recordSentAuditLog(preparedFiles, burnAfter, true)
        setProgressPercent(100)
        setIsTransferring(false)
        setTransferDone(true)
        setStatusMessage('Payload stored in 7-Day Vault. Ready for receiver to claim with PIN.')
        soundEngine.transferComplete()
      } else {
        // Live Direct Mode: Zero server storage. Keep payload in local browser memory and stream live upon peer connection.
        setIsTransferring(false)
        setTransferDone(false)
        setProgressPercent(0)
        setStatusMessage('Live room ready. Share PIN with receiver. Waiting for peer to connect...')
        if (peerConnected || rtcManagerRef.current?.isChannelOpen()) {
          void streamLiveToPeer(preparedFiles)
        }
      }
    } catch (err: unknown) {
      console.error(err)
      setIsTransferring(false)
      setStatusMessage(`Transfer failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      soundEngine.errorTone()
    } finally {
      if (!isStreamingRtcRef.current && !persistVault) {
        await releaseWakeLock()
      }
    }
  }

  // Live File Ingestion: Appends new files directly into active session room
  const handleLiveAddFiles = async (newRawFiles: File[]) => {
    if (newRawFiles.length === 0 || !sessionId || !pin) return

    const salt = sessionSaltRef.current || cryptoEngine.generateSalt(16)
    sessionSaltRef.current = salt

    const newSelectedItems = mapFilesToSelectedItems(newRawFiles)
    setFiles((prev) => [...prev, ...newSelectedItems])

    setIsTransferring(true)
    setTransferDone(false)
    setStatusMessage(`Encrypting ${newSelectedItems.length} new file(s) for live room...`)
    await acquireWakeLock()

    try {
      const newPrepared = await Promise.all(
        newSelectedItems.map((item) =>
          prepareSingleFile(item, pin, burnAfter, enableCompression, salt)
        )
      )

      const baseFileIndex = preparedFilesRef.current.length
      preparedFilesRef.current = [...preparedFilesRef.current, ...newPrepared]

      const updatedBatch = preparedFilesRef.current.map((p) => p.metadata)
      const updatedTotalBytes = preparedFilesRef.current.reduce((acc, p) => acc + p.metadata.fileSize, 0)
      setTotalEncryptedBytes(updatedTotalBytes)

      // Update session batch offer via REST API
      await api.offerBatch(sessionId, updatedBatch)

      // Broadcast BATCH_OFFER via WebSocket to notify connected peers immediately
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'BATCH_OFFER', payload: updatedBatch }))
      }

      if (peerConnected || isDirectP2p || rtcManagerRef.current?.isChannelOpen()) {
        // Stream newly added chunks live directly to connected peer
        await streamLiveToPeer(newPrepared)
      } else if (persistVault) {
        await streamPreparedFiles(sessionId, newPrepared, baseFileIndex)
      }

      // Record sent audit log for newly added files
      await recordSentAuditLog(newPrepared, burnAfter, persistVault)

      setProgressPercent(100)
      setIsTransferring(false)
      setTransferDone(true)
      setStatusMessage(`Live room updated. ${preparedFilesRef.current.length} file(s) active in room.`)
      soundEngine.transferComplete()
    } catch (err: unknown) {
      console.error('Failed to add files to live room:', err)
      setIsTransferring(false)
      setStatusMessage(`Failed to add files: ${err instanceof Error ? err.message : 'Unknown error'}`)
      soundEngine.errorTone()
    } finally {
      await releaseWakeLock()
    }
  }

  const handleLiveFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const collected = await extractDroppedItems(e.dataTransfer.items)
      if (collected.length > 0) {
        const rawFiles = collected.map((c) => c.file)
        void handleLiveAddFiles(rawFiles)
        return
      }
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleLiveAddFiles(Array.from(e.dataTransfer.files))
    }
  }

  // Live Screen Sharing Toggle
  const toggleScreenShare = async () => {
    const rtc = rtcManagerRef.current
    if (!rtc) return

    if (isScreenSharing) {
      rtc.stopScreenShare()
      setIsScreenSharing(false)
      setScreenStream(null)
    } else {
      try {
        const stream = await rtc.startScreenShare()
        if (stream) {
          setIsScreenSharing(true)
          setScreenStream(stream)
          rtc.onScreenShareStopped(() => {
            setIsScreenSharing(false)
            setScreenStream(null)
          })
        }
      } catch (err) {
        console.warn('Failed to start screen share:', err)
      }
    }
  }

  // Instant Live Note / Clipboard relay
  const handleSendLiveNote = () => {
    if (!liveNoteText.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'TEXT_MESSAGE', payload: liveNoteText.trim() }))
    setLiveNoteSent(true)
    setTimeout(() => setLiveNoteSent(false), 2000)
    setLiveNoteText('')
  }

  const cancelSession = async () => {
    if (isScreenSharing && rtcManagerRef.current) {
      rtcManagerRef.current.stopScreenShare()
      setIsScreenSharing(false)
      setScreenStream(null)
    }
    sessionSaltRef.current = null
    await releaseWakeLock()
    cryptoEngine.clearKeyCache()
    if (sessionId) {
      await api.cancelSession(sessionId)
      setSessionId(null)
      setPin(null)

      setJoinUrl(null)
      setIsTransferring(false)
      setTransferDone(false)
      setStatusMessage('Session terminated.')
    }
  }

  const effectiveJoinUrl = resolveJoinUrl(joinUrl || '', pin || '', selectedInterface)

  const copyLink = async () => {
    if (effectiveJoinUrl) {
      const success = await copyToClipboard(effectiveJoinUrl)
      if (success) {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      }
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && effectiveJoinUrl) {
      try {
        await navigator.share({
          title: 'W2W Share - Encrypted Transfer',
          text: `Claim offline encrypted files with PIN: ${pin}`,
          url: effectiveJoinUrl,
        })
      } catch {
        // User dismissed share dialog
      }
    } else {
      await copyLink()
    }
  }

  const getVaultButtonClass = () => {
    if (burnAfter) return 'border-[#202020] bg-carbon/30 text-graphite cursor-not-allowed opacity-40'
    if (persistVault) return 'border-white bg-white text-black font-semibold shadow-xs cursor-pointer'
    return 'border-[#282828] bg-carbon text-steel hover:text-white hover:bg-[#242424] cursor-pointer'
  }

  return (
    <div className="space-y-6">
      {/* Target Peer Radar Beacon Banner */}
      {targetPeer && !pin && (
        <div className="p-3.5 rounded-xl bg-carbon border border-[#7089ba]/40 flex items-center justify-between gap-4 shadow-[0_0_15px_rgba(112,137,186,0.08)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#7089ba]/10 border border-[#7089ba]/30 flex items-center justify-center text-[#7089ba] shrink-0">
              <DesktopIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-[#7089ba] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>[TARGET_LOCKED :: P2P_TUNNEL]</span>
              </div>
              <div className="text-xs font-mono font-bold text-white truncate mt-0.5">
                {targetPeer.deviceName} <span className="font-mono text-steel text-[11px] font-normal">({targetPeer.ip}:{targetPeer.port})</span>
              </div>
            </div>
          </div>
          {onClearTargetPeer && (
            <button
              type="button"
              onClick={onClearTargetPeer}
              className="px-2.5 py-1 rounded-full border border-[#282828] bg-surface-alt hover:bg-[#242424] text-[11px] font-mono text-steel hover:text-white transition-colors cursor-pointer"
            >
              Change Target
            </button>
          )}
        </div>
      )}

      {/* Dropzone Container */}
      {!pin && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="dashed-container p-4 sm:p-12 rounded-2xl bg-carbon hover:bg-carbon-hover transition-colors text-center cursor-pointer relative group"
        >
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />

          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-surface-alt border border-carbon flex items-center justify-center text-periwinkle group-hover:scale-105 transition-transform">
              <UploadSimpleIcon className="w-6 h-6 sm:w-7 sm:h-7" weight="duotone" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-paper font-sans">
                Drag & drop files or choose media
              </h4>
              <p className="text-xs text-steel mt-1">
                Zero size limit. Direct chunk streaming with browser-native AES-256-GCM.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 sm:px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileIcon className="w-3.5 h-3.5" />
                <span>Select Files</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3.5 sm:px-4 py-2 rounded-full border border-[#282828] bg-carbon text-white font-semibold text-xs hover:bg-[#242424] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CameraIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                <span>Camera / Photo</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 sm:px-4 py-2 rounded-full border border-[#282828] bg-carbon text-white font-semibold text-xs hover:bg-[#242424] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FolderSimpleIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                <span>Select Folder</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error non-standard webkitdirectory attribute
                webkitdirectory=""
                onChange={handleFolderInput}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* AirDrop to Nearby Devices */}
      {!pin && (
        <div className="dashed-container p-4 sm:p-6 rounded-2xl bg-carbon relative space-y-4">
          <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none rounded-2xl" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 dashed-divider-b">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  Nearby Subnet Devices
                </span>
                <span className="font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20 font-bold uppercase tracking-wider">
                  AirDrop Radar
                </span>
              </div>
              <span className="font-mono text-[11px] text-steel">
                {nearbyPeers.length} {nearbyPeers.length === 1 ? 'peer' : 'peers'} active
              </span>
            </div>

            {nearbyPeers.length === 0 ? (
              <div className="py-4 px-4 rounded-xl bg-surface-alt/60 border border-[#242424] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-carbon border border-[#282828] flex items-center justify-center text-[#7089ba] shrink-0">
                    <BroadcastIcon className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-white">
                      Subnet Peer Radar Active
                    </div>
                    <p className="text-[11px] text-steel font-mono mt-0.5">
                      Open W2W Share on any phone, tablet, or PC on this local Wi-Fi / Hotspot to AirDrop directly.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[9px] text-steel bg-carbon px-2.5 py-1 rounded-full border border-[#282828]">
                    UDP PORT 8888
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {nearbyPeers.map((peer) => (
                  <NearbyPeerCard
                    key={peer.deviceId}
                    peer={peer}
                    isTarget={airDropTargetPeer?.deviceId === peer.deviceId}
                    airDropStatus={airDropStatus}
                    isTransferring={isTransferring}
                    hasFiles={files.length > 0}
                    onSelect={startAirDropToPeer}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Files Staging List */}
      {files.length > 0 && !pin && (
        <StagedFilesQueue
          files={files}
          totalBytes={totalBytes}
          burnAfter={burnAfter}
          setBurnAfter={setBurnAfter}
          persistVault={persistVault}
          setPersistVault={setPersistVault}
          enableCompression={enableCompression}
          setEnableCompression={setEnableCompression}
          setExpiryMinutes={setExpiryMinutes}
          activePresetIndex={activePresetIndex}
          activePreset={activePreset}
          getVaultButtonClass={getVaultButtonClass}
          onClearFiles={() => {
            clearFiles()
            setTransferDone(false)
          }}
          onRemoveFile={removeFile}
          onStartTransfer={startTransfer}
          isTransferring={isTransferring}
        />
      )}

      {/* Live Active Transfer Stream / PIN Display */}
      {pin && (
        <ActiveTransferSessionView
          pin={pin}
          effectiveJoinUrl={effectiveJoinUrl}
          peerConnected={peerConnected}
          isDirectP2p={isDirectP2p}
          files={files}
          totalEncryptedBytes={totalEncryptedBytes}
          totalBytes={totalBytes}
          uploadedBytes={uploadedBytes}
          transferSpeedMbps={transferSpeedMbps}
          transferEtaSeconds={transferEtaSeconds}
          progressPercent={progressPercent}
          statusMessage={statusMessage}
          transferDone={transferDone}
          isTransferring={isTransferring}
          enableCompression={enableCompression}
          originalTotalBytes={originalTotalBytes}
          currentChunkInfo={currentChunkInfo}
          isScreenSharing={isScreenSharing}
          screenStream={screenStream}
          liveNoteText={liveNoteText}
          setLiveNoteText={setLiveNoteText}
          liveNoteSent={liveNoteSent}
          linkCopied={linkCopied}
          liveFileInputRef={liveFileInputRef}
          liveFolderInputRef={liveFolderInputRef}
          onOpenQrModal={() => setQrModalOpen(true)}
          onCopyLink={copyLink}
          onNativeShare={handleNativeShare}
          onToggleScreenShare={toggleScreenShare}
          onSendLiveNote={handleSendLiveNote}
          onLiveAddFiles={(newFiles) => void handleLiveAddFiles(newFiles)}
          onLiveFileDrop={handleLiveFileDrop}
          onCancelSession={cancelSession}
        />
      )}

      {/* QR Code Modal */}
      {pin && (
        <QrCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          pin={pin}
          url={effectiveJoinUrl}
        />
      )}
    </div>
  )
}
