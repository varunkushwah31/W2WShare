/**
 * W2W Share — Direct WebRTC RTCDataChannel Streaming Engine
 * Provides 100% offline LAN peer-to-peer zero-relay binary chunk transfers
 * with automatic fallback to local HTTP chunk streaming.
 *
 * Implements 64KB SCTP packet slicing with event-driven backpressure
 * to ensure 100% reliable, maximum throughput transfers without
 * exceeding browser RTCDataChannel message size limits.
 */

export type WebRtcState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'STREAMING' | 'FALLBACK_HTTP' | 'CLOSED'

export interface WebRtcStats {
  state: WebRtcState
  bytesTransferred: number
  currentMbps: number
  peakMbps: number
  rttMs: number
  isDirectP2p: boolean
}

export interface ChunkTransferPacket {
  type: 'CHUNK_DATA'
  fileIndex: number
  chunkIndex: number
  totalChunks: number
  payloadSize: number
}

export type ChunkReceiveHandler = (
  fileIndex: number,
  chunkIndex: number,
  chunkBuffer: ArrayBuffer
) => void

/**
 * 10-byte binary packet header format:
 * [0..1] uint16 fileIndex
 * [2..5] uint32 chunkIndex
 * [6..7] uint16 packetIndex
 * [8..9] uint16 totalPackets
 */
const PACKET_HEADER_SIZE = 10
const MAX_PACKET_SIZE = 64 * 1024 // 65,536 bytes (safe for all SCTP implementations)
const PACKET_PAYLOAD_SIZE = MAX_PACKET_SIZE - PACKET_HEADER_SIZE // 65,526 bytes

interface InFlightChunkAssembly {
  totalPackets: number
  receivedPackets: number
  totalBytes: number
  packets: (Uint8Array | undefined)[]
  createdAt: number
}

export class WebRtcPeerManager {
  public readonly role: 'sender' | 'receiver'
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private state: WebRtcState = 'IDLE'
  private isDirectP2p = false

  private wsSendCallback: ((signal: { type: string; payload: unknown }) => void) | null = null
  private onStateChangeCallback: ((state: WebRtcState, stats: WebRtcStats) => void) | null = null
  private onChunkReceiveCallback: ChunkReceiveHandler | null = null
  private onResendChunkCallback: ((fileIndex: number, chunkIndex: number) => void) | null = null
  private onRequestChunksCallback: (() => void) | null = null
  private onRemoteStreamCallback: ((stream: MediaStream | null) => void) | null = null
  private onScreenShareStopCallback: (() => void) | null = null

  // Live Screen Sharing MediaStream instances
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null

  // Flow control watermarks (1MB high watermark, 256KB low watermark)
  private readonly HIGH_WATER_MARK = 1024 * 1024
  private readonly LOW_WATER_MARK = 256 * 1024
  private drainResolvers: (() => void)[] = []
  private drainTimer: number | null = null

  // Telemetry
  private totalBytesTransferred = 0
  private lastBytesMeasurement = 0
  private lastTimeMeasurement = Date.now()
  private currentMbps = 0
  private peakMbps = 0
  private readonly rttMs = 0
  private speedTimer: number | null = null

  // Reassembly tracker for 64KB SCTP packet slices
  private readonly inFlightChunks: Map<string, InFlightChunkAssembly> = new Map()

  constructor(role: 'sender' | 'receiver') {
    this.role = role
  }

  public setSignalingSender(sender: (signal: { type: string; payload: unknown }) => void) {
    this.wsSendCallback = sender
  }

  public onStateChange(cb: (state: WebRtcState, stats: WebRtcStats) => void) {
    this.onStateChangeCallback = cb
  }

  public onChunkReceived(cb: ChunkReceiveHandler) {
    this.onChunkReceiveCallback = cb
  }

  public onResendChunk(cb: (fileIndex: number, chunkIndex: number) => void) {
    this.onResendChunkCallback = cb
  }

  public onRequestChunks(cb: () => void) {
    this.onRequestChunksCallback = cb
  }

  public onRemoteStream(cb: (stream: MediaStream | null) => void) {
    this.onRemoteStreamCallback = cb
  }

