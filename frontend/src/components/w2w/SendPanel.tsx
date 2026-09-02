import React, { useState, useRef, useEffect, useCallback } from 'react'
import { api, getWebSocketUrl, type FileMetadata } from '@/lib/api'
import { authStore } from '@/lib/auth'
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
} from '@phosphor-icons/react'

interface SelectedFileItem {
  file: File
  relativePath: string
  size: number
}

interface PreparedFile {
  rawBuffer: ArrayBuffer
  encryptedBuffer: Uint8Array
  metadata: FileMetadata
}

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunking

interface SendPanelProps {
  selectedInterface?: import('@/lib/api').NetworkInterfaceDto | null
}

const resolveJoinUrl = (
  sessionJoinUrl: string,
  pin: string,
  selectedInterface?: import('@/lib/api').NetworkInterfaceDto | null
): string => {
  if (selectedInterface?.url) {
    return `${selectedInterface.url}/?pin=${pin}`
  }
  if (typeof window === 'undefined') return sessionJoinUrl
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocal && window.location.origin) {
    return `${window.location.origin}/?pin=${pin}`
  }
  return sessionJoinUrl || `${window.location.origin}/?pin=${pin}`
}

const prepareSingleFile = async (
  item: SelectedFileItem,
  pin: string,
  burnAfter: boolean,
  enableCompression: boolean
): Promise<PreparedFile> => {
  let rawBuffer = await item.file.arrayBuffer()
  let isCompressed = false

  if (enableCompression && compressor.shouldCompress(item.file.name, item.file.type)) {
    const compBuffer = await compressor.compressBuffer(rawBuffer)
    if (compBuffer.byteLength < rawBuffer.byteLength) {
      rawBuffer = compBuffer
      isCompressed = true
    }
  }

  const salt = cryptoEngine.generateSalt(16)
  const iv = cryptoEngine.generateIv(12)
  const sha256 = await cryptoEngine.calculateSha256(rawBuffer)
  const keyObj = await cryptoEngine.deriveKey(pin, salt)

  const encryptedBytes = await cryptoEngine.encrypt(rawBuffer, keyObj, iv)
  const totalChunks = Math.ceil(encryptedBytes.length / CHUNK_SIZE) || 1

  const metadata: FileMetadata = {
    fileName: item.file.name,
    relativePath: item.relativePath,
    fileSize: rawBuffer.byteLength,
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
    rawBuffer,
    encryptedBuffer: encryptedBytes,
    metadata,
  }
}

