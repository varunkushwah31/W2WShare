import React, { useState, useRef, useEffect, useCallback } from 'react'
import { api, getWebSocketUrl, type FileMetadata } from '@/lib/api'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
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
} from '@phosphor-icons/react'
import { detectFileTypeCategory, type FileCategoryType } from '@/lib/fileCategories'

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

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunking

interface SendPanelProps {
  selectedInterface?: import('@/lib/api').NetworkInterfaceDto | null
  targetPeer?: import('@/lib/api').DiscoveredPeer | null
  onClearTargetPeer?: () => void
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

/**
 * Slices and encrypts ONLY the requested 2MB chunk on the fly.
 * Keeps browser RAM usage capped at ~15-25MB regardless of total file size (even 50GB).
 */
const getChunkSlice = async (
  prepared: PreparedFile,
  chunkIndex: number
): Promise<Uint8Array> => {
  const source = prepared.compressedBlob || prepared.item.file
  const start = chunkIndex * CHUNK_SIZE
  const end = Math.min(start + CHUNK_SIZE, source.size)
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
  enableCompression: boolean
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

  const salt = cryptoEngine.generateSalt(16)
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

  const totalChunks = Math.ceil(effectiveSize / CHUNK_SIZE) || 1

  const metadata: FileMetadata = {
    fileName: item.file.name,
    relativePath: item.relativePath,
    fileSize: effectiveSize,
    originalSize: item.size,
    mimeType: item.file.type || 'application/octet-stream',
    totalChunks,
    chunkSize: CHUNK_SIZE,
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
  const all: FileSystemEntry[] = []
  let hasMore = true
  while (hasMore) {
    const batch: FileSystemEntry[] = await new Promise((resolve) =>
      dirReader.readEntries(resolve, () => resolve([]))
    )
    if (batch.length > 0) {
      all.push(...batch)
    } else {
      hasMore = false
    }
  }
  return all
}

async function sendSingleChunk(
  targetSessionId: string,
  fIdx: number,
  cIdx: number,
  totalChunks: number,
  chunkData: Uint8Array,
  rtc: WebRtcPeerManager | null
): Promise<void> {
  let sentViaRtc = false
  if (rtc?.isChannelOpen()) {
    sentViaRtc = await rtc.sendChunk(fIdx, cIdx, totalChunks, chunkData)
  }
  if (!sentViaRtc) {
    await api.uploadFileChunk(targetSessionId, fIdx, cIdx, chunkData)
  }
}

async function recordSentAuditLog(
  preparedFiles: PreparedFile[],
  burnAfter: boolean
): Promise<void> {
  for (const prep of preparedFiles) {
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
    } catch {
      // Non-blocking audit persistence fallback
    }
  }
}

export const SendPanel: React.FC<SendPanelProps> = ({
  selectedInterface,
  targetPeer,
  onClearTargetPeer,
}) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([])
  const [burnAfter, setBurnAfter] = useState(false)
  const [expiryMinutes, setExpiryMinutes] = useState(15)
  const [enableCompression, setEnableCompression] = useState(true)

