/**
 * W2W Share - Typed REST Client for Spring Boot Backend
 */

export interface NetworkInterfaceDto {
  name: string
  displayName: string
  ip: string
  url: string
  isLoopback: boolean
  isWifiOrHotspot: boolean
}

export interface NetworkInfoResponse {
  status: string
  primaryUrl: string
  interfaces: NetworkInterfaceDto[]
  uptimeSeconds: number
  version: string
}

export interface DiscoveredPeer {
  deviceId: string
  deviceName: string
  ip: string
  port: number
  os: string
  lastSeen: number
}

export interface FileMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  totalChunks: number
  chunkSize: number
  iv: string
  salt: string
  sha256: string
  authTag?: string
  burnAfterReading?: boolean
  isCompressed?: boolean
  originalSize?: number
  relativePath?: string
}

export interface CreateSessionRequest {
  senderId?: string
  burnAfterReading?: boolean
  maxDownloads?: number
  expiresInSeconds?: number
}

export interface CreateSessionResponse {
  sessionId: string
  pin: string
  status: string
  joinUrl: string
  burnAfterReading: boolean
  createdAt: number
}

export interface JoinSessionResponse {
  sessionId: string
  pin: string
  status: string
  fileMetadata?: FileMetadata
  fileBatch?: FileMetadata[]
  burnAfterReading: boolean
}

export interface ChunkProgressDto {
  fileIndex: number
  fileName: string
  totalChunks: number
  existingChunks: number[]
}

export interface SessionStatusResponse {
  sessionId: string
  status: string
  fileProgressList: ChunkProgressDto[]
}

export interface ChatMessage {
  id: string
  senderRole: string
  content: string
  timestamp: number
}

export interface TransferSessionDetails {
  sessionId: string
  pin: string
  status: string
  fileMetadata?: FileMetadata
  fileBatch?: FileMetadata[]
  activeFileIndex?: number
  uploadedChunks?: number
  downloadedChunks?: number
  burnAfterReading?: boolean
  hasClipboard?: boolean
}

const API_BASE = '/api'

export const api = {
  // Network
  async getNetworkInfo(): Promise<NetworkInfoResponse> {
    try {
      const res = await fetch(`${API_BASE}/network/info`)
      if (!res.ok) throw new Error('Failed to fetch network info')
      return await res.json()
    } catch {
      // Fallback offline mock for standalone frontend testing
      return {
        status: 'ONLINE_LOCAL',
        primaryUrl: window.location.origin,
        interfaces: [
          {
            name: 'wlan0',
            displayName: 'Wi-Fi Adapter (Offline P2P)',
            ip: '192.168.1.105',
            url: `http://192.168.1.105:${window.location.port || '8080'}`,
            isLoopback: false,
            isWifiOrHotspot: true,
          },
        ],
        uptimeSeconds: 3600,
        version: '1.0.0 (Offline E2EE)',
      }
    }
  },

  async getDiscoveredPeers(): Promise<DiscoveredPeer[]> {
    try {
      const res = await fetch(`${API_BASE}/network/peers`)
      if (!res.ok) throw new Error('Failed to fetch peers')
      return await res.json()
    } catch {
      return []
    }
  },

  async getHealth(): Promise<{ status: string }> {
    try {
      const res = await fetch(`${API_BASE}/network/health`)
      return await res.json()
    } catch {
      return { status: 'STANDALONE_UI' }
    }
  },

  // Transfer Sessions
  async createSession(req: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    const res = await fetch(`${API_BASE}/transfer/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error('Failed to create transfer session')
    return await res.json()
  },

  async getSession(sessionId: string): Promise<TransferSessionDetails> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}`)
    if (!res.ok) throw new Error('Failed to get session details')
    return await res.json()
  },

  async getSessionByPin(pin: string): Promise<TransferSessionDetails> {
    const res = await fetch(`${API_BASE}/transfer/session/by-pin/${pin}`)
    if (!res.ok) throw new Error(`No active session found with PIN: ${pin}`)
    return await res.json()
  },

  async joinSession(sessionId: string, pin: string, receiverId?: string): Promise<JoinSessionResponse> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, receiverId }),
    })
    if (!res.ok) throw new Error('Failed to join transfer session')
    return await res.json()
  },

  async offerBatch(sessionId: string, batch: FileMetadata[]): Promise<void> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/batch-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    if (!res.ok) throw new Error('Failed to register file batch offer')
  },

  async uploadFileChunk(
    sessionId: string,
    fileIndex: number,
    chunkIndex: number,
    data: Uint8Array
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/transfer/session/${sessionId}/file/${fileIndex}/chunk/${chunkIndex}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: data as unknown as BodyInit,
      }
    )
    if (!res.ok) throw new Error(`Failed to upload chunk ${chunkIndex} for file ${fileIndex}`)
  },

  async downloadFileChunk(
    sessionId: string,
    fileIndex: number,
    chunkIndex: number
  ): Promise<ArrayBuffer> {
    const res = await fetch(
      `${API_BASE}/transfer/session/${sessionId}/file/${fileIndex}/chunk/${chunkIndex}`
    )
    if (!res.ok) throw new Error(`Failed to download chunk ${chunkIndex}`)
    return await res.arrayBuffer()
  },

  async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/status`)
    if (!res.ok) throw new Error('Failed to get session resumption status')
    return await res.json()
  },

  async markTransferComplete(sessionId: string): Promise<{ status: string; burned: boolean }> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/complete`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to mark transfer complete')
    return await res.json()
  },

  async cancelSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/transfer/session/${sessionId}`, {
      method: 'DELETE',
    })
  },

  // Clipboard
  async saveClipboard(sessionId: string, encryptedText: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encryptedText }),
    })
    if (!res.ok) throw new Error('Failed to save clipboard')
  },

  async getClipboard(sessionId: string): Promise<{ text: string }> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/clipboard`)
    if (!res.ok) throw new Error('Failed to get clipboard')
    return await res.json()
  },

  // Chat
  async addChatMessage(sessionId: string, content: string, senderRole = 'client'): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, senderRole }),
    })
    if (!res.ok) throw new Error('Failed to send chat message')
    const data = await res.json()
    return data.message
  },

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/transfer/session/${sessionId}/chat`)
    if (!res.ok) throw new Error('Failed to fetch chat history')
    return await res.json()
  },
}
