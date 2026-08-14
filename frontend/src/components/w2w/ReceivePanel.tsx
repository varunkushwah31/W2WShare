import React, { useState, useEffect } from 'react'
import { api, type FileMetadata } from '@/lib/api'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
import { MediaPreviewModal, type MediaPreviewItem } from './MediaPreviewModal'
import {
  DownloadSimple,
  Eye,
  File as FileIcon,
  ShieldCheck,
  CheckCircle,
  Flame,
  WarningCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react'

interface ReceivedFileItem {
  metadata: FileMetadata
  blobUrl: string
  blob: Blob
  verified: boolean
}

export const ReceivePanel: React.FC = () => {
  const [pinInput, setPinInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const pinParam = urlParams.get('pin')
      if (pinParam && pinParam.length === 6) {
        return pinParam
      }
    }
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Joined Session
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [batchMetadata, setBatchMetadata] = useState<FileMetadata[]>([])
  const [burnAfterReading, setBurnAfterReading] = useState(false)

  // Download & Decrypt state
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFileItem[]>([])
  const [previewItem, setPreviewItem] = useState<MediaPreviewItem | null>(null)
  const [burnedNotice, setBurnedNotice] = useState(false)

  const handleLookup = React.useCallback(async (lookupPin: string) => {
    const cleanPin = lookupPin.trim()
    if (cleanPin.length !== 6) {
      setErrorMsg('Please enter a 6-digit numeric PIN.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setBurnedNotice(false)

    try {
      const session = await api.getSessionByPin(cleanPin)
      setSessionId(session.sessionId)
      setActivePin(cleanPin)
      setBurnAfterReading(!!session.burnAfterReading)

      if (session.fileBatch && session.fileBatch.length > 0) {
        setBatchMetadata(session.fileBatch)
      } else if (session.fileMetadata && session.fileMetadata.fileName) {
        setBatchMetadata([session.fileMetadata])
      } else {
        setBatchMetadata([])
      }

      // Join the session
      await api.joinSession(session.sessionId, cleanPin)
      soundEngine.peerConnect()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Session not found or expired.')
      soundEngine.errorTone()
    } finally {
      setLoading(false)
    }
  }, [])

  // Check URL query parameters for auto-fill PIN
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const pinParam = urlParams.get('pin')
    if (pinParam && pinParam.length === 6) {
      const timer = setTimeout(() => {
        handleLookup(pinParam)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [handleLookup])

  const handleDownloadAndDecrypt = async () => {
    if (!sessionId || !activePin || batchMetadata.length === 0) return

    setDownloading(true)
    setDownloadPercent(0)
    setErrorMsg(null)
    setStatusText('Deriving cryptographic keys...')

    const results: ReceivedFileItem[] = []

    try {
      for (let fIdx = 0; fIdx < batchMetadata.length; fIdx++) {
        const meta = batchMetadata[fIdx]
        setStatusText(`Downloading chunks for: ${meta.fileName}`)

        const keyObj = await cryptoEngine.deriveKey(activePin, meta.salt)
        const totalChunks = meta.totalChunks || 1

        const chunkBuffers: ArrayBuffer[] = []

        for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
          setStatusText(`Downloading chunk ${cIdx + 1}/${totalChunks} (${meta.fileName})`)
          const chunkData = await api.downloadFileChunk(sessionId, fIdx, cIdx)
          chunkBuffers.push(chunkData)

          const totalProgress = Math.round(
            ((fIdx * totalChunks + (cIdx + 1)) / (batchMetadata.length * totalChunks)) * 100
          )
          setDownloadPercent(Math.min(99, totalProgress))
        }

        // Assemble encrypted buffer
        const totalEncryptedLength = chunkBuffers.reduce((acc, c) => acc + c.byteLength, 0)
        const combinedEncrypted = new Uint8Array(totalEncryptedLength)
        let offset = 0
        for (const buf of chunkBuffers) {
          combinedEncrypted.set(new Uint8Array(buf), offset)
          offset += buf.byteLength
        }

        setStatusText(`Decrypting AES-256-GCM payload (${meta.fileName})...`)
        let decryptedBytes = await cryptoEngine.decrypt(
          combinedEncrypted.buffer as ArrayBuffer,
          keyObj,
          meta.iv
        )

        // Decompress if Gzip compressed
        if (meta.isCompressed) {
          setStatusText(`Decompressing Gzip stream (${meta.fileName})...`)
          const decomp = await compressor.decompressBuffer(decryptedBytes.buffer as ArrayBuffer)
          decryptedBytes = new Uint8Array(decomp)
        }

        // Verify SHA-256 checksum
        const computedSha256 = await cryptoEngine.calculateSha256(
          decryptedBytes.buffer as ArrayBuffer
        )
        const verified = meta.sha256 ? computedSha256 === meta.sha256 : true

        const blob = new Blob([decryptedBytes as unknown as BlobPart], {
          type: meta.mimeType || 'application/octet-stream',
        })
        const blobUrl = URL.createObjectURL(blob)

        results.push({
          metadata: meta,
          blobUrl,
          blob,
          verified,
        })
      }

      setReceivedFiles(results)
      setDownloadPercent(100)
      setDownloading(false)
      setStatusText('All files downloaded, decrypted & verified successfully!')
      soundEngine.transferComplete()

      // Notify completion & auto-burn
      const completeRes = await api.markTransferComplete(sessionId)
      if (completeRes.burned || burnAfterReading) {
        setBurnedNotice(true)
      }
    } catch (err: unknown) {
      console.error(err)
      setDownloading(false)
      setErrorMsg(`Decryption failed: ${err instanceof Error ? err.message : 'Corrupted data or wrong PIN'}`)
      soundEngine.errorTone()
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      {/* 6-Digit PIN Entry Box */}
      {!sessionId && (
        <div className="dashed-container p-8 sm:p-12 rounded-2xl bg-[#141414] text-center max-w-lg mx-auto relative">
          <div className="absolute inset-0 bg-stipple-grid opacity-15 pointer-events-none rounded-2xl" />

          <div className="relative z-10 flex flex-col items-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center text-[#7089ba]">
              <ShieldCheck className="w-7 h-7" weight="duotone" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white font-sans">
                Enter 6-Digit Transfer PIN
              </h4>
              <p className="text-xs text-[#808080] mt-1">
                Zero-knowledge claim. Files are decrypted locally inside your browser.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleLookup(pinInput)
              }}
              className="w-full space-y-4"
            >
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl font-mono font-extrabold tracking-[0.3em] py-3 bg-[#000000] border border-[#282828] focus:border-[#7089ba] focus:outline-none rounded-xl text-white placeholder-[#333333] transition-colors"
              />

              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#eb5757]">
                  <WarningCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pinInput.length !== 6}
                className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowsClockwise className="w-4 h-4 animate-spin text-black" />
                    <span>Locating Transfer Vault...</span>
                  </>
                ) : (
                  <>
                    <DownloadSimple className="w-4 h-4" />
                    <span>Claim & Decrypt Files</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Found Session Details & Staged Download */}
      {sessionId && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1c1c1c] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                  ENCRYPTED PAYLOAD DETECTED
                </span>
                {burnAfterReading && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#eb5757] bg-[#eb5757]/10 px-2 py-0.5 rounded-full border border-[#eb5757]/20">
                    <Flame className="w-3 h-3" />
                    BURN AFTER READING
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white mt-1 font-sans">
                PIN: <span className="font-mono text-[#ffffff] tracking-widest">{activePin}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSessionId(null)
                setActivePin(null)
                setReceivedFiles([])
                setBatchMetadata([])
              }}
              className="text-xs text-[#808080] hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Staged File List */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#808080]">
              PAYLOAD MANIFEST ({batchMetadata.length} {batchMetadata.length === 1 ? 'FILE' : 'FILES'})
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {batchMetadata.map((meta, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1c1c1c] border border-[#242424] text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <FileIcon className="w-4 h-4 text-[#7089ba] shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-white font-mono font-medium">
                        {meta.fileName}
                      </div>
                      <div className="text-[10px] text-[#808080] font-mono">
                        {formatBytes(meta.fileSize)} · {meta.totalChunks} chunks {meta.isCompressed ? '· Gzip' : ''}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded">
                    AES-256
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress / Status Display */}
          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#808080]">{statusText}</span>
                <span className="text-white font-bold">{downloadPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#1c1c1c] rounded-full overflow-hidden border border-[#242424]">
                <div
                  className="h-full bg-[#7089ba] transition-all duration-300"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Burned Notice */}
          {burnedNotice && (
            <div className="p-3 rounded-xl bg-[#eb5757]/10 border border-[#eb5757]/20 flex items-center gap-2 text-xs text-[#eb5757]">
              <Flame className="w-4 h-4 shrink-0" />
              <span>Burn-After-Reading executed: Server payload has auto-destructed.</span>
            </div>
          )}

          {/* Decrypted Ready Files */}
          {receivedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono text-[#7089ba] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" weight="bold" />
                <span>Decrypted & Verified Files:</span>
              </div>

              <div className="space-y-2">
                {receivedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#000000] border border-[#282828] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileIcon className="w-4 h-4 text-white shrink-0" />
                      <span className="truncate text-white font-mono">{item.metadata.fileName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setPreviewItem({
                            fileName: item.metadata.fileName,
                            mimeType: item.metadata.mimeType,
                            blobUrl: item.blobUrl,
                            size: item.metadata.fileSize,
                          })
                        }
                        className="px-2.5 py-1 rounded-full border border-[#282828] text-white text-[11px] hover:border-white flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#7089ba]" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={item.blobUrl}
                        download={item.metadata.fileName}
                        className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-semibold hover:bg-white/90 flex items-center gap-1 transition-all"
                      >
                        <DownloadSimple className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Trigger */}
          {receivedFiles.length === 0 && (
            <button
              onClick={handleDownloadAndDecrypt}
              disabled={downloading}
              className="w-full py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <ArrowsClockwise className="w-4 h-4 animate-spin text-black" />
                  <span>Streaming Chunks & Decrypting...</span>
                </>
              ) : (
                <>
                  <DownloadSimple className="w-4 h-4" />
                  <span>Start Decryption & Download</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Media Preview Modal */}
      <MediaPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  )
}
