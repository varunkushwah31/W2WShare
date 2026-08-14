import React from 'react'
import { ArrowLeft, GitCommit, ShieldCheck, Cpu, Sparkle } from '@phosphor-icons/react'

interface ChangelogPageProps {
  onBack: () => void
}

export const ChangelogPage: React.FC<ChangelogPageProps> = ({ onBack }) => {
  const releases = [
    {
      version: 'v2.0.4',
      date: 'August 14, 2026',
      tag: 'LATEST_STABLE',
      headline: 'Subnet UDP Beacon v2 & On-the-Fly Gzip Pre-Compression Engine',
      items: [
        {
          type: 'SECURITY',
          title: 'PBKDF2 Iteration Hardening',
          desc: 'Increased PBKDF2 salt derivation to 100,000 rounds with random 16-byte cryptographically secure seeds.',
        },
        {
          type: 'PERFORMANCE',
          title: 'Direct-to-Disk Stream Sinks',
          desc: 'Implemented CompressionStream and DecompressionStream piping directly into WebCrypto AES-GCM-256 cipher blocks.',
        },
        {
          type: 'PROTOCOL',
          title: 'Subnet UDP Port 8888 Multicast Radar',
          desc: 'Sub-second peer discovery across IEEE 802.11 Wi-Fi and direct hotspot networks without internet gateway lookups.',
        },
      ],
    },
    {
      version: 'v2.0.0',
      date: 'July 28, 2026',
      tag: 'MAJOR_RELEASE',
      headline: 'Index Blueprint Wireframe UI & Drafting Table CAD Integration',
      items: [
        {
          type: 'UI/UX BLUEPRINT',
          title: 'Drafting Table Visual Architecture',
          desc: 'Complete wireframe redesign in negative space (#000000 / #1c1c1c) with periwinkle (#7089ba) vector CAD isometric illustrations.',
        },
        {
          type: 'SECURITY',
          title: 'Zero-Knowledge Ephemeral Burn',
          desc: 'Added automated single-claim auto-destruct protocol that wipes in-memory buffer references upon receiver acknowledgment.',
        },
        {
          type: 'FEATURES',
          title: 'Forensic Cryptographic Audit Receipts',
          desc: 'Instant generation of downloadable signed SHA-256 JSON transaction receipts for enterprise compliance audits.',
        },
      ],
    },
    {
      version: 'v1.8.5',
      date: 'June 12, 2026',
      tag: 'STABLE',
      headline: 'Zero-Knowledge Encrypted Clipboard & Ephemeral Local Chat',
      items: [
        {
          type: 'FEATURES',
          title: 'E2EE Local Device Clipboard Sync',
          desc: 'Synchronize API tokens, private keys, and code snippets across local network devices in under 80ms.',
        },
        {
          type: 'PROTOCOL',
          title: 'In-Session Ephemeral Chat Signaling',
          desc: 'Zero-storage live text ledger supporting Sender and Receiver roles with Web Audio synthesized tone cues.',
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-[1100px] mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20">
          SYSTEM_UPDATES · ARCHITECTURAL CHANGELOG
        </div>
      </div>

      {/* Page Title */}
      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          Changelog & System Specifications
        </h1>
        <p className="text-sm text-[#808080] max-w-2xl leading-relaxed">
          Chronological record of cryptographic enhancements, peer discovery protocols, performance benchmarks, and drafting table design updates.
        </p>
      </div>

      {/* Release Timeline */}
      <div className="space-y-12 divide-y divide-[#1c1c1c]">
        {releases.map((rel) => (
          <div key={rel.version} className="pt-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-white bg-[#141414] px-3.5 py-1 rounded-xl border border-[#282828]">
                  {rel.version}
                </span>
                <span className="font-mono text-[10px] text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20">
                  {rel.tag}
                </span>
              </div>
              <span className="font-mono text-xs text-[#808080]">{rel.date}</span>
            </div>

            <h3 className="text-xl font-bold text-white font-sans">
              {rel.headline}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rel.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-2.5 hover:border-[#2a2a2a] transition-all"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#7089ba]">
                    {item.type === 'SECURITY' && <ShieldCheck className="w-3.5 h-3.5" />}
                    {item.type === 'PERFORMANCE' && <Cpu className="w-3.5 h-3.5" />}
                    {item.type === 'UI/UX BLUEPRINT' && <Sparkle className="w-3.5 h-3.5" />}
                    {item.type === 'PROTOCOL' && <GitCommit className="w-3.5 h-3.5" />}
                    <span>{item.type}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <p className="text-xs text-[#808080] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
