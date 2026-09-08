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

export function getActiveBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('w2w_backend_url')
    if (override?.trim()) {
      return stripTrailingSlashes(override.trim())
    }
  }
  return RAW_BACKEND_URL
}

export function getApiBase(): string {
  return resolveApiBase(getActiveBackendUrl())
}


export function getWebSocketUrl(path = '/ws/signaling'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  const normalizeUrl = (raw: string): string => {
    // Collapse any repeated /ws/signaling or /ws paths (e.g. /ws/signaling/ws/signaling -> /ws/signaling)
    return raw
      .replace(/(\/ws\/signaling)+/g, '/ws/signaling')
      .replace(/(\/ws\/signal)+/g, '/ws/signal')
      .replace(/(\/ws\/transfer)+/g, '/ws/transfer')
  }

  // 1. Explicit VITE_WS_URL
  if (import.meta.env.VITE_WS_URL) {
    const wsBase = stripTrailingSlashes(import.meta.env.VITE_WS_URL)
    if (wsBase.endsWith(cleanPath)) {
      return normalizeUrl(wsBase)
    }
    return normalizeUrl(`${wsBase}${cleanPath}`)
  }

  // 2. Derived from active backend URL (runtime override or env var)
  const activeBackend = getActiveBackendUrl()
  if (activeBackend) {
    try {
      const fullUrl = activeBackend.startsWith('http') ? activeBackend : `https://${activeBackend}`
      const parsed = new URL(fullUrl)
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      const pathname = stripTrailingSlashes(parsed.pathname || '')
      if (pathname.endsWith(cleanPath)) {
        return normalizeUrl(`${wsProto}//${parsed.host}${pathname}`)
      }
      return normalizeUrl(`${wsProto}//${parsed.host}${pathname}${cleanPath}`)
    } catch {
      // Fallback to window.location
    }
  }

  // 3. Fallback to current browser location (monolith or local dev proxy)
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? (window.location.host || 'localhost:8080') : 'localhost:8080'
  return normalizeUrl(`${protocol}//${host}${cleanPath}`)
}

export interface PeerAnnouncePayload {
  deviceId: string
  deviceName: string
  os: string
  port?: number
}

function generateSecureDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dev_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    return `dev_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
  }
  return `dev_${Date.now().toString(36)}`
}

export function getLocalDeviceInfo(): { deviceId: string; deviceName: string; os: string } {
  let deviceId = ''
  if (typeof window !== 'undefined' && window.localStorage) {
    deviceId = localStorage.getItem('w2w_device_id') || ''
    if (!deviceId) {
      deviceId = generateSecureDeviceId()
      localStorage.setItem('w2w_device_id', deviceId)
    }
  }
  if (!deviceId) {
    deviceId = generateSecureDeviceId()
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  let os = 'Unknown OS'
  let deviceName = 'Browser Peer'

  if (/iPhone/i.test(ua)) {
    os = 'iOS'
    deviceName = 'Apple iPhone'
  } else if (/iPad/i.test(ua)) {
    os = 'iOS'
    deviceName = 'Apple iPad'
  } else if (/Android/i.test(ua)) {
    os = 'Android'
    deviceName = 'Android Device'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS'
    deviceName = 'MacBook / Mac'
  } else if (/Windows/i.test(ua)) {
    os = 'Windows'
    deviceName = 'Windows PC'
  } else if (/Linux/i.test(ua)) {
    os = 'Linux'
    deviceName = 'Linux Workstation'
  }

  return { deviceId, deviceName, os }
}

export const api = {
  // Network
  async getNetworkInfo(): Promise<NetworkInfoResponse> {
    try {
      const res = await fetch(`${getApiBase()}/network/info`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback offline mock for standalone frontend testing
    }
    const offlineHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1'
    const offlinePort = typeof window !== 'undefined' && window.location.port ? window.location.port : '8080'
    return {
      status: 'ONLINE_LOCAL',
      primaryUrl: typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8080',
      interfaces: [
        {
          name: 'wlan0',
          displayName: 'Wi-Fi Adapter (Offline P2P)',
          ip: offlineHost,
          url: `https://${offlineHost}:${offlinePort}`,
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
      const res = await fetch(`${getApiBase()}/network/diagnostics`)
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

  async announcePresence(payload?: Partial<PeerAnnouncePayload>): Promise<DiscoveredPeer | null> {
    try {
      const info = getLocalDeviceInfo()
      const body: PeerAnnouncePayload = {
        deviceId: payload?.deviceId || info.deviceId,
        deviceName: payload?.deviceName || info.deviceName,
        os: payload?.os || info.os,
        port: payload?.port,
      }
      const res = await fetch(`${getApiBase()}/network/peers/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback when backend is unreachable
    }
    return null
  },

  async getDiscoveredPeers(excludeDeviceId?: string): Promise<DiscoveredPeer[]> {
    try {
      const url = excludeDeviceId
        ? `${getApiBase()}/network/peers?excludeDeviceId=${encodeURIComponent(excludeDeviceId)}`
        : `${getApiBase()}/network/peers`
      const res = await fetch(url)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback when backend is unreachable
    }
    return []
  },

  async triggerPeerScan(excludeDeviceId?: string): Promise<DiscoveredPeer[]> {
    try {
      const res = await fetch(`${getApiBase()}/network/peers/scan`, {
        method: 'POST',
      })
      if (res.ok) {
        const peers: DiscoveredPeer[] = await res.json()
        return excludeDeviceId ? peers.filter((p) => p.deviceId !== excludeDeviceId) : peers
      }
    } catch {
      // Fallback to GET peers
    }
    return this.getDiscoveredPeers(excludeDeviceId)
  },

  // Transfer Sessions
  async createSession(req: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    const res = await fetch(`${getApiBase()}/transfer/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error('Failed to create transfer session')
    return await res.json()
  },

  async getSessionByPin(pin: string): Promise<TransferSessionDetails> {
    const res = await fetch(`${getApiBase()}/transfer/session/by-pin/${pin}`)
    if (!res.ok) throw new Error(`No active session found with PIN: ${pin}`)
    return await res.json()
  },

  async joinSession(sessionId: string, pin: string, receiverId?: string): Promise<JoinSessionResponse> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, receiverId }),
    })
    if (!res.ok) throw new Error('Failed to join transfer session')
    return await res.json()
  },

  async offerBatch(sessionId: string, batch: FileMetadata[]): Promise<void> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/batch-offer`, {
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
    data: Uint8Array,
    maxRetries = 3
  ): Promise<void> {
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(
          `${getApiBase()}/transfer/session/${sessionId}/file/${fileIndex}/chunk/${chunkIndex}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: data as unknown as BodyInit,
          }
        )
        if (res.ok) return
        lastError = new Error(`Server HTTP ${res.status}: ${res.statusText}`)
      } catch (err) {
        lastError = err
      }

      if (attempt < maxRetries) {
        const backoffMs = Math.min(250 * Math.pow(2, attempt), 2000)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
    throw new Error(
      `Failed to upload chunk ${chunkIndex} (file ${fileIndex}) after ${maxRetries + 1} attempts: ${
        lastError instanceof Error ? lastError.message : 'Network error'
      }`
    )
  },

  async downloadFileChunk(
    sessionId: string,
    fileIndex: number,
    chunkIndex: number,
    maxRetries = 3
  ): Promise<ArrayBuffer> {
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(
          `${getApiBase()}/transfer/session/${sessionId}/file/${fileIndex}/chunk/${chunkIndex}`
        )
        if (res.ok) return await res.arrayBuffer()
        lastError = new Error(`Server HTTP ${res.status}: ${res.statusText}`)
      } catch (err) {
        lastError = err
      }

      if (attempt < maxRetries) {
        const backoffMs = Math.min(250 * Math.pow(2, attempt), 2000)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
    throw new Error(
      `Failed to download chunk ${chunkIndex} (file ${fileIndex}) after ${maxRetries + 1} attempts: ${
        lastError instanceof Error ? lastError.message : 'Network error'
      }`
    )
  },

  async markTransferComplete(sessionId: string): Promise<{ status: string; burned: boolean }> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/complete`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to mark transfer complete')
    return await res.json()
  },

  async cancelSession(sessionId: string): Promise<void> {
    await fetch(`${getApiBase()}/transfer/session/${sessionId}`, {
      method: 'DELETE',
    })
  },

  // Clipboard
  async saveClipboard(sessionId: string, encryptedText: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encryptedText }),
    })
    if (!res.ok) throw new Error('Failed to save clipboard')
  },

  async getClipboard(sessionId: string): Promise<{ text: string }> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/clipboard`)
    if (!res.ok) throw new Error('Failed to get clipboard')
    return await res.json()
  },

  // Chat
  async addChatMessage(sessionId: string, content: string, senderRole = 'Sender'): Promise<ChatMessage> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, senderRole }),
    })
    if (!res.ok) throw new Error('Failed to send chat message')
    const data = await res.json()
    return data.message
  },

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${getApiBase()}/transfer/session/${sessionId}/chat`)
    if (!res.ok) throw new Error('Failed to fetch chat history')
    return await res.json()
  },

  // Audit Ledger & 7-Day Persistent File Storage
  async getAuditLedger(userId?: string): Promise<AuditRecord[]> {
    try {
      const url = userId
        ? `${getApiBase()}/audit/ledger?userId=${encodeURIComponent(userId)}`
        : `${getApiBase()}/audit/ledger`
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
    const res = await fetch(`${getApiBase()}/audit/ledger`, {
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

    const res = await fetch(`${getApiBase()}/audit/ledger/persist`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to persist file in 7-day database vault')
    return await res.json()
  },

  async downloadAuditFile(transactionId: string, fileName: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/audit/ledger/${transactionId}/download`)
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
    const res = await fetch(`${getApiBase()}/audit/ledger/${transactionId}/receipt`)
    if (!res.ok) throw new Error('Failed to fetch audit receipt')
    return await res.json()
  },

  async clearAuditLedger(): Promise<void> {
    try {
      await fetch(`${getApiBase()}/audit/ledger`, { method: 'DELETE' })
    } catch {
      // Ignore
    }
    localStorage.removeItem('w2w_audit_ledger')
  },
}

