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
      headline: 'W2WShare v1',
      items: [
        {
          type: 'INFO',
          title: 'W2WShare',
          desc: 'W2WShare is a file sharing tool that uses zero-knowledge end-to-end encryption to securely transfer files between devices on a local network.',
        },
        {
          type: 'FEATURES',
          title: 'Stream Sinks',
          desc: 'Transfer large files and folder hierarchies with 2MB binary chunk pipelining.',
        },
        {
          type: 'DISCOVERY',
          title: 'UDP Discovery Beacon',
          desc: 'Auto-discover peers across local Wi-Fi, Ethernet, and hotspots.',
        },
      ],
    },
    {
      version: 'v1.0.0',
      date: 'July 28, 2026',
      tag: 'CORE_ARCH',
      headline: 'W2WShare v1',
      items: [
        {
          type: 'INFO',
          title: 'W2WShare',
          desc: 'W2WShare is a file sharing tool that uses zero-knowledge end-to-end encryption to securely transfer files between devices on a local network.',
        },
        {
          type: 'FEATURES',
          title: 'Stream Sinks',
          desc: 'Transfer large files and folder hierarchies with 2MB binary chunk pipelining.',
        },
        {
          type: 'DISCOVERY',
          title: 'UDP Discovery Beacon',
          desc: 'Auto-discover peers across local Wi-Fi, Ethernet, and hotspots.',
        },
      ],
    },
    {
      version: 'v1.0.0',
      date: 'June 12, 2026',
      tag: 'CORE_ARCH',
      headline: 'W2WShare v1',
      items: [
        {
          type: 'INFO',
          title: 'W2WShare',
          desc: 'W2WShare is a file sharing tool that uses zero-knowledge end-to-end encryption to securely transfer files between devices on a local network.',
        },
        {
          type: 'FEATURES',
          title: 'Stream Sinks',
          desc: 'Transfer large files and folder hierarchies with 2MB binary chunk pipelining.',
        },
        {
          type: 'DISCOVERY',
          title: 'UDP Discovery Beacon',
          desc: 'Auto-discover peers across local Wi-Fi, Ethernet, and hotspots.',
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
          W2WShare System Updates
        </h1>
        <p className="text-sm text-[#808080] max-w-2xl leading-relaxed">
          Record of cryptographic enhancements, UDP discovery protocols, performance benchmarks.
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
                    {item.type === 'SECURITY' && <ShieldCheckIcon className="w-3.5 h-3.5" />}
                    {item.type === 'PERFORMANCE' && <CpuIcon className="w-3.5 h-3.5" />}
                    {item.type === 'UI/UX BLUEPRINT' && <SparkleIcon className="w-3.5 h-3.5" />}
                    {item.type === 'PROTOCOL' && <GitCommitIcon className="w-3.5 h-3.5" />}
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