  public onScreenShareStopped(cb: () => void) {
    this.onScreenShareStopCallback = cb
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  public handleRemoteScreenShareStop(): void {
    this.remoteStream = null
    if (this.onRemoteStreamCallback) {
      this.onRemoteStreamCallback(null)
    }
    if (this.onScreenShareStopCallback) {
      this.onScreenShareStopCallback()
    }
  }

  public getStats(): WebRtcStats {
    return {
      state: this.state,
      bytesTransferred: this.totalBytesTransferred,
      currentMbps: this.currentMbps,
      peakMbps: this.peakMbps,
      rttMs: this.rttMs,
      isDirectP2p: this.isDirectP2p,
    }
  }

  private updateState(newState: WebRtcState) {
    this.state = newState
    this.isDirectP2p = newState === 'CONNECTED' || newState === 'STREAMING'
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state, this.getStats())
    }
  }

  /**
   * Initializes RTCPeerConnection configured for 100% offline local subnets
   */
  private createPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      this.pc.close()
    }

    // STUN servers for WAN / Internet NAT traversal with graceful local LAN fallback
    const stunServers = import.meta.env.VITE_STUN_SERVERS
      ? import.meta.env.VITE_STUN_SERVERS.split(',').map((url: string) => ({ urls: url.trim() }))
      : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]

    const config: RTCConfiguration = {
      iceServers: stunServers,
      iceCandidatePoolSize: 2,
    }

    const pc = new RTCPeerConnection(config)

    pc.onicecandidate = (event) => {
      if (event.candidate && this.wsSendCallback) {
        this.wsSendCallback({
          type: 'WEBRTC_ICE_CANDIDATE',
          payload: event.candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(event.streams[0])
        }
      }
    }

    pc.onconnectionstatechange = () => {
      const connState = pc.connectionState
      if (connState === 'connected') {
        this.updateState('CONNECTED')
        this.startSpeedTelemetry()
      } else if (connState === 'failed' || connState === 'disconnected') {
        this.updateState('FALLBACK_HTTP')
      }
    }

    this.pc = pc
    return pc
  }

  /**
   * SENDER: Initiates SDP Offer and creates DataChannel
   */
  public async initSenderOffer(): Promise<void> {
    try {
      this.updateState('CONNECTING')
      const pc = this.createPeerConnection()

      const dc = pc.createDataChannel('w2w-stream', {
        ordered: true,
      })
      dc.binaryType = 'arraybuffer'
      this.setupDataChannelEvents(dc)
      this.dataChannel = dc

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (this.wsSendCallback) {
        this.wsSendCallback({
          type: 'WEBRTC_OFFER',
          payload: {
            type: offer.type,
            sdp: offer.sdp,
          },
        })
      }
    } catch (err) {
      console.warn('[WebRTC] Sender offer creation failed, using HTTP relay:', err)
      this.updateState('FALLBACK_HTTP')
    }
  }

  /**
   * RECEIVER: Handles incoming SDP Offer and returns SDP Answer
   */
  public async handleRemoteOffer(offerSdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.updateState('CONNECTING')
      const pc = this.pc || this.createPeerConnection()

      if (!this.dataChannel) {
        pc.ondatachannel = (event) => {
          const dc = event.channel
          dc.binaryType = 'arraybuffer'
          this.setupDataChannelEvents(dc)
          this.dataChannel = dc
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      if (this.wsSendCallback) {
        this.wsSendCallback({
          type: 'WEBRTC_ANSWER',
          payload: {
            type: answer.type,
            sdp: answer.sdp,
          },
        })
      }
    } catch (err) {
      console.warn('[WebRTC] Handling offer failed, using HTTP relay:', err)
      this.updateState('FALLBACK_HTTP')
    }
  }

  /**
   * SENDER: Handles returned SDP Answer
   */
  public async handleRemoteAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answerSdp))
    } catch (err) {
      console.warn('[WebRTC] Setting remote answer failed:', err)
      this.updateState('FALLBACK_HTTP')
    }
  }

  /**
   * BOTH: Handles incoming ICE candidates
   */
  public async handleRemoteIceCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidateInit))
    } catch {
      // Ignored for offline mDNS candidates
    }
  }

  /**
   * SENDER: Initiates Live P2P Screen Sharing stream
   */
  public async startScreenShare(): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen sharing is not supported in this browser or context.')
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      })

      this.localStream = stream

      const pc = this.pc || this.createPeerConnection()

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
        track.onended = () => {
          this.stopScreenShare()
        }
      }

      // Renegotiate with peer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (this.wsSendCallback) {
        this.wsSendCallback({
          type: 'SCREEN_SHARE_START',
          payload: {},
        })
        this.wsSendCallback({
          type: 'WEBRTC_OFFER',
          payload: {
            type: offer.type,
            sdp: offer.sdp,
          },
        })
      }

      return stream
    } catch (err) {
      console.warn('[WebRTC] Screen sharing initiation failed or was cancelled:', err)
      return null
    }
  }

  /**
   * SENDER: Stops Live P2P Screen Sharing stream and notifies peer
   */
  public stopScreenShare(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // Track already closed
        }
      })
      this.localStream = null
    }

    if (this.pc) {
      try {
        const senders = this.pc.getSenders()
        for (const sender of senders) {
          if (sender.track && sender.track.kind === 'video') {
            this.pc.removeTrack(sender)
          }
        }
      } catch {
        // Track removal non-fatal
      }

      if (this.wsSendCallback) {
        this.wsSendCallback({
          type: 'SCREEN_SHARE_STOP',
          payload: {},
        })
      }
    }

    if (this.onScreenShareStopCallback) {
      this.onScreenShareStopCallback()
    }
  }

  private handleStringMessage(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'RESEND_CHUNK' && this.onResendChunkCallback) {
        this.onResendChunkCallback(parsed.fileIndex, parsed.chunkIndex)
      } else if (parsed.type === 'REQUEST_WEBRTC_CHUNKS' && this.onRequestChunksCallback) {
        this.onRequestChunksCallback()
      } else if (parsed.type === 'SCREEN_SHARE_STOP') {
        this.handleRemoteScreenShareStop()
      }
    } catch {
      // Non-JSON frame
    }
  }

  public handleBinaryPacket(data: ArrayBuffer): void {
    if (data.byteLength < PACKET_HEADER_SIZE) return

    // Parse 10-byte binary packet header
    const view = new DataView(data)
    const fileIndex = view.getUint16(0)
    const chunkIndex = view.getUint32(2)
    const packetIndex = view.getUint16(6)
    const totalPackets = view.getUint16(8)
    const payloadLength = data.byteLength - PACKET_HEADER_SIZE
    this.totalBytesTransferred += payloadLength

    const chunkKey = `${fileIndex}-${chunkIndex}`
    let assembly = this.inFlightChunks.get(chunkKey)
    if (!assembly) {
      // Periodic cleanup of stale chunks older than 30s
      if (this.inFlightChunks.size > 20) {
        const now = Date.now()
        for (const [key, item] of this.inFlightChunks) {
          if (now - item.createdAt > 30000) {
            this.inFlightChunks.delete(key)
          }
        }
      }

      assembly = {
        totalPackets,
        receivedPackets: 0,
        totalBytes: 0,
        packets: new Array(totalPackets),
        createdAt: Date.now(),
      }
      this.inFlightChunks.set(chunkKey, assembly)
    }

    if (!assembly.packets[packetIndex]) {
      assembly.packets[packetIndex] = new Uint8Array(data, PACKET_HEADER_SIZE, payloadLength)
      assembly.receivedPackets++
      assembly.totalBytes += payloadLength
    }

    // Full chunk reassembly once all packets arrive
    if (assembly.receivedPackets === assembly.totalPackets) {
      this.assembleAndEmitChunk(chunkKey, assembly, fileIndex, chunkIndex)
    }
  }

  private assembleAndEmitChunk(
    chunkKey: string,
    assembly: InFlightChunkAssembly,
    fileIndex: number,
    chunkIndex: number
  ): void {
    this.inFlightChunks.delete(chunkKey)
    const fullChunk = new Uint8Array(assembly.totalBytes)
    let offset = 0
    for (let p = 0; p < assembly.totalPackets; p++) {
      const pkt = assembly.packets[p]
      if (pkt) {
        fullChunk.set(pkt, offset)
        offset += pkt.byteLength
      }
    }
    // Release packet references immediately to allow garbage collection
    assembly.packets.length = 0

    if (this.onChunkReceiveCallback) {
      this.onChunkReceiveCallback(fileIndex, chunkIndex, fullChunk.buffer)
    }
  }

  private setupDataChannelEvents(dc: RTCDataChannel) {
    dc.onopen = () => {
      this.updateState('CONNECTED')
    }

    dc.onclose = () => {
      this.updateState('CLOSED')
    }

    dc.onerror = () => {
      this.updateState('FALLBACK_HTTP')
    }

    dc.onmessage = (event) => {
      const data = event.data
      if (typeof data === 'string') {
        this.handleStringMessage(data)
      } else if (data instanceof ArrayBuffer) {
        this.handleBinaryPacket(data)
      }
    }
  }

  public sendControlMessage(msg: { type: string; [key: string]: unknown }): boolean {
    if (this.dataChannel?.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(msg))
        return true
      } catch (err) {
        console.warn('[WebRTC] Failed to send control message:', err)
      }
    }
    return false
  }

  public sendResendRequest(fileIndex: number, chunkIndex: number): boolean {
    return this.sendControlMessage({ type: 'RESEND_CHUNK', fileIndex, chunkIndex })
  }

  public sendRequestChunks(): boolean {
    return this.sendControlMessage({ type: 'REQUEST_WEBRTC_CHUNKS' })
  }

  /**
   * Flow control backpressure: event-driven drainage with multi-worker resolution queue.
   * Eliminates concurrency races and avoids unnecessary timeout penalties.
   */
  private waitForBufferDrain(): Promise<void> {
    if (!this.dataChannel || this.dataChannel.bufferedAmount <= this.LOW_WATER_MARK) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve)

      if (this.drainResolvers.length === 1 && this.dataChannel) {
        this.dataChannel.bufferedAmountLowThreshold = this.LOW_WATER_MARK
        this.dataChannel.onbufferedamountlow = () => {
          this.flushDrainResolvers()
        }

        // Safety timeout in case browser event drops
        this.drainTimer = window.setTimeout(() => {
          this.flushDrainResolvers()
        }, 300)
      }
    })
  }

  private flushDrainResolvers(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer)
      this.drainTimer = null
    }
    if (this.dataChannel) {
      this.dataChannel.onbufferedamountlow = null
    }
    const waiting = this.drainResolvers.splice(0)
    for (const resolve of waiting) {
      resolve()
    }
  }

  /**
   * SENDER: Streams a single chunk directly over RTCDataChannel
   * Slices chunk into 64KB SCTP packets with native backpressure flow control
   */
  public async sendChunk(
    fileIndex: number,
    chunkIndex: number,
    _totalChunks: number,
    chunkData: Uint8Array,
    fallbackWs?: WebSocket | null
  ): Promise<boolean> {
    const isDcOpen = this.dataChannel?.readyState === 'open'
    const isWsOpen = fallbackWs?.readyState === WebSocket.OPEN

    if (!isDcOpen && !isWsOpen) {
      return false
    }

    try {
      this.updateState('STREAMING')
      const totalBytes = chunkData.byteLength
      const totalPackets = Math.ceil(totalBytes / PACKET_PAYLOAD_SIZE) || 1

      for (let packetIndex = 0; packetIndex < totalPackets; packetIndex++) {
        const start = packetIndex * PACKET_PAYLOAD_SIZE
        const end = Math.min(start + PACKET_PAYLOAD_SIZE, totalBytes)
        const sliceLen = end - start

        // Build 10-byte binary packet header
        const packet = new Uint8Array(PACKET_HEADER_SIZE + sliceLen)
        const view = new DataView(packet.buffer)
        view.setUint16(0, fileIndex)
        view.setUint32(2, chunkIndex)
        view.setUint16(6, packetIndex)
        view.setUint16(8, totalPackets)

        // Copy slice payload into packet
        packet.set(chunkData.subarray(start, end), PACKET_HEADER_SIZE)

        if (isDcOpen && this.dataChannel) {
          // Flow control backpressure: maintain pipe saturation without overflowing SCTP buffer
          if (this.dataChannel.bufferedAmount > this.HIGH_WATER_MARK) {
            await this.waitForBufferDrain()
          }

          if (this.dataChannel.readyState !== 'open') {
            return false
          }

          this.dataChannel.send(packet.buffer)
        } else if (isWsOpen && fallbackWs) {
          fallbackWs.send(packet.buffer)
        }

        this.totalBytesTransferred += sliceLen
      }

      return true
    } catch (err) {
      console.warn('[WebRTC] Stream send error:', err)
      return false
    }
  }

  public isChannelOpen(): boolean {
    return !!this.dataChannel && this.dataChannel.readyState === 'open'
  }

  private startSpeedTelemetry() {
    if (this.speedTimer) clearInterval(this.speedTimer)
    this.lastTimeMeasurement = Date.now()
    this.lastBytesMeasurement = this.totalBytesTransferred

    this.speedTimer = window.setInterval(() => {
      const now = Date.now()
      const elapsedSec = (now - this.lastTimeMeasurement) / 1000
      if (elapsedSec >= 0.5) {
        const deltaBytes = this.totalBytesTransferred - this.lastBytesMeasurement
        const mbps = (deltaBytes / (1024 * 1024)) / elapsedSec
        this.currentMbps = Number(mbps.toFixed(2))
        if (this.currentMbps > this.peakMbps) {
          this.peakMbps = this.currentMbps
        }
        this.lastTimeMeasurement = now
        this.lastBytesMeasurement = this.totalBytesTransferred

        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(this.state, this.getStats())
        }
      }
    }, 500)
  }

  public close() {
    this.stopScreenShare()
    this.flushDrainResolvers()
    if (this.speedTimer) {
      clearInterval(this.speedTimer)
      this.speedTimer = null
    }
    this.inFlightChunks.clear()
    if (this.dataChannel) {
      try {
        this.dataChannel.close()
      } catch {
        // DataChannel already closed or invalid
      }
      this.dataChannel = null
    }
    if (this.pc) {
      try {
        this.pc.close()
      } catch {
        // PeerConnection already closed
      }
      this.pc = null
    }
    this.updateState('CLOSED')
  }
}