export const SendPanel: React.FC<SendPanelProps> = ({ selectedInterface }) => {
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
  const [statusMessage, setStatusMessage] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)

  // Telemetry & WebRTC state
  const [isDirectP2p, setIsDirectP2p] = useState(false)
  const [totalEncryptedBytes, setTotalEncryptedBytes] = useState(0)
  const [uploadedBytes, setUploadedBytes] = useState(0)
  const [originalTotalBytes, setOriginalTotalBytes] = useState(0)
  const preparedFilesRef = useRef<PreparedFile[]>([])
  const rtcManagerRef = useRef<WebRtcPeerManager | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // WebRTC direct streaming handler
  const streamViaWebRtc = useCallback(async (prepared: PreparedFile[]) => {
    const rtc = rtcManagerRef.current
    if (!rtc?.isChannelOpen()) return

    for (let fIdx = 0; fIdx < prepared.length; fIdx++) {
      const p = prepared[fIdx]
      const totalChunks = p.metadata.totalChunks
      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        const start = cIdx * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, p.encryptedBuffer.length)
        const chunkData = p.encryptedBuffer.subarray(start, end)
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
          soundEngine.peerConnect()
          // Initiate WebRTC offer to the connected peer
          await rtc.initSenderOffer()
        } else if (signal.type === 'WEBRTC_ANSWER' && signal.payload) {
          await rtc.handleRemoteAnswer(signal.payload)
        } else if (signal.type === 'WEBRTC_ICE_CANDIDATE' && signal.payload) {
          await rtc.handleRemoteIceCandidate(signal.payload)
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
  }, [sessionId, streamViaWebRtc])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
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
        items.push({
          file,
          relativePath: file.webkitRelativePath || file.name,
          size: file.size,
        })
      }
      setFiles((prev) => [...prev, ...items])
    }
  }

  const addFiles = (newFiles: File[]) => {
    const items: SelectedFileItem[] = newFiles.map((f) => ({
      file: f,
      relativePath: f.name,
      size: f.size,
    }))
    setFiles((prev) => [...prev, ...items])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
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
    const totalEncrypted = preparedFiles.reduce(
      (acc, p) => acc + p.encryptedBuffer.length,
      0
    )
    setTotalEncryptedBytes(totalEncrypted)
    const startTime = Date.now()

    for (let fIdx = 0; fIdx < preparedFiles.length; fIdx++) {
      const prep = preparedFiles[fIdx]
      setCurrentFileName(prep.metadata.fileName)
      const totalChunks = prep.metadata.totalChunks

      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        setCurrentChunkInfo({ current: cIdx + 1, total: totalChunks })
        const start = cIdx * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, prep.encryptedBuffer.length)
        const chunkData = prep.encryptedBuffer.subarray(start, end)

        await api.uploadFileChunk(targetSessionId, fIdx, cIdx, chunkData)

        uploadedBytesTotal += chunkData.length
        setUploadedBytes(uploadedBytesTotal)
        const elapsedSec = (Date.now() - startTime) / 1000
        if (elapsedSec > 0) {
          const speed = uploadedBytesTotal / (1024 * 1024) / elapsedSec
          setTransferSpeedMbps(speed)
        }

        const percent = Math.min(
          99,
          Math.round((uploadedBytesTotal / totalEncrypted) * 100)
        )
        setProgressPercent(percent)
        setStatusMessage(`Streaming chunk ${cIdx + 1}/${totalChunks}`)
      }
    }
  }

  const startTransfer = async () => {
    if (files.length === 0) return
    setIsTransferring(true)
    setTransferDone(false)
    setProgressPercent(0)
    setStatusMessage('Initializing offline E2EE session...')

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

      // 2. Encrypt File Batch
      const batchMetadata: FileMetadata[] = []
      const preparedFiles: PreparedFile[] = []

      for (const item of files) {
        setCurrentFileName(item.relativePath)
        setStatusMessage(`Hashing & encrypting: ${item.relativePath}`)
        const prepared = await prepareSingleFile(item, sessionRes.pin, burnAfter, enableCompression)
        batchMetadata.push(prepared.metadata)
        preparedFiles.push(prepared)
      }

      preparedFilesRef.current = preparedFiles
      const totalEncrypted = preparedFiles.reduce((acc, p) => acc + p.encryptedBuffer.length, 0)
      setTotalEncryptedBytes(totalEncrypted)

      // 3. Register batch offer
      await api.offerBatch(sessionRes.sessionId, batchMetadata)

      // 4. Stream Chunks to Backend Relay
      await streamPreparedFiles(sessionRes.sessionId, preparedFiles)

      // 5. Register in Audit Ledger & 7-Day File Vault if logged in
      const currentUser = authStore.getUser()

      for (let i = 0; i < preparedFiles.length; i++) {
        const prep = preparedFiles[i]
        const txId = `TX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
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
            userId: currentUser ? currentUser.nodeId : undefined,
          })

          if (currentUser && files[i]) {
            await api.persistAuditFile(
              txId,
              files[i].file,
              prep.metadata.mimeType || 'application/octet-stream',
              currentUser.nodeId
            )
          }
        } catch {
          // Non-blocking audit persistence fallback
        }
      }

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
    }
  }

  const cancelSession = async () => {
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
              className="text-xs text-steel hover:text-[#eb5757] transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {files.map((item, idx) => (
              <div
                key={`${item.relativePath}-${item.size}-${idx}`}
                className="flex items-center justify-between p-2 rounded bg-carbon border border-[#242424] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileIcon className="w-4 h-4 text-[#7089ba] shrink-0" />
                  <span className="truncate text-white font-mono">{item.relativePath}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-steel font-mono">{formatBytes(item.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-steel hover:text-white"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
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
            className="w-full py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2"
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
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba]">
                OFFLINE CLAIM PIN
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-white mt-1">
                {pin}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="p-2.5 rounded-full bg-carbon border border-[#282828] text-white hover:border-white transition-colors"
                title="Show QR Code"
              >
                <QrCodeIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="px-3.5 py-2 rounded-full bg-carbon border border-[#282828] text-white text-xs font-mono hover:border-white transition-colors flex items-center gap-1.5"
              >
                {linkCopied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-[#7089ba]" weight="bold" />
                    <span>Copied</span>
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

          {/* Progress Bar & Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-steel truncate max-w-xs">{currentFileName || statusMessage}</span>
              <span className="text-white font-bold">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 bg-carbon rounded-full overflow-hidden border border-[#242424]">
              <div
                className="h-full bg-[#7089ba] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-steel pt-1">
              <span>
                {currentChunkInfo.total > 0
                  ? `Chunk ${currentChunkInfo.current} / ${currentChunkInfo.total}`
                  : statusMessage}
              </span>
              {transferSpeedMbps > 0 && <span>{transferSpeedMbps.toFixed(2)} MB/s</span>}
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
              className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-steel hover:text-white transition-colors"
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
