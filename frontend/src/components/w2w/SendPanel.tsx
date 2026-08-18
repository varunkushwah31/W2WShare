import React, { useState, useRef } from 'react'
import { api, type FileMetadata } from '@/lib/api'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
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

const resolveJoinUrl = (sessionJoinUrl: string, pin: string): string => {
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

export const SendPanel: React.FC = () => {
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
  const [currentChunkInfo, setCurrentChunkInfo] = useState({ current: 0, total: 0 })
  const [transferSpeedMbps, setTransferSpeedMbps] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

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
    const totalEncryptedBytes = preparedFiles.reduce(
      (acc, p) => acc + p.encryptedBuffer.length,
      0
    )
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
        const elapsedSec = (Date.now() - startTime) / 1000
        if (elapsedSec > 0) {
          const speed = uploadedBytesTotal / (1024 * 1024) / elapsedSec
          setTransferSpeedMbps(speed)
        }

        const percent = Math.min(
          99,
          Math.round((uploadedBytesTotal / totalEncryptedBytes) * 100)
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

    try {
      // 1. Create Transfer Session
      const sessionRes = await api.createSession({
        burnAfterReading: burnAfter,
        expiresInSeconds: expiryMinutes * 60,
      })
      setSessionId(sessionRes.sessionId)
      setPin(sessionRes.pin)
      setJoinUrl(resolveJoinUrl(sessionRes.joinUrl, sessionRes.pin))

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

      // 3. Register batch offer
      await api.offerBatch(sessionRes.sessionId, batchMetadata)

      // 4. Stream Chunks to Backend
      await streamPreparedFiles(sessionRes.sessionId, preparedFiles)

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

  const copyLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl)
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
            <div className="w-14 h-14 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center text-[#7089ba] group-hover:scale-105 transition-transform">
              <UploadSimpleIcon className="w-7 h-7" weight="duotone" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white font-sans">
                Drag & drop files or folders here
              </h4>
              <p className="text-xs text-[#808080] mt-1">
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
                className="px-4 py-2 rounded-full border border-[#282828] bg-[#1c1c1c] text-white font-semibold text-xs hover:bg-[#242424] transition-all flex items-center gap-1.5"
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
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white font-bold">
                BATCH QUEUE ({files.length} {files.length === 1 ? 'FILE' : 'FILES'})
              </span>
              <span className="font-mono text-xs text-[#808080]">
                · {formatBytes(totalBytes)}
              </span>
            </div>
            <button
              type="button"
              onClick={clearFiles}
              className="text-xs text-[#808080] hover:text-[#eb5757] transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {files.map((item, idx) => (
              <div
                key={`${item.relativePath}-${item.size}-${idx}`}
                className="flex items-center justify-between p-2 rounded bg-[#1c1c1c] border border-[#242424] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileIcon className="w-4 h-4 text-[#7089ba] shrink-0" />
                  <span className="truncate text-white font-mono">{item.relativePath}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#808080] font-mono">{formatBytes(item.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-[#808080] hover:text-white"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Transfer Configurations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1c1c1c] text-xs">
            <label className="flex items-center gap-2 text-[#ababab] cursor-pointer">
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

            <label className="flex items-center gap-2 text-[#ababab] cursor-pointer">
              <input
                type="checkbox"
                checked={enableCompression}
                onChange={(e) => setEnableCompression(e.target.checked)}
                className="accent-[#7089ba] rounded"
              />
              <span>Gzip Pre-Compression</span>
            </label>

            <div className="flex items-center gap-2 text-[#ababab]">
              <span>Expires:</span>
              <select
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                className="bg-[#1c1c1c] border border-[#282828] rounded px-2 py-1 text-white font-mono text-xs focus:outline-none"
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
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-6">
          {/* PIN Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#000000] border border-[#282828]">
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
                className="p-2.5 rounded-full bg-[#1c1c1c] border border-[#282828] text-white hover:border-white transition-colors"
                title="Show QR Code"
              >
                <QrCodeIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="px-3.5 py-2 rounded-full bg-[#1c1c1c] border border-[#282828] text-white text-xs font-mono hover:border-white transition-colors flex items-center gap-1.5"
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
              <span className="text-[#808080] truncate max-w-xs">{currentFileName || statusMessage}</span>
              <span className="text-white font-bold">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 bg-[#1c1c1c] rounded-full overflow-hidden border border-[#242424]">
              <div
                className="h-full bg-[#7089ba] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#808080] pt-1">
              <span>
                {currentChunkInfo.total > 0
                  ? `Chunk ${currentChunkInfo.current} / ${currentChunkInfo.total}`
                  : statusMessage}
              </span>
              {transferSpeedMbps > 0 && <span>{transferSpeedMbps.toFixed(2)} MB/s</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            {transferDone ? (
              <div className="flex items-center gap-2 text-xs text-[#7089ba] font-mono">
                <CheckCircleIcon className="w-4 h-4" weight="bold" />
                <span>Payload ready on local network. Receiver can claim PIN.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#808080] font-mono">
                <ArrowsClockwiseIcon className="w-4 h-4 animate-spin text-[#7089ba]" />
                <span>Encrypting & streaming payload...</span>
              </div>
            )}

            <button
              type="button"
              onClick={cancelSession}
              className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-[#808080] hover:text-white transition-colors"
            >
              Terminate Session
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {pin && joinUrl && (
        <QrCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          pin={pin}
          url={joinUrl}
        />
      )}
    </div>
  )
}
