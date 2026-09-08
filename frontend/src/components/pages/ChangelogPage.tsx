import React from 'react'
import { ArrowLeftIcon, GitCommitIcon, ShieldCheckIcon, CpuIcon, SparkleIcon } from '@phosphor-icons/react'

interface ChangelogPageProps {
  onBack: () => void
}

export const ChangelogPage: React.FC<ChangelogPageProps> = ({ onBack }) => {
  const releases = [
    {
      version: 'v1.0.0',
      date: 'August 15, 2026',
      tag: 'LATEST_STABLE',
      headline: 'W2W Share v1.0 Production Architecture',
      items: [
        {
          type: 'SECURITY',
          title: 'AES-256-GCM & PBKDF2',
          desc: 'Browser-native authenticated symmetric cipher with 100,000 PBKDF2 rounds and hardware-derived cryptographic salts.',
        },
        {
          type: 'PERFORMANCE',
          title: '2MB Sliding Stream Sinks',
          desc: 'Stream 10GB+ files and nested folder hierarchies directly to disk with zero browser heap memory bloat.',
        },
        {
          type: 'PROTOCOL',
          title: 'Subnet Peer Radar & WebRTC',
          desc: 'Automatic UDP multicast discovery on port 8888 and direct browser-to-browser P2P WebRTC data channels.',
        },
      ],
    },
    {
      version: 'v0.9.0',
      date: 'July 28, 2026',
      tag: 'RELEASE_CANDIDATE',
      headline: 'W2W Share v0.9 Beta Candidate',
      items: [
        {
          type: 'SECURITY',
          title: 'Ephemeral Burn-After-Reading',
          desc: 'Single-claim auto-destruct protocol that wipes in-memory session buffer handles immediately upon download completion.',
        },
        {
          type: 'PERFORMANCE',
          title: 'Gzip Pre-Compression',
          desc: 'Hardware-accelerated browser CompressionStream transforms reducing code, JSON, and text transfer payloads by up to 80%.',
        },
        {
          type: 'UI/UX BLUEPRINT',
          title: 'Drafting Table UI & QR Scanner',
          desc: 'Technical wireframe interface with dynamic optical QR codes for 1-click mobile camera pairing.',
        },
      ],
    },
    {
      version: 'v0.8.0',
      date: 'June 12, 2026',
      tag: 'ALPHA_CORE',
      headline: 'W2W Share v0.8 Core Primitives',
      items: [
        {
          type: 'PROTOCOL',
          title: 'Zero-Knowledge Local Relay',
          desc: 'Lightweight Spring Boot 4.x local interface routing without external internet or cloud escrow dependencies.',
        },
        {
          type: 'SECURITY',
          title: 'Audit History Ledger',
          desc: 'Local transaction logs producing downloadable signed JSON cryptographic audit receipts.',
        },
        {
          type: 'PERFORMANCE',
          title: 'Direct Binary Slicing',
          desc: 'Asynchronous chunk slicing supporting multi-file batch offers and recursive directory hierarchy traversal.',
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-275 mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-carbon pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20">
          SYSTEM_ARCHITECTURAL_CHANGELOG
        </div>
      </div>

      {/* Page Title */}
      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          W2W Share System Updates
        </h1>
        <p className="text-sm text-steel max-w-2xl leading-relaxed">
          Record of cryptographic enhancements, UDP discovery protocols, performance benchmarks.
        </p>
      </div>

      {/* Release Timeline */}
      <div className="space-y-12 divide-y divide-carbon">
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
              <span className="font-mono text-xs text-steel">{rel.date}</span>
            </div>

            <h3 className="text-xl font-bold text-white font-sans">
              {rel.headline}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rel.items.map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-2.5 hover:border-[#2a2a2a] transition-all"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#7089ba]">
                    {item.type === 'SECURITY' && <ShieldCheckIcon className="w-3.5 h-3.5" />}
                    {item.type === 'PERFORMANCE' && <CpuIcon className="w-3.5 h-3.5" />}
                    {item.type === 'UI/UX BLUEPRINT' && <SparkleIcon className="w-3.5 h-3.5" />}
                    {item.type === 'PROTOCOL' && <GitCommitIcon className="w-3.5 h-3.5" />}
                    <span>{item.type}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <p className="text-xs text-steel leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
