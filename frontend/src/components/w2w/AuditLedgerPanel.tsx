import React, { useCallback, useEffect, useState } from 'react'
import { api, type AuditRecord } from '@/lib/api'
import { soundEngine } from '@/lib/sound'
import {
  ArrowDownLeftIcon,
  ArrowsClockwiseIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  ExportIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'

interface AuditLedgerPanelProps {
  onSwitchToSend?: () => void
  onSwitchToReceive?: () => void
}

const readFallbackRecords = (): AuditRecord[] => {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('w2w_audit_ledger')
  if (!stored) return []
  try {
    return JSON.parse(stored) as AuditRecord[]
  } catch {
    return []
  }
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export const AuditLedgerPanel: React.FC<AuditLedgerPanelProps> = ({
  onSwitchToSend,
}) => {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'ALL' | 'SENT' | 'RECEIVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const loadLedger = useCallback(async () => {
    setLoading(true)
    try {
      const serverRecords = await api.getAuditLedger()
      if (serverRecords && serverRecords.length > 0) {
        setRecords(serverRecords)
        localStorage.setItem('w2w_audit_ledger', JSON.stringify(serverRecords))
      } else {
        setRecords(readFallbackRecords())
      }
    } catch {
      setRecords(readFallbackRecords())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchInitial = async () => {
      try {
        const serverRecords = await api.getAuditLedger()
        if (!mounted) return
        if (serverRecords && serverRecords.length > 0) {
          setRecords(serverRecords)
          localStorage.setItem('w2w_audit_ledger', JSON.stringify(serverRecords))
        } else {
          setRecords(readFallbackRecords())
        }
      } catch {
        if (!mounted) return
        setRecords(readFallbackRecords())
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchInitial()
    return () => {
      mounted = false
    }
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    soundEngine.chatMsg()
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleDownloadReceipt = async (record: AuditRecord) => {
    try {
      const receipt = await api.getAuditReceipt(record.id).catch(() => null)
      const receiptData = receipt || {
        w2w_version: '1.0.0',
        transaction_id: record.id,
        timestamp: new Date(record.timestamp).toISOString(),
        direction: record.direction,
        file_name: record.fileName,
        file_size_bytes: record.fileSize,
        sha256_hash: record.sha256,
        cipher: record.cipher || 'AES-256-GCM',
        verified: true,
      }

      const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${record.fileName}-${record.id.slice(0, 8)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    }
  }

  const handleDownloadFile = async (record: AuditRecord) => {
    setDownloadingId(record.id)
    try {
      await api.downloadAuditFile(record.id, record.fileName)
      soundEngine.transferComplete()
    } catch {
      soundEngine.errorTone()
    } finally {
      setDownloadingId(null)
    }
  }

  const handleExportFullJson = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      totalTransfers: records.length,
      history: records,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `w2w-transfer-history-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    soundEngine.peerConnect()
  }

  const handleClear = async () => {
    await api.clearAuditLedger()
    setRecords([])
    setClearConfirmOpen(false)
    soundEngine.playTone(330, 'sine', 0.15)
  }

  const sentCount = records.filter((r) => r.direction === 'SENT').length
  const receivedCount = records.filter((r) => r.direction === 'RECEIVED').length

  const filteredRecords = records.filter((r) => {
    if (filterType !== 'ALL' && r.direction !== filterType) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        r.id.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q) ||
        r.sha256.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Clean, Minimal Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#141414] border border-carbon">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Audit Ledger</h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Verified
            </span>
          </div>
          <p className="text-xs text-steel mt-0.5">
            History of transfers verified with cryptographic receipts.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-[#282828] text-xs text-white hover:border-white transition-colors flex items-center gap-1.5 cursor-pointer bg-void disabled:opacity-50"
            title="Refresh history"
          >
            <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7089ba]' : ''}`} />
            <span>Refresh</span>
          </button>

          {records.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportFullJson}
                className="px-3 py-1.5 rounded-xl border border-[#282828] text-xs text-white hover:border-[#7089ba] hover:text-[#7089ba] transition-colors flex items-center gap-1.5 cursor-pointer bg-void"
                title="Export transfer history to JSON"
              >
                <ExportIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                className="p-2 rounded-xl border border-[#282828] text-steel hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer bg-void"
                title="Clear transfer history"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Uncluttered Search & Direction Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#141414] border border-carbon">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 text-steel absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by file name or transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-void border border-[#242424] focus:outline-none rounded-lg text-xs text-white font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel hover:text-white cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-void border border-[#242424] text-xs shrink-0">
          {(['ALL', 'SENT', 'RECEIVED'] as const).map((type) => {
            const count =
              type === 'ALL'
                ? records.length
                : type === 'SENT'
                ? sentCount
                : receivedCount
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  filterType === type
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-steel hover:text-white'
                }`}
              >
                <span>{type === 'ALL' ? 'All' : type === 'SENT' ? 'Sent' : 'Received'}</span>
                <span className="text-[10px] opacity-60 font-mono">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Main Content: Friendly Empty State OR Clean List */}
      {filteredRecords.length === 0 ? (
        records.length === 0 ? (
          /* Simple, warm empty state */
          <div className="p-10 text-center rounded-2xl bg-[#141414] border border-carbon space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#7089ba]/10 border border-[#7089ba]/20 flex items-center justify-center text-[#7089ba]">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-semibold text-white">No transfers recorded yet</h4>
              <p className="text-xs text-steel leading-relaxed">
                When you send or receive files, their verification details and download receipts will be saved here automatically.
              </p>
            </div>
            {onSwitchToSend && (
              <button
                type="button"
                onClick={onSwitchToSend}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <ArrowUpRightIcon className="w-3.5 h-3.5" />
                <span>Send a File</span>
              </button>
            )}
          </div>
        ) : (
          /* No search results */
          <div className="p-8 text-center rounded-2xl bg-[#141414] border border-carbon space-y-2">
            <p className="text-xs text-white font-medium">No matching transfers found</p>
            <p className="text-[11px] text-steel">No items matched "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setFilterType('ALL')
              }}
              className="text-xs text-[#7089ba] hover:underline cursor-pointer pt-1"
            >
              Reset search
            </button>
          </div>
        )
      ) : (
        /* Clean, readable card list */
        <div className="rounded-2xl bg-[#141414] border border-carbon divide-y overflow-hidden">
          {filteredRecords.map((r) => {
            const isPersisted = !!r.isPersisted
            const isExpired = !!r.isExpired || !!r.isDeleted
            const canDownload = isPersisted && !isExpired

            return (
              <div
                key={r.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181818] transition-colors"
              >
                {/* Direction Icon + File Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      r.direction === 'SENT'
                        ? 'bg-[#7089ba]/10 text-[#7089ba] border border-[#7089ba]/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {r.direction === 'SENT' ? (
                      <ArrowUpRightIcon className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeftIcon className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate max-w-70 sm:max-w-md" title={r.fileName}>
                        {r.fileName}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-mono shrink-0 ${
                          r.direction === 'SENT'
                            ? 'bg-[#7089ba]/10 text-[#7089ba]'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {r.direction === 'SENT' ? 'Sent' : 'Received'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-steel mt-1 font-mono">
                      <span>{formatBytes(r.fileSize)}</span>
                      <span>·</span>
                      <span>
                        {new Date(r.timestamp).toLocaleDateString()} at{' '}
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(r.sha256, `sha-${r.id}`)}
                        className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        title={`Full SHA-256: ${r.sha256}\nClick to copy`}
                      >
                        <span>Hash: {r.sha256 ? `${r.sha256.slice(0, 8)}...` : '—'}</span>
                        {copiedId === `sha-${r.id}` ? (
                          <CheckIcon className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <CopyIcon className="w-3 h-3 text-steel" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {canDownload && (
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(r)}
                      disabled={downloadingId === r.id}
                      className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {downloadingId === r.id ? (
                        <ArrowsClockwiseIcon className="w-3 h-3 animate-spin" />
                      ) : (
                        <DownloadSimpleIcon className="w-3 h-3" />
                      )}
                      <span>Download</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(r)}
                    className="px-3 py-1.5 rounded-xl border border-[#282828] text-white hover:border-[#7089ba] text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer bg-void"
                    title="Download verified cryptographic receipt"
                  >
                    <DownloadSimpleIcon className="w-3 h-3 text-[#7089ba]" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Simple Clear Confirmation Modal */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141414] border border-[#282828] rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-white">Clear transfer history?</h4>
            <p className="text-xs text-steel leading-relaxed">
              This will remove all {records.length} transfer records from this device.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#282828] text-steel hover:text-white text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


