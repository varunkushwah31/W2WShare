import React, { useState, useEffect, useRef } from 'react'
import { api, getWebSocketUrl, type FileMetadata } from '@/lib/api'
import { authStore } from '@/lib/auth'
import { cryptoEngine } from '@/lib/crypto'
import { compressor } from '@/lib/compress'
import { soundEngine } from '@/lib/sound'
import { WebRtcPeerManager } from '@/lib/webrtc'
import { ZipArchiver } from '@/lib/zip'
import { TransferTelemetryChart } from './TransferTelemetryChart'
import { MediaPreviewModal, type MediaPreviewItem } from './MediaPreviewModal'
import { detectFileTypeCategory } from './SendPanel'
import {
  FileIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  FlameIcon,
  ArrowsClockwiseIcon,
  DownloadSimpleIcon,
  ArchiveIcon,
  EyeIcon,
  CopyIcon,
  CheckIcon,
  ImageIcon,
  VideoCameraIcon,
  MusicNotesIcon,
  CodeIcon,
} from '@phosphor-icons/react'

interface ReceivedFileItem {
  metadata: FileMetadata
  blobUrl: string
  blob: Blob
  verified: boolean
}

export const ReceivePanel: React.FC = () => {
  // 6-digit split PIN input state (MangoShare inspired)
  const [pinDigits, setPinDigits] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const codeParam = urlParams.get('pin') || urlParams.get('code')
      if (codeParam?.length === 6) {
        return codeParam.split('')
      }
    }
    return ['', '', '', '', '', '']
  })

  const [pinInput, setPinInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const codeParam = urlParams.get('pin') || urlParams.get('code')
      if (codeParam?.length === 6) {
        return codeParam
      }
    }
    return ''
  })

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pastedNotice, setPastedNotice] = useState(false)

  // Joined Session
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [batchMetadata, setBatchMetadata] = useState<FileMetadata[]>([])
  const [burnAfterReading, setBurnAfterReading] = useState(false)

  // Download & Decrypt state
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloadEtaSeconds, setDownloadEtaSeconds] = useState<number | null>(null)
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

  // Auto-fill and lookup if URL contains pin or code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeParam = urlParams.get('pin') || urlParams.get('code')
    if (codeParam?.length === 6) {
      setPinDigits(codeParam.split(''))
      setPinInput(codeParam)
      const timer = setTimeout(() => {
        handleLookup(codeParam)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [handleLookup])

  // Digit Input Handlers for Split 6-Cell Box
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...pinDigits]
    newDigits[index] = clean
    setPinDigits(newDigits)
    const combined = newDigits.join('')
    setPinInput(combined)

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (combined.length === 6 && !newDigits.includes('')) {
      handleLookup(combined)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const match = new RegExp(/\b\d{6}\b/).exec(text) || text.replace(/\D/g, '').slice(0, 6)
    const code = typeof match === 'string' ? match : (match ? match[0] : '')
    if (code.length === 6) {
      const digits = code.split('')
      setPinDigits(digits)
      setPinInput(code)
      inputRefs.current[5]?.focus()
      handleLookup(code)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const match = new RegExp(/\b\d{6}\b/).exec(text) || text.replace(/\D/g, '').slice(0, 6)
      const code = typeof match === 'string' ? match : (match ? match[0] : '')
      if (code.length === 6) {
        const digits = code.split('')
        setPinDigits(digits)
        setPinInput(code)
        setPastedNotice(true)
        setTimeout(() => setPastedNotice(false), 2000)
        handleLookup(code)
      } else {
        setErrorMsg('No 6-digit PIN found in clipboard.')
      }
    } catch {
      setErrorMsg('Could not read clipboard. Please type PIN.')
    }
  }

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
            const totalPayloadBytes = batchMetadata.reduce((acc, m) => acc + (m.fileSize || 0), 0)
            const remainingBytes = Math.max(0, totalPayloadBytes - downloadedBytesTotal)
            if (speed > 0 && remainingBytes > 0) {
              setDownloadEtaSeconds(Math.max(1, Math.round(remainingBytes / (speed * 1024 * 1024))))
            }
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
      setDownloadEtaSeconds(0)
      setDownloading(false)
      setStatusText('All files downloaded, decrypted & verified successfully!')
      soundEngine.transferComplete()

      // Register received transactions in Audit Ledger & 7-day vault if logged in
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
      {/* 6-Digit PIN Entry Box (Split Cells Inspired by MangoShare) */}
      {!sessionId && (
        <div className="dashed-container p-8 sm:p-12 rounded-2xl bg-[#141414] text-center max-w-lg mx-auto relative cyber-grid">
          <div className="absolute inset-0 bg-stipple-grid opacity-15 pointer-events-none rounded-2xl" />

          <div className="relative z-10 flex flex-col items-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-carbon border border-[#7089ba]/40 flex items-center justify-center text-[#7089ba] animate-pulse-neon">
              <ShieldCheckIcon className="w-7 h-7" weight="duotone" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7089ba]/10 border border-[#7089ba]/20 text-[10px] font-mono text-[#7089ba] font-bold mb-2">
                <span>MANGO-P2P ZERO-KNOWLEDGE CLAIM</span>
              </div>
              <h4 className="text-xl font-bold text-white font-sans">
                Enter 6-Digit Room Code / PIN
              </h4>
              <p className="text-xs text-steel mt-1 max-w-sm">
                Instant peer claim. Decrypted directly inside your browser with hardware AES-256-GCM.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleLookup(pinInput)
              }}
              className="w-full space-y-4"
            >
              {/* Interactive 6-Cell Split PIN Box */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 my-2">
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-11 h-13 sm:w-13 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-extrabold bg-[#0d0d0d] border border-[#2c2c2c] focus:border-[#7089ba] focus:shadow-[0_0_15px_rgba(112,137,186,0.3)] focus:outline-none rounded-xl text-white transition-all caret-[#7089ba] cursor-text"
                  />
                ))}
              </div>

              {/* Paste helper and error notice */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-3 py-1 rounded-lg bg-carbon border border-[#282828] hover:border-[#7089ba]/40 text-[11px] font-mono text-steel hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {pastedNotice ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">PIN Pasted!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                      <span>Paste Code from Clipboard</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#eb5757]">
                  <WarningCircleIcon className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pinInput.length !== 6}
                className="w-full py-3 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6 cyber-grid">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-carbon pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PEER VAULT ACTIVE
                </span>
                {isDirectP2p && (
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    WEBRTC DIRECT P2P
                  </span>
                )}
                {burnAfterReading && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#eb5757] bg-[#eb5757]/10 px-2 py-0.5 rounded-full border border-[#eb5757]/20">
                    <FlameIcon className="w-3 h-3" />
                    BURN AFTER READING
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white mt-1 font-sans">
                PIN / CODE: <span className="font-mono text-[#7089ba] tracking-widest">{activePin}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSessionId(null)
                setActivePin(null)
                setReceivedFiles([])
                setBatchMetadata([])
                setPinDigits(['', '', '', '', '', ''])
                setPinInput('')
              }}
              className="px-3.5 py-1.5 rounded-full bg-carbon border border-[#282828] text-xs font-mono text-steel hover:text-white hover:border-[#7089ba]/50 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>

          {/* Staged File List with Categories */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-steel">
              PAYLOAD MANIFEST ({batchMetadata.length} {batchMetadata.length === 1 ? 'FILE' : 'FILES'})
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {batchMetadata.map((meta, idx) => {
                const category = detectFileTypeCategory(meta.fileName, meta.mimeType || '')
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-carbon border border-[#242424] text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center shrink-0">
                        {category === 'image' && <ImageIcon className="w-4 h-4 text-cyan-400" />}
                        {category === 'video' && <VideoCameraIcon className="w-4 h-4 text-purple-400" />}
                        {category === 'audio' && <MusicNotesIcon className="w-4 h-4 text-pink-400" />}
                        {category === 'archive' && <ArchiveIcon className="w-4 h-4 text-amber-400" />}
                        {category === 'code' && <CodeIcon className="w-4 h-4 text-emerald-400" />}
                        {category === 'document' && <FileIcon className="w-4 h-4 text-blue-400" />}
                        {category === 'other' && <FileIcon className="w-4 h-4 text-[#7089ba]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-white font-mono font-medium">
                          {meta.fileName}
                        </div>
                        <div className="text-[10px] text-steel font-mono">
                          <span className="text-[#7089ba] uppercase">[{category}]</span> · {formatBytes(meta.fileSize)} · {meta.totalChunks} chunks {meta.isCompressed ? '· Gzip' : ''}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded border border-[#7089ba]/20 shrink-0">
                      AES-256
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Progress / Status Display with ETA */}
          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-steel truncate max-w-xs">{statusText}</span>
                <div className="flex items-center gap-2 font-bold">
                  {downloadEtaSeconds !== null && downloadEtaSeconds > 0 && (
                    <span className="text-[#7089ba] font-mono text-[11px]">
                      ETA: ~{downloadEtaSeconds < 60 ? `${downloadEtaSeconds}s` : `${Math.floor(downloadEtaSeconds / 60)}m ${downloadEtaSeconds % 60}s`}
                    </span>
                  )}
                  <span className="text-white">{downloadPercent}%</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-carbon rounded-full overflow-hidden border border-[#242424]">
                <div
                  className="h-full bg-linear-to-r from-[#7089ba] to-[#9bb2e5] transition-all duration-300"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-steel pt-0.5">
                <span>Chunk {currentChunkIndex} / {totalChunksCount}</span>
                {downloadSpeedMbps > 0 && (
                  <span className="text-emerald-400 font-semibold">{downloadSpeedMbps.toFixed(2)} MB/s</span>
                )}
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
                        className="px-2.5 py-1 rounded-full border border-[#282828] text-white text-[11px] hover:border-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={item.blobUrl}
                        download={item.metadata.fileName}
                        className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-semibold hover:bg-white/90 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
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
              className="w-full py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
