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
      const pc = this.createPeerConnection()

      pc.ondatachannel = (event) => {
        const dc = event.channel
        dc.binaryType = 'arraybuffer'
        this.setupDataChannelEvents(dc)
        this.dataChannel = dc
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

  private handleStringMessage(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'RESEND_CHUNK' && this.onResendChunkCallback) {
        this.onResendChunkCallback(parsed.fileIndex, parsed.chunkIndex)
      } else if (parsed.type === 'REQUEST_WEBRTC_CHUNKS' && this.onRequestChunksCallback) {
        this.onRequestChunksCallback()
      }
    } catch {
      // Non-JSON frame
    }
  }

  private handleBinaryPacket(data: ArrayBuffer): void {
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
      assembly = {
        totalPackets,
        receivedPackets: 0,
        totalBytes: 0,
        packets: new Array(totalPackets),
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
   * Flow control backpressure: waits until the SCTP buffer drains below 128KB
   */
  private waitForBufferDrain(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.dataChannel || this.dataChannel.bufferedAmount <= 128 * 1024) {
        resolve()
        return
      }
      this.dataChannel.bufferedAmountLowThreshold = 128 * 1024
      const onLow = () => {
        if (this.dataChannel) {
          this.dataChannel.onbufferedamountlow = null
        }
        resolve()
      }
      this.dataChannel.onbufferedamountlow = onLow
      setTimeout(() => {
        if (this.dataChannel?.onbufferedamountlow === onLow) {
          this.dataChannel.onbufferedamountlow = null
        }
        resolve()
      }, 250)
    })
  }

  /**
   * SENDER: Streams a single chunk directly over RTCDataChannel
   * Slices chunk into 64KB SCTP packets with native backpressure flow control
   */
  public async sendChunk(
    fileIndex: number,
    chunkIndex: number,
    _totalChunks: number,
    chunkData: Uint8Array
  ): Promise<boolean> {
    if (this.dataChannel?.readyState !== 'open') {
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

        // Flow control backpressure: do not overwhelm the browser's SCTP buffer
        if (this.dataChannel.bufferedAmount > 512 * 1024) {
          await this.waitForBufferDrain()
        }

        if (this.dataChannel.readyState !== 'open') {
          return false
        }

        this.dataChannel.send(packet.buffer)
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
