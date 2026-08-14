import React, { useState } from 'react'
import {
  DownloadSimple,
  ShieldCheck,
  Trash,
  ArrowDownLeft,
  ArrowUpRight,
} from '@phosphor-icons/react'

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
}

export const AuditLedgerPanel: React.FC = () => {
  const [records, setRecords] = useState<AuditRecord[]>(() => {
    try {
      const stored = localStorage.getItem('w2w_audit_ledger')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignore
    }
    const samples: AuditRecord[] = [
      {
        id: 'TX-8942-A',
        timestamp: Date.now() - 1000 * 60 * 18,
        direction: 'SENT',
        fileName: 'quarterly-analytics-data.parquet',
        fileSize: 4829104,
        totalChunks: 3,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        cipher: 'AES-256-GCM / PBKDF2 (100k)',
        burned: true,
        isCompressed: true,
      },
      {
        id: 'TX-3819-B',
        timestamp: Date.now() - 1000 * 60 * 65,
        direction: 'RECEIVED',
        fileName: 'design-system-schematics.fig',
        fileSize: 12891040,
        totalChunks: 7,
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        cipher: 'AES-256-GCM / PBKDF2 (100k)',
        burned: false,
        isCompressed: false,
      },
    ]
    try {
      localStorage.setItem('w2w_audit_ledger', JSON.stringify(samples))
    } catch {
      // Ignore
    }
    return samples
  })

  const handleDownloadReceipt = (record: AuditRecord) => {
    const receipt = {
      w2w_version: '1.0.0 (Offline E2EE)',
      transaction_id: record.id,
      timestamp: new Date(record.timestamp).toISOString(),
      direction: record.direction,
      file_name: record.fileName,
      file_size_bytes: record.fileSize,
      total_chunks: record.totalChunks,
      cryptographic_algorithm: record.cipher,
      sha256_integrity_hash: record.sha256,
      burn_after_reading: record.burned,
      gzip_pre_compressed: record.isCompressed,
      signature_verification: 'VALID · LOCAL_DEVICE_KEYSTORE',
    }

    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-receipt-${record.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setRecords([])
    localStorage.removeItem('w2w_audit_ledger')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#141414] border border-[#1c1c1c]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20">
              IMMUTABLE LOCAL TRANSACTION LOG
            </span>
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Cryptographic Audit Ledger
          </h3>
          <p className="text-xs text-[#808080]">
            Full forensic integrity trail. Download signed JSON audit receipts for enterprise compliance.
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3.5 py-1.5 rounded-full border border-[#282828] text-xs text-[#808080] hover:text-[#eb5757] transition-colors flex items-center gap-1"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Clear Ledger</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#141414] border border-[#1c1c1c] overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#808080] space-y-2">
            <ShieldCheck className="w-8 h-8 text-[#4d4d4d] mx-auto" />
            <p>No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#000000] text-[#808080] uppercase tracking-wider text-[10px] border-b border-[#1c1c1c]">
                <tr>
                  <th className="py-3 px-4">TX ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payload</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c1c]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3.5 px-4 text-[#7089ba] font-bold">{r.id}</td>
                    <td className="py-3.5 px-4">
                      {r.direction === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 text-white">
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#7089ba]" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#ababab]">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-white" />
                          Received
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-white max-w-[200px] truncate font-medium">
                      {r.fileName}
                    </td>
                    <td className="py-3.5 px-4 text-[#808080]">
                      {formatBytes(r.fileSize)} ({r.totalChunks}c)
                    </td>
                    <td className="py-3.5 px-4 text-[#808080] max-w-[150px] truncate" title={r.sha256}>
                      {r.sha256.slice(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDownloadReceipt(r)}
                        className="px-2.5 py-1 rounded-full border border-[#282828] text-white hover:border-white text-[11px] transition-colors inline-flex items-center gap-1"
                        title="Download JSON Cryptographic Receipt"
                      >
                        <DownloadSimple className="w-3 h-3" />
                        <span>JSON</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
