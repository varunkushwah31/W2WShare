import React from 'react'
import { Check, X as XIcon, ShieldCheck } from '@phosphor-icons/react'

export const ArchitectureComparison: React.FC = () => {
  const specs = [
    {
      feature: '100% Offline Local LAN Direct P2P',
      w2w: 'Yes (Zero internet required)',
      cloud: 'No (Routes via cloud servers)',
      airdrop: 'Apple devices only',
      highlight: true,
    },
    {
      feature: 'Client-Side E2EE Cipher',
      w2w: 'AES-256-GCM + PBKDF2 (100k)',
      cloud: 'Server-side / TLS in transit only',
      airdrop: 'Proprietary TLS/Bluetooth',
      highlight: true,
    },
    {
      feature: 'File & Batch Size Limits',
      w2w: 'Zero Limit (Stream-to-Disk)',
      cloud: 'Capped (2GB-15GB per file)',
      airdrop: 'Memory-dependent',
      highlight: false,
    },
    {
      feature: 'Ephemeral Burn-After-Reading',
      w2w: 'Native Auto-Destruct on 1st claim',
      cloud: 'Retained on server storage',
      airdrop: 'Manual cleanup',
      highlight: true,
    },
    {
      feature: 'Subnet Peer Radar (UDP Beacon)',
      w2w: 'Port 8888 Auto-Discovery',
      cloud: 'Account / Email Invite required',
      airdrop: 'Nearby Bluetooth/Wi-Fi only',
      highlight: false,
    },
    {
      feature: 'Cryptographic Audit Receipt (.json)',
      w2w: 'Signed SHA-256 Transaction Ledger',
      cloud: 'Proprietary admin logs',
      airdrop: 'None',
      highlight: true,
    },
  ]

  return (
    <section className="w-full max-w-[1200px] mx-auto px-6 py-20 dashed-container my-12 rounded-2xl bg-[#000000]/60">
      <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#808080] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#7089ba]" />
          <span>FORENSIC TECHNICAL AUDIT</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
          Architectural Specifications: Zero Cloud vs Legacy Sharing
        </h2>
        <p className="text-sm text-[#808080]">
          Compare security primitives, throughput, and zero-knowledge operational mechanics.
        </p>
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-2xl bg-[#141414] border border-[#1c1c1c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#000000] text-[#808080] uppercase tracking-wider text-[10px] border-b border-[#1c1c1c]">
              <tr>
                <th className="py-4 px-6">Capability / Metric</th>
                <th className="py-4 px-6 text-[#7089ba] font-bold">W2WShare (Index Architecture)</th>
                <th className="py-4 px-6">Cloud Drives (GDrive / Dropbox)</th>
                <th className="py-4 px-6">Apple AirDrop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c1c]">
              {specs.map((s, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-[#181818] transition-colors ${
                    s.highlight ? 'bg-[#7089ba]/5' : ''
                  }`}
                >
                  <td className="py-4 px-6 font-medium text-white">{s.feature}</td>
                  <td className="py-4 px-6 text-[#ffffff] font-semibold flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#7089ba]/20 text-[#7089ba] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" weight="bold" />
                    </div>
                    <span>{s.w2w}</span>
                  </td>
                  <td className="py-4 px-6 text-[#808080]">
                    <div className="flex items-center gap-2">
                      <XIcon className="w-3.5 h-3.5 text-[#4d4d4d]" />
                      <span>{s.cloud}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[#808080]">{s.airdrop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
