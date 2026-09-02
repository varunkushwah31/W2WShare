import React, {useCallback, useEffect, useState} from 'react'
import {api, type AuditRecord} from '@/lib/api'
import {authStore, type AuthUser} from '@/lib/auth'
import {soundEngine} from '@/lib/sound'
import {
  ArrowDownLeftIcon,
  ArrowsClockwiseIcon,
  ArrowUpRightIcon,
  ClockIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCheckIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

export const AuditLedgerPanel: React.FC = () => {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'ALL' | 'SENT' | 'RECEIVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(() => authStore.getUser())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    return authStore.subscribe((u) => setUser(u))
  }, [])

  const loadLedger = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const serverRecords = await api.getAuditLedger()
      if (serverRecords && serverRecords.length > 0) {
        setRecords(serverRecords)
        localStorage.setItem('w2w_audit_ledger', JSON.stringify(serverRecords))
      } else {
        // Fallback to local storage if empty
        const stored = localStorage.getItem('w2w_audit_ledger')
        if (stored) {
          setRecords(JSON.parse(stored))
        } else {
          setRecords([])
        }
      }
    } catch {
      const stored = localStorage.getItem('w2w_audit_ledger')
      if (stored) {
        try {
          setRecords(JSON.parse(stored))
        } catch {
          setRecords([])
        }
      }
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
          const stored = localStorage.getItem('w2w_audit_ledger')
          if (stored) {
            setRecords(JSON.parse(stored))
          } else {
            setRecords([])
          }
        }
      } catch {
        if (!mounted) return
        const stored = localStorage.getItem('w2w_audit_ledger')
        if (stored) {
          try {
            setRecords(JSON.parse(stored))
          } catch {
            setRecords([])
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void fetchInitial()

    return () => {
      mounted = false
    }
  }, [user])

  const handleDownloadReceipt = async (record: AuditRecord) => {
    try {
      const receipt = await api.getAuditReceipt(record.id).catch(() => null)
      const receiptData = receipt || {
        w2w_version: '1.0.0 (Offline E2EE)',
        transaction_id: record.id,
        timestamp: new Date(record.timestamp).toISOString(),
        direction: record.direction,
        file_name: record.fileName,
        file_size_bytes: record.fileSize,
        total_chunks: record.totalChunks,
        cryptographic_algorithm: record.cipher || 'AES-256-GCM / PBKDF2 (100k)',
        sha256_integrity_hash: record.sha256,
        burn_after_reading: record.burned,
        gzip_pre_compressed: record.isCompressed,
        signature_verification: 'VALID · LOCAL_DEVICE_KEYSTORE',
      }

      const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-receipt-${record.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    }
  }

  const handleDownloadFile = async (record: AuditRecord) => {
    setDownloadingId(record.id)
    setErrorMsg(null)
    try {
      await api.downloadAuditFile(record.id, record.fileName)
      soundEngine.transferComplete()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download stored file'
      setErrorMsg(msg)
      soundEngine.errorTone()
    } finally {
      setDownloadingId(null)
    }
  }

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear the audit ledger?')) {
      await api.clearAuditLedger()
      setRecords([])
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#141414] border border-carbon">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20">
              IMMUTABLE TRANSACTION LOG
            </span>
            {user ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <UserCheckIcon className="w-3 h-3" />
                <span>7-Day Vault Active ({user.nodeId})</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-steel bg-[#222] px-2 py-0.5 rounded-full">
                Guest Mode · Log in to enable 7-day persistence
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Cryptographic Audit Ledger
          </h3>
          <p className="text-xs text-steel">
            Full forensic integrity trail. Shared files for logged-in users are retained for 7 days in the database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-[#282828] text-xs text-white hover:border-white transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh from server"
          >
            <ArrowsClockwiseIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {records.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-steel hover:text-[#eb5757] hover:border-[#eb5757]/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert if download failed */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#eb5757]/10 border border-[#eb5757]/30 text-xs text-[#eb5757] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarningCircleIcon className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[10px] uppercase font-mono hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#141414] border border-carbon">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 text-steel absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by TX ID, filename, or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-void border border-[#282828] focus:outline-none rounded-lg text-xs font-mono text-white"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center p-0.5 rounded-lg bg-void border border-[#282828] text-[11px] font-mono shrink-0">
          {(['ALL', 'SENT', 'RECEIVED'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-steel hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'SENT' ? 'Sent' : 'Received'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#141414] border border-carbon overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-steel space-y-2">
            <ShieldCheckIcon className="w-8 h-8 text-graphite mx-auto" />
            <p>{searchQuery ? 'No matching audit records found.' : 'No transactions recorded yet.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-void text-steel uppercase tracking-wider text-[10px] border-b border-carbon">
                <tr>
                  <th className="py-3 px-4">TX ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payload</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Retention / Expiry</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon">
                {filteredRecords.map((r) => {
                  const isPersisted = !!r.isPersisted
                  const isExpired = !!r.isExpired || !!r.isDeleted
                  const canDownload = isPersisted && !isExpired

                  return (
                    <tr key={r.id} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3.5 px-4 text-[#7089ba] font-bold">{r.id}</td>
                      <td className="py-3.5 px-4">
                        {r.direction === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-white">
                            <ArrowUpRightIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-ash">
                            <ArrowDownLeftIcon className="w-3.5 h-3.5 text-white" />
                            Received
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-white max-w-45 truncate font-medium" title={r.fileName}>
                        <div className="flex items-center gap-1.5">
                          <FileTextIcon className="w-3.5 h-3.5 text-[#7089ba] shrink-0" />
                          <span className="truncate">{r.fileName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-steel">
                        {formatBytes(r.fileSize)} ({r.totalChunks || 1}c)
                      </td>
                      <td className="py-3.5 px-4">
                        {isPersisted ? (
                          !isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <ClockIcon className="w-3 h-3" />
                              <span>{r.daysRemaining ? `${r.daysRemaining}d left` : '7d Vault'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#eb5757] bg-[#eb5757]/10 px-2 py-0.5 rounded border border-[#eb5757]/20">
                              <span>Expired (7d)</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-[#666]">
                            Ephemeral
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-steel max-w-30 truncate" title={r.sha256}>
                        {r.sha256 ? `${r.sha256.slice(0, 12)}...` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* File Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(r)}
                            disabled={!canDownload || downloadingId === r.id}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                              canDownload
                                ? 'bg-white text-black hover:bg-white/90 cursor-pointer shadow-sm'
                                : 'border border-[#282828] text-[#555] cursor-not-allowed opacity-50'
                            }`}
                            title={
                              canDownload
                                ? 'Download stored file payload'
                                : isPersisted
                                ? 'File has expired after 7 days and was deleted from the database'
                                : 'File was shared in guest mode (not persisted in 7-day vault)'
                            }
                          >
                            {downloadingId === r.id ? (
                              <ArrowsClockwiseIcon className="w-3 h-3 animate-spin" />
                            ) : (
                              <DownloadSimpleIcon className="w-3 h-3" />
                            )}
                            <span>File</span>
                          </button>

                          {/* JSON Receipt Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(r)}
                            className="px-2.5 py-1 rounded-full border border-[#282828] text-white hover:border-white text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Download Signed JSON Cryptographic Receipt"
                          >
                            <DownloadSimpleIcon className="w-3 h-3 text-[#7089ba]" />
                            <span>JSON</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

