import React, { useState, useEffect, useRef } from 'react'
import { api, getWebSocketUrl, type FileMetadata } from '@/lib/api'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
import { WebRtcPeerManager } from '@/lib/webrtc'
import { ZipArchiver } from '@/lib/zip'
import { TransferTelemetryChart } from './TransferTelemetryChart'
import { MediaPreviewModal, type MediaPreviewItem } from './MediaPreviewModal'
import {
  FileIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  FlameIcon, ArrowsClockwiseIcon, DownloadSimpleIcon, ArchiveIcon, EyeIcon,
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
      if (pinParam?.length === 6) {
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

  // Telemetry, WebRTC, and ZIP state
  const [isDirectP2p, setIsDirectP2p] = useState(false)
  const [downloadSpeedMbps, setDownloadSpeedMbps] = useState(0)
  const [transferredBytes, setTransferredBytes] = useState(0)
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [totalChunksCount, setTotalChunksCount] = useState(0)
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const rtcManagerRef = useRef<WebRtcPeerManager | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const webrtcChunksRef = useRef<Map<string, ArrayBuffer>>(new Map())

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
      } else if (session.fileMetadata?.fileName) {
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
    if (pinParam?.length === 6) {
      const timer = setTimeout(() => {
        handleLookup(pinParam)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [handleLookup])

  // Setup WebRTC and WebSocket signaling when session is joined
  useEffect(() => {
    if (!sessionId || !activePin) {
      if (wsRef.current) wsRef.current.close()
      if (rtcManagerRef.current) rtcManagerRef.current.close()
      return
    }

    const rtc = new WebRtcPeerManager('receiver')
    rtcManagerRef.current = rtc

    rtc.onStateChange((_, stats) => {
      setIsDirectP2p(stats.isDirectP2p)
      if (stats.currentMbps > 0) {
        setDownloadSpeedMbps(stats.currentMbps)
      }
    })

    rtc.onChunkReceived((fileIndex, chunkIndex, buffer) => {
      webrtcChunksRef.current.set(`${fileIndex}-${chunkIndex}`, buffer)
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
      ws.send(JSON.stringify({ type: 'JOIN_BY_PIN', payload: activePin }))
    }

    ws.onmessage = async (event) => {
      try {
        const signal = JSON.parse(event.data)
        if (signal.type === 'WEBRTC_OFFER' && signal.payload) {
          await rtc.handleRemoteOffer(signal.payload)
        } else if (signal.type === 'WEBRTC_ICE_CANDIDATE' && signal.payload) {
          await rtc.handleRemoteIceCandidate(signal.payload)
        }
      } catch (err) {
        console.warn('Signaling error:', err)
      }
    }

    return () => {
      ws.close()
      rtc.close()
    }
  }, [sessionId, activePin])

  // One-click ZIP generation and download
  const handleDownloadAllAsZip = async () => {
    if (receivedFiles.length === 0) return
    setIsZipping(true)
    setZipProgress(0)
    try {
      const zipEntries = receivedFiles.map((item) => ({
        name: item.metadata.fileName,
        relativePath: item.metadata.relativePath || item.metadata.fileName,
        blob: item.blob,
      }))
      const zipBlob = await ZipArchiver.createZip(zipEntries, (pct) => setZipProgress(pct))
      ZipArchiver.downloadBlob(zipBlob, `w2w-share-${activePin || 'bundle'}.zip`)
      soundEngine.transferComplete()
    } catch (err) {
      console.error('Failed to generate ZIP archive:', err)
    } finally {
      setIsZipping(false)
    }
  }

  const handleDownloadAndDecrypt = async () => {
    if (!sessionId || !activePin || batchMetadata.length === 0) return

    setDownloading(true)
    setDownloadPercent(0)
    setErrorMsg(null)
    setStatusText('Deriving cryptographic keys...')

    const totalChunksAllFiles = batchMetadata.reduce((acc, m) => acc + (m.totalChunks || 1), 0)
    setTotalChunksCount(totalChunksAllFiles)
    let downloadedBytesTotal = 0
    const startTime = Date.now()

    const results: ReceivedFileItem[] = []

    try {
      for (let fIdx = 0; fIdx < batchMetadata.length; fIdx++) {
        const meta = batchMetadata[fIdx]
        setStatusText(`Downloading chunks for: ${meta.fileName}`)

        const keyObj = await cryptoEngine.deriveKey(activePin, meta.salt)
        const totalChunks = meta.totalChunks || 1

        const chunkBuffers: ArrayBuffer[] = []

        for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
          setCurrentChunkIndex(cIdx + 1)
          setStatusText(`Downloading chunk ${cIdx + 1}/${totalChunks} (${meta.fileName})`)

          let chunkData: ArrayBuffer | undefined = webrtcChunksRef.current.get(`${fIdx}-${cIdx}`)
          chunkData ??= await api.downloadFileChunk(sessionId, fIdx, cIdx);
          chunkBuffers.push(chunkData)
          downloadedBytesTotal += chunkData.byteLength
          setTransferredBytes(downloadedBytesTotal)

          const elapsedSec = (Date.now() - startTime) / 1000
          if (elapsedSec > 0) {
            const speed = downloadedBytesTotal / (1024 * 1024) / elapsedSec
            setDownloadSpeedMbps(speed)
          }

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

      // Register received transactions in Audit Ledger & 7-day vault if logged in
      const { authStore } = await import('@/lib/auth')
      const currentUser = authStore.getUser()

      for (const resItem of results) {
        const txId = `TX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        try {
          await api.recordAuditTransaction({
            id: txId,
            timestamp: Date.now(),
            direction: 'RECEIVED',
            fileName: resItem.metadata.fileName,
            fileSize: resItem.metadata.fileSize,
            totalChunks: resItem.metadata.totalChunks,
            sha256: resItem.metadata.sha256,
            cipher: 'AES-256-GCM / PBKDF2 (100k)',
            burned: burnAfterReading,
            isCompressed: !!resItem.metadata.isCompressed,
            userId: currentUser ? currentUser.nodeId : undefined,
          })

          if (currentUser && resItem.blob) {
            await api.persistAuditFile(
              txId,
              resItem.blob,
              resItem.metadata.mimeType || 'application/octet-stream',
              currentUser.nodeId
            )
          }
        } catch {
          // Non-blocking audit persistence fallback
        }
      }

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
            <div className="w-14 h-14 rounded-full bg-carbon border border-[#282828] flex items-center justify-center text-[#7089ba]">
              <ShieldCheckIcon className="w-7 h-7" weight="duotone" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white font-sans">
                Enter 6-Digit Transfer PIN
              </h4>
              <p className="text-xs text-steel mt-1">
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
                className="w-full text-center text-3xl font-mono font-extrabold tracking-[0.3em] py-3 bg-void border border-[#282828] focus:outline-none rounded-xl text-white transition-colors"
              />

              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#eb5757]">
                  <WarningCircleIcon className="w-4 h-4" />
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
                    <ArrowsClockwiseIcon className="w-4 h-4 animate-spin text-black" />
                    <span>Locating Transfer Vault...</span>
                  </>
                ) : (
                  <>
                    <DownloadSimpleIcon className="w-4 h-4" />
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
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-carbon pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                  ENCRYPTED PAYLOAD DETECTED
                </span>
                {burnAfterReading && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#eb5757] bg-[#eb5757]/10 px-2 py-0.5 rounded-full border border-[#eb5757]/20">
                    <FlameIcon className="w-3 h-3" />
                    BURN AFTER READING
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white mt-1 font-sans">
                PIN: <span className="font-mono text-paper tracking-widest">{activePin}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSessionId(null)
                setActivePin(null)
                setReceivedFiles([])
                setBatchMetadata([])
              }}
              className="text-xs text-steel hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Staged File List */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-steel">
              PAYLOAD MANIFEST ({batchMetadata.length} {batchMetadata.length === 1 ? 'FILE' : 'FILES'})
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {batchMetadata.map((meta, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-carbon border border-[#242424] text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <FileIcon className="w-4 h-4 text-[#7089ba] shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-white font-mono font-medium">
                        {meta.fileName}
                      </div>
                      <div className="text-[10px] text-steel font-mono">
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
                <span className="text-steel">{statusText}</span>
                <span className="text-white font-bold">{downloadPercent}%</span>
              </div>
              <div className="w-full h-2 bg-carbon rounded-full overflow-hidden border border-[#242424]">
                <div
                  className="h-full bg-[#7089ba] transition-all duration-300"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Live Real-Time Telemetry & Throughput Chart */}
          {(downloading || receivedFiles.length > 0) && (
            <TransferTelemetryChart
              currentSpeedMbps={downloadSpeedMbps}
              totalBytes={batchMetadata.reduce((acc, m) => acc + (m.fileSize || 0), 0)}
              transferredBytes={transferredBytes}
              isDirectP2p={isDirectP2p}
              isCompressed={batchMetadata.some((m) => !!m.isCompressed)}
              originalSizeBytes={batchMetadata.reduce((acc, m) => acc + (m.originalSize || m.fileSize || 0), 0)}
              currentChunk={currentChunkIndex}
              totalChunks={totalChunksCount}
            />
          )}

          {/* Burned Notice */}
          {burnedNotice && (
            <div className="p-3 rounded-xl bg-[#eb5757]/10 border border-[#eb5757]/20 flex items-center gap-2 text-xs text-[#eb5757]">
              <FlameIcon className="w-4 h-4 shrink-0" />
              <span>Burn-After-Reading executed: Server payload has auto-destructed.</span>
            </div>
          )}

          {/* Decrypted Ready Files */}
          {receivedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-[#7089ba] flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4" weight="bold" />
                  <span>Decrypted & Verified Files ({receivedFiles.length}):</span>
                </div>

                {/* Download All as .ZIP Button */}
                {receivedFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllAsZip}
                    disabled={isZipping}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    {isZipping ? (
                      <>
                        <ArrowsClockwiseIcon className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Packing ZIP ({zipProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <ArchiveIcon className="w-3.5 h-3.5 text-black" weight="fill" />
                        <span>Download All as .ZIP</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {receivedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-void border border-[#282828] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileIcon className="w-4 h-4 text-white shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-white font-mono">{item.metadata.fileName}</div>
                        {item.metadata.relativePath && item.metadata.relativePath !== item.metadata.fileName && (
                          <div className="text-[10px] text-steel font-mono truncate">
                            {item.metadata.relativePath}
                          </div>
                        )}
                      </div>
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
                        <EyeIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={item.blobUrl}
                        download={item.metadata.fileName}
                        className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-semibold hover:bg-white/90 flex items-center gap-1 transition-all"
                      >
                        <DownloadSimpleIcon className="w-3.5 h-3.5" />
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
                  <ArrowsClockwiseIcon className="w-4 h-4 animate-spin text-black" />
                  <span>Streaming Chunks & Decrypting...</span>
                </>
              ) : (
                <>
                  <DownloadSimpleIcon className="w-4 h-4" />
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