  // Transfer state
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferDone, setTransferDone] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
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
  const rtcManagerRef = useRef<WebRtcPeerManager | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Screen WakeLock API to prevent mobile browsers from sleeping during transfer
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch (e) {
        console.debug('[WakeLock] Request denied or unsupported:', e)
      }
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch {
        // ignore
      }
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isTransferring) {
        await acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      releaseWakeLock()
    }
  }, [isTransferring, acquireWakeLock, releaseWakeLock])

  // Selective chunk retransmission handler
  const handleResendChunk = useCallback(async (fIdx: number, cIdx: number) => {
    const prep = preparedFilesRef.current[fIdx]
    if (!prep) return
    try {
      const chunkData = await getChunkSlice(prep, cIdx)
      const rtc = rtcManagerRef.current
      if (rtc?.isChannelOpen()) {
        await rtc.sendChunk(fIdx, cIdx, prep.metadata.totalChunks, chunkData)
      } else if (sessionId) {
        await api.uploadFileChunk(sessionId, fIdx, cIdx, chunkData)
      }
    } catch (err) {
      console.warn(`[Retransmit] Failed to resend chunk ${fIdx}-${cIdx}:`, err)
    }
  }, [sessionId])

  // WebRTC direct streaming handler using on-demand chunk slices
  const streamViaWebRtc = useCallback(async (prepared: PreparedFile[]) => {
    const rtc = rtcManagerRef.current
    if (!rtc?.isChannelOpen()) return

    for (let fIdx = 0; fIdx < prepared.length; fIdx++) {
      const p = prepared[fIdx]
      const totalChunks = p.metadata.totalChunks
      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        const chunkData = await getChunkSlice(p, cIdx)
        await rtc.sendChunk(fIdx, cIdx, totalChunks, chunkData)
      }
    }
  }, [])

  // Connect WebSocket signaling and setup WebRTC when session is active
  useEffect(() => {
    if (!sessionId) {
      if (wsRef.current) wsRef.current.close()
      if (rtcManagerRef.current) rtcManagerRef.current.close()
      return
    }

    const rtc = new WebRtcPeerManager('sender')
    rtcManagerRef.current = rtc

    rtc.onStateChange((_, stats) => {
      setIsDirectP2p(stats.isDirectP2p)
      if (stats.currentMbps > 0) {
        setTransferSpeedMbps(stats.currentMbps)
      }
    })

    rtc.onResendChunk((fileIndex, chunkIndex) => {
      handleResendChunk(fileIndex, chunkIndex)
    })

    const wsUrl = getWebSocketUrl('/ws/signaling')

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    rtc.setSignalingSender((signal) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(signal))
      }
    })

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'REGISTER_SENDER', payload: sessionId }))
    }

    ws.onmessage = async (event) => {
      try {
        const signal = JSON.parse(event.data)
        if (signal.type === 'PEER_CONNECTED') {
          setPeerConnected(true)
          soundEngine.peerConnect()
          // Initiate WebRTC offer to the connected peer
          await rtc.initSenderOffer()
        } else if (signal.type === 'PEER_DISCONNECTED') {
          setPeerConnected(false)
        } else if (signal.type === 'WEBRTC_ANSWER' && signal.payload) {
          await rtc.handleRemoteAnswer(signal.payload)
        } else if (signal.type === 'WEBRTC_ICE_CANDIDATE' && signal.payload) {
          await rtc.handleRemoteIceCandidate(signal.payload)
        } else if (signal.type === 'RESEND_CHUNK') {
          const { fileIndex, chunkIndex } = signal.payload || {}
          if (typeof fileIndex === 'number' && typeof chunkIndex === 'number') {
            handleResendChunk(fileIndex, chunkIndex)
          }
        } else if (signal.type === 'REQUEST_WEBRTC_CHUNKS') {
          if (preparedFilesRef.current.length > 0) {
            streamViaWebRtc(preparedFilesRef.current)
          }
        }
      } catch (err) {
        console.warn('Signaling message error:', err)
      }
    }

    return () => {
      ws.close()
      rtc.close()
    }
  }, [sessionId, streamViaWebRtc, handleResendChunk])


  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const traverseFileSystemEntry = async (
    entry: FileSystemEntry | null,
    path = ''
  ): Promise<SelectedFileItem[]> => {
    if (!entry) return []
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      return new Promise((resolve) => {
        fileEntry.file((file: File) => {
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
        }, () => resolve([]))
      })
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const children = await readDirectoryEntries(dirEntry)
      const results: SelectedFileItem[] = []
      for (const child of children) {
        const subItems = await traverseFileSystemEntry(child, `${path}${entry.name}/`)
        results.push(...subItems)
      }
      return results
    }
    return []
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      const collected: SelectedFileItem[] = []
      for (const element of items) {
        const item = element
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
        if (entry) {
          const res = await traverseFileSystemEntry(entry)
          collected.push(...res)
        } else {
          const file = item.getAsFile()
          if (file) {
            const typeCategory = detectFileTypeCategory(file.name, file.type)
            const previewUrl = typeCategory === 'image' ? URL.createObjectURL(file) : undefined
            collected.push({
              file,
              relativePath: file.name,
              size: file.size,
              previewUrl,
              typeCategory,
            })
          }
        }
      }
      if (collected.length > 0) {
        setFiles((prev) => [...prev, ...collected])
        return
      }
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const items: SelectedFileItem[] = []
      for (const file of Array.from(e.target.files)) {
        const typeCategory = detectFileTypeCategory(file.name, file.type)
        const previewUrl = typeCategory === 'image' ? URL.createObjectURL(file) : undefined
        items.push({
          file,
          relativePath: file.webkitRelativePath || file.name,
          size: file.size,
          previewUrl,
          typeCategory,
        })
      }
      setFiles((prev) => [...prev, ...items])
    }
  }

  const addFiles = (newFiles: File[]) => {
    const items: SelectedFileItem[] = newFiles.map((f) => {
      const typeCategory = detectFileTypeCategory(f.name, f.type)
      const previewUrl = typeCategory === 'image' ? URL.createObjectURL(f) : undefined
      return {
        file: f,
        relativePath: f.name,
        size: f.size,
        previewUrl,
        typeCategory,
      }
    })
    setFiles((prev) => [...prev, ...items])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const item = prev[index]
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearFiles = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setFiles([])
    setTransferDone(false)
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const streamPreparedFiles = async (
    targetSessionId: string,
    preparedFiles: PreparedFile[]
  ) => {
    let uploadedBytesTotal = 0
    const totalBytesAllFiles = preparedFiles.reduce(
      (acc, p) => acc + p.metadata.fileSize,
      0
    )
    setTotalEncryptedBytes(totalBytesAllFiles)
    const startTime = Date.now()

    for (let fIdx = 0; fIdx < preparedFiles.length; fIdx++) {
      const prep = preparedFiles[fIdx]
      setCurrentFileName(prep.metadata.fileName)
      const totalChunks = prep.metadata.totalChunks

      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        setCurrentChunkInfo({ current: cIdx + 1, total: totalChunks })

        // Slices ONLY the 2MB chunk directly on the fly
        const chunkData = await getChunkSlice(prep, cIdx)
        await sendSingleChunk(targetSessionId, fIdx, cIdx, totalChunks, chunkData, rtcManagerRef.current)

        uploadedBytesTotal += chunkData.length
        setUploadedBytes(uploadedBytesTotal)
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
        setStatusMessage(`Streaming chunk ${cIdx + 1}/${totalChunks}`)
      }
    }
    setTransferEtaSeconds(0)
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

      soundEngine.peerConnect()
      setStatusMessage('Deriving AES-256 keys & processing batch...')

      // 2. Encrypt File Batch (Metadata & key derivation only; zero RAM buffer bloat)
      const batchMetadata: FileMetadata[] = []
      const preparedFiles: PreparedFile[] = []

      for (const item of files) {
        setCurrentFileName(item.relativePath)
        setStatusMessage(`Hashing & preparing: ${item.relativePath}`)
        const prepared = await prepareSingleFile(item, sessionRes.pin, burnAfter, enableCompression)
        batchMetadata.push(prepared.metadata)
        preparedFiles.push(prepared)
      }

      preparedFilesRef.current = preparedFiles
      const totalBytesSum = preparedFiles.reduce((acc, p) => acc + p.metadata.fileSize, 0)
      setTotalEncryptedBytes(totalBytesSum)

      // 3. Register batch offer
      await api.offerBatch(sessionRes.sessionId, batchMetadata)

      // 4. Stream Chunks to Backend Relay or WebRTC
      await streamPreparedFiles(sessionRes.sessionId, preparedFiles)

      // 5. Register in Audit Ledger
      await recordSentAuditLog(preparedFiles, burnAfter)

      setProgressPercent(100)
      setIsTransferring(false)
      setTransferDone(true)
      setStatusMessage('Payload uploaded. Waiting for receiver to claim with PIN.')
      soundEngine.transferComplete()
    } catch (err: unknown) {
      console.error(err)
      setIsTransferring(false)
      setStatusMessage(`Transfer failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      soundEngine.errorTone()
    } finally {
      await releaseWakeLock()
    }
  }

  const cancelSession = async () => {
    await releaseWakeLock()
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

  const copyLink = () => {
    if (effectiveJoinUrl) {
      navigator.clipboard.writeText(effectiveJoinUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Target Peer Radar Beacon Banner */}
      {targetPeer && !pin && (
        <div className="p-4 rounded-xl bg-[#7089ba]/10 border border-[#7089ba]/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono text-[#7089ba] uppercase tracking-wider">
                Direct Target Peer Selected
              </div>
              <div className="text-sm font-bold text-white truncate">
                {targetPeer.deviceName} <span className="font-mono text-steel text-xs font-normal">({targetPeer.ip}:{targetPeer.port})</span>
              </div>
            </div>
          </div>
          {onClearTargetPeer && (
            <button
              type="button"
              onClick={onClearTargetPeer}
              className="px-2.5 py-1 rounded-lg bg-carbon hover:bg-[#282828] text-[11px] font-mono text-steel hover:text-white transition-colors cursor-pointer"
            >
              Clear Peer
            </button>
          )}
        </div>
      )}

      {/* Dropzone Container */}
      {!pin && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="dashed-container p-8 sm:p-12 rounded-2xl bg-[#141414] hover:bg-[#181818] transition-colors text-center cursor-pointer relative group"
        >
          <div className="absolute inset-0 bg-stipple-grid opacity-15 pointer-events-none rounded-2xl" />

          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-carbon border border-[#282828] flex items-center justify-center text-[#7089ba] group-hover:scale-105 transition-transform">
              <UploadSimpleIcon className="w-7 h-7" weight="duotone" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white font-sans">
                Drag & drop files or folders here
              </h4>
              <p className="text-xs text-steel mt-1">
                Zero size limit. Direct chunk streaming with browser-native AES-256-GCM.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-1.5"
              >
                <FileIcon className="w-3.5 h-3.5" />
                <span>Select Files</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 rounded-full border border-[#282828] bg-carbon text-white font-semibold text-xs hover:bg-[#242424] transition-all flex items-center gap-1.5"
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

      {/* Selected Files Staging List */}
      {files.length > 0 && !pin && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-4">
          <div className="flex items-center justify-between border-b border-carbon pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white font-bold">
                BATCH QUEUE ({files.length} {files.length === 1 ? 'FILE' : 'FILES'})
              </span>
              <span className="font-mono text-xs text-steel">
                · {formatBytes(totalBytes)}
              </span>
            </div>
            <button
              type="button"
              onClick={clearFiles}
              className="text-xs text-steel hover:text-[#eb5757] transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((item, idx) => (
              <div
                key={`${item.relativePath}-${item.size}-${item.file.lastModified}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-carbon border border-[#242424] text-xs hover:border-[#333] transition-colors"
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
                    onClick={() => removeFile(idx)}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-carbon text-xs">
            <label className="flex items-center gap-2 text-ash cursor-pointer">
              <input
                type="checkbox"
                checked={burnAfter}
                onChange={(e) => setBurnAfter(e.target.checked)}
                className="accent-[#7089ba] rounded"
              />
              <span className="flex items-center gap-1">
                <FlameIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                Burn After Reading
              </span>
            </label>

            <label className="flex items-center gap-2 text-ash cursor-pointer">
              <input
                type="checkbox"
                checked={enableCompression}
                onChange={(e) => setEnableCompression(e.target.checked)}
                className="accent-[#7089ba] rounded"
              />
              <span>Gzip Pre-Compression</span>
            </label>

            <div className="flex items-center gap-2 text-ash">
              <span>Expires:</span>
              <select
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                className="bg-carbon border border-[#282828] rounded px-2 py-1 text-white font-mono text-xs focus:outline-none"
              >
                <option value={5}>5 mins</option>
                <option value={15}>15 mins</option>
                <option value={60}>1 hour</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            onClick={startTransfer}
            disabled={isTransferring}
            className="w-full py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Generate Encrypted Transfer Vault</span>
          </button>
        </div>
      )}

      {/* Live Active Transfer Stream / PIN Display */}
      {pin && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6">
          {/* PIN Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-void border border-[#282828]">
            <div>
              <div className="flex items-center gap-2">
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="p-2.5 rounded-full bg-carbon border border-[#282828] text-white hover:border-[#7089ba]/60 hover:text-[#7089ba] transition-all cursor-pointer"
                title="Show QR Code"
              >
                <QrCodeIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={copyLink}
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
                      WEBRTC P2P
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-steel mt-0.5">
                  {peerConnected
                    ? 'Direct peer data tunnel ready. Binary chunks streaming in real-time.'
                    : 'Share 6-digit PIN code or QR with peer on local Wi-Fi / Hotspot.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-current font-mono">
                {peerConnected ? 'TUNNEL_READY' : 'LISTENING_PORT_8888'}
              </span>
            </div>
          </div>

          {/* Progress Bar & Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-steel truncate max-w-xs">{currentFileName || statusMessage}</span>
              <div className="flex items-center gap-2 font-bold">
                {transferEtaSeconds !== null && transferEtaSeconds > 0 && (
                  <span className="text-[#7089ba] font-mono text-[11px]">
                    ETA: ~{transferEtaSeconds < 60 ? `${transferEtaSeconds}s` : `${Math.floor(transferEtaSeconds / 60)}m ${transferEtaSeconds % 60}s`}
                  </span>
                )}
                <span className="text-white">{progressPercent}%</span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-carbon rounded-full overflow-hidden border border-[#242424] relative">
              <div
                className="h-full bg-linear-to-r from-[#7089ba] to-[#9bb2e5] transition-all duration-300 relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-steel pt-1">
              <span>
                {currentChunkInfo.total > 0
                  ? `Chunk ${currentChunkInfo.current} / ${currentChunkInfo.total} (2MB slices)`
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
            totalBytes={totalEncryptedBytes || (files.reduce((a, b) => a + b.size, 0))}
            transferredBytes={uploadedBytes}
            isDirectP2p={isDirectP2p}
            isCompressed={enableCompression}
            originalSizeBytes={originalTotalBytes}
            currentChunk={currentChunkInfo.current}
            totalChunks={currentChunkInfo.total}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            {transferDone ? (
              <div className="flex items-center gap-2 text-xs text-[#7089ba] font-mono">
                <CheckCircleIcon className="w-4 h-4" weight="bold" />
                <span>Payload ready on local network. Receiver can claim PIN.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-steel font-mono">
                <ArrowsClockwiseIcon className="w-4 h-4 animate-spin text-[#7089ba]" />
                <span>Encrypting & streaming payload...</span>
              </div>
            )}

            <button
              type="button"
              onClick={cancelSession}
              className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-steel hover:text-[#eb5757] hover:border-[#eb5757]/40 transition-colors cursor-pointer"
            >
              Terminate Session
            </button>
          </div>
        </div>
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
