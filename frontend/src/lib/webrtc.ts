/**
 * W2W Share — Direct WebRTC RTCDataChannel Streaming Engine
 * Provides 100% offline LAN peer-to-peer zero-relay binary chunk transfers
 * with automatic fallback to local HTTP chunk streaming.
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

export class WebRtcPeerManager {
  public readonly role: 'sender' | 'receiver'
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private state: WebRtcState = 'IDLE'
  private isDirectP2p = false

  private wsSendCallback: ((signal: { type: string; payload: unknown }) => void) | null = null
  private onStateChangeCallback: ((state: WebRtcState, stats: WebRtcStats) => void) | null = null
  private onChunkReceiveCallback: ChunkReceiveHandler | null = null

  // Telemetry
  private totalBytesTransferred = 0
  private lastBytesMeasurement = 0
  private lastTimeMeasurement = Date.now()
  private currentMbps = 0
  private peakMbps = 0
  private readonly rttMs = 0
  private speedTimer: number | null = null

  // Buffer chunk queuing on receiver
  private pendingChunkHeader: ChunkTransferPacket | null = null

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
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'CHUNK_DATA') {
            this.pendingChunkHeader = parsed as ChunkTransferPacket
          }
        } catch {
          // Non-JSON frame
        }
      } else if (data instanceof ArrayBuffer) {
        this.totalBytesTransferred += data.byteLength
        if (this.pendingChunkHeader && this.onChunkReceiveCallback) {
          const { fileIndex, chunkIndex } = this.pendingChunkHeader
          this.pendingChunkHeader = null
          this.onChunkReceiveCallback(fileIndex, chunkIndex, data)
        }
      }
    }
  }

  /**
   * SENDER: Streams a single chunk directly over RTCDataChannel with flow control backpressure
   */
  public async sendChunk(
    fileIndex: number,
    chunkIndex: number,
    totalChunks: number,
    chunkData: Uint8Array
  ): Promise<boolean> {
    if (this.dataChannel?.readyState !== 'open') {
      return false
    }

    try {
      this.updateState('STREAMING')

      // 1. Send Header Frame
      const header: ChunkTransferPacket = {
        type: 'CHUNK_DATA',
        fileIndex,
        chunkIndex,
        totalChunks,
        payloadSize: chunkData.length,
      }
      this.dataChannel.send(JSON.stringify(header))

      // 2. Manage DataChannel Backpressure
      if (this.dataChannel.bufferedAmount > 256 * 1024) {
        await new Promise<void>((resolve) => {
          const checkBuffer = () => {
            if (!this.dataChannel || this.dataChannel.bufferedAmount < 64 * 1024) {
              resolve()
            } else {
              setTimeout(checkBuffer, 10)
            }
          }
          checkBuffer()
        })
      }

      // 3. Send raw ArrayBuffer payload
      this.dataChannel.send(chunkData.buffer as ArrayBuffer)
      this.totalBytesTransferred += chunkData.length
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
    if (this.dataChannel) {
      try {
        this.dataChannel.close()
      } catch {}
      this.dataChannel = null
    }
    if (this.pc) {
      try {
        this.pc.close()
      } catch {}
      this.pc = null
    }
    this.updateState('CLOSED')
  }
}
