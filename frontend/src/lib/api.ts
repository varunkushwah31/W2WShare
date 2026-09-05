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
  interfaceType?: string
}

export interface NetworkDiagnosticsResponse {
  activeNetworkMode: string
  udpDiscoveryActive: boolean
  udpDiscoveryPort: number
  apIsolationSuspected: boolean
  apIsolationStatusMessage: string
  recommendedMode: string
  interfaces: NetworkInterfaceDto[]
  localIp: string
  primaryUrl: string
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

export interface AuditRecord {
  id: string
  timestamp: number
  direction: 'SENT' | 'RECEIVED'
  fileName: string
  fileSize: number
  totalChunks: number
  sha256: string
  cipher: string
  burned: boolean
  isCompressed: boolean
  userId?: string
  isPersisted?: boolean
  expiryTimestamp?: number
  isDeleted?: boolean
  mimeType?: string
  retentionDays?: number
  isExpired?: boolean
  canDownload?: boolean
  daysRemaining?: number
}

export interface AuditReceipt {
  w2w_version: string
  transaction_id: string
  timestamp: string
  direction: string
  file_name: string
  file_size_bytes: number
  total_chunks: number
  cryptographic_algorithm: string
  sha256_integrity_hash: string
  burn_after_reading: boolean
  gzip_pre_compressed: boolean
  signature_verification: string
}


const DEFAULT_OFFLINE_IP = '192.168.1.105'

function stripTrailingSlashes(str: string): string {
  let s = str.trim()
  while (s.endsWith('/')) {
    s = s.slice(0, -1)
  }
  return s
}

function resolveApiBase(backendUrl: string): string {
  if (!backendUrl) {
    return '/api'
  }
  return backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
}

const RAW_BACKEND_URL = stripTrailingSlashes(
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') as string
)
export const API_BASE = resolveApiBase(RAW_BACKEND_URL)

export function getWebSocketUrl(path = '/ws/signaling'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  // 1. Explicit VITE_WS_URL
  if (import.meta.env.VITE_WS_URL) {
    const wsBase = stripTrailingSlashes(import.meta.env.VITE_WS_URL)
    return `${wsBase}${cleanPath}`
  }

  // 2. Derived from VITE_API_URL or VITE_BACKEND_URL
  if (RAW_BACKEND_URL) {
    try {
      const parsed = new URL(RAW_BACKEND_URL)
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProto}//${parsed.host}${cleanPath}`
    } catch {
      // Ignore URL parse error and fallback
    }
  }

  // 3. Fallback to current browser location (monolith or local dev proxy)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host || 'localhost:8080'
  return `${protocol}//${host}${cleanPath}`
}

export const api = {
  // Network
  async getNetworkInfo(): Promise<NetworkInfoResponse> {
    try {
      const res = await fetch(`${API_BASE}/network/info`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback offline mock for standalone frontend testing
    }
    return {
      status: 'ONLINE_LOCAL',
      primaryUrl: window.location.origin,
      interfaces: [
        {
          name: 'wlan0',
          displayName: 'Wi-Fi Adapter (Offline P2P)',
          ip: DEFAULT_OFFLINE_IP,
          url: `https://${DEFAULT_OFFLINE_IP}:${window.location.port || '8080'}`,
          isLoopback: false,
          isWifiOrHotspot: true,
        },
      ],
      uptimeSeconds: 3600,
      version: '1.0.0 (Offline E2EE)',
    }
  },

  async getNetworkDiagnostics(): Promise<NetworkDiagnosticsResponse> {
    try {
      const res = await fetch(`${API_BASE}/network/diagnostics`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback when backend is unreachable
    }
    return {
      activeNetworkMode: 'OFFLINE_LOCAL',
      udpDiscoveryActive: false,
      udpDiscoveryPort: 8888,
      apIsolationSuspected: false,
      apIsolationStatusMessage: 'Running in offline standalone mode.',
      recommendedMode: 'OFFLINE_HOTSPOT',
      interfaces: [],
      localIp: '127.0.0.1',
      primaryUrl: 'http://localhost:8080',
    }
  },

  getWifiQrUrl(ssid: string, password = '', authType = 'WPA', size = 300): string {
    const params = new URLSearchParams({
      ssid,
      password,
      authType,
      size: String(size),
    })
    return `${API_BASE}/network/wifi-qr?${params.toString()}`
  },

  getTransferQrUrl(url: string, size = 400): string {
    const params = new URLSearchParams({
      text: url,
      size: String(size),
    })
    return `${API_BASE}/transfer/qr?${params.toString()}`
  },

  async getDiscoveredPeers(): Promise<DiscoveredPeer[]> {
    try {
      const res = await fetch(`${API_BASE}/network/peers`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback when backend is unreachable
    }
    return []
  },

  async triggerPeerScan(): Promise<DiscoveredPeer[]> {
    try {
      const res = await fetch(`${API_BASE}/network/peers/scan`, {
        method: 'POST',
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback to GET peers
    }
    return this.getDiscoveredPeers()
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

  async saveClipboardByPin(pin: string, encryptedText: string): Promise<{ sessionId?: string }> {
    const res = await fetch(`${API_BASE}/transfer/session/by-pin/${pin}/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encryptedText }),
    })
    if (!res.ok) throw new Error('Failed to save clipboard by PIN')
    return await res.json()
  },

  async getClipboardByPin(pin: string): Promise<{ text: string; sessionId?: string }> {
    const res = await fetch(`${API_BASE}/transfer/session/by-pin/${pin}/clipboard`)
    if (!res.ok) throw new Error('Failed to get clipboard by PIN')
    return await res.json()
  },

  // Chat
  async addChatMessage(sessionId: string, content: string, senderRole = 'Sender'): Promise<ChatMessage> {
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

  async addChatMessageByPin(pin: string, content: string, senderRole = 'Sender'): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/transfer/session/by-pin/${pin}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, senderRole }),
    })
    if (!res.ok) throw new Error('Failed to send chat message by PIN')
    const data = await res.json()
    return data.message
  },

  async getChatHistoryByPin(pin: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/transfer/session/by-pin/${pin}/chat`)
    if (!res.ok) throw new Error('Failed to fetch chat history by PIN')
    return await res.json()
  },

  // Audit Ledger & 7-Day Persistent File Storage
  async getAuditLedger(userId?: string): Promise<AuditRecord[]> {
    try {
      const url = userId
        ? `${API_BASE}/audit/ledger?userId=${encodeURIComponent(userId)}`
        : `${API_BASE}/audit/ledger`
      const res = await fetch(url)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback to localStorage if backend is unreachable
    }
    try {
      const stored = localStorage.getItem('w2w_audit_ledger')
      if (stored) return JSON.parse(stored)
    } catch {
      // Ignore
    }
    return []
  },

  async recordAuditTransaction(record: Partial<AuditRecord>): Promise<AuditRecord> {
    const res = await fetch(`${API_BASE}/audit/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (!res.ok) throw new Error('Failed to record audit transaction')
    return await res.json()
  },

  async persistAuditFile(
    transactionId: string,
    fileBlob: Blob,
    mimeType = 'application/octet-stream',
    userId?: string
  ): Promise<AuditRecord> {
    const formData = new FormData()
    formData.append('transactionId', transactionId)
    formData.append('file', fileBlob)
    formData.append('mimeType', mimeType)
    if (userId) {
      formData.append('userId', userId)
    }

    const res = await fetch(`${API_BASE}/audit/ledger/persist`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to persist file in 7-day database vault')
    return await res.json()
  },

  getAuditFileDownloadUrl(transactionId: string): string {
    return `${API_BASE}/audit/ledger/${transactionId}/download`
  },

  async downloadAuditFile(transactionId: string, fileName: string): Promise<void> {
    const res = await fetch(`${API_BASE}/audit/ledger/${transactionId}/download`)
    if (res.status === 410) {
      throw new Error('This file has expired after the 7-day retention limit and was automatically purged.')
    }
    if (res.status === 400) {
      throw new Error('This file was transferred in ephemeral guest mode and is not persisted in the database.')
    }
    if (!res.ok) {
      throw new Error(`Download failed (HTTP ${res.status}). File may be deleted or unavailable.`)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || `w2w-download-${transactionId}.bin`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async getAuditReceipt(transactionId: string): Promise<AuditReceipt> {
    const res = await fetch(`${API_BASE}/audit/ledger/${transactionId}/receipt`)
    if (!res.ok) throw new Error('Failed to fetch audit receipt')
    return await res.json()
  },

  async clearAuditLedger(): Promise<void> {
    try {
      await fetch(`${API_BASE}/audit/ledger`, { method: 'DELETE' })
    } catch {
      // Ignore
    }
    localStorage.removeItem('w2w_audit_ledger')
  },

  async deleteAuditRecord(transactionId: string): Promise<void> {
    await fetch(`${API_BASE}/audit/ledger/${transactionId}`, { method: 'DELETE' })
  },
}

