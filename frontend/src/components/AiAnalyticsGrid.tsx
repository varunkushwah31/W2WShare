import React from 'react'
import {
  LaptopWandCadIllustration,
  PedestalAwardCadIllustration,
  LightningVortexCadIllustration,
  CoinStacksCadIllustration,
} from './CadIllustrations'
import { ShieldCheck } from '@phosphor-icons/react'

export const AiAnalyticsGrid: React.FC = () => {
  const cards = [
    {
      title: 'Fast + Direct Stream Sinks',
      description: 'Stream 10GB+ files and recursive folder hierarchies with 2MB binary chunk pipelining.',
      illustration: <LaptopWandCadIllustration />,
    },
    {
      title: 'Zero-Knowledge Ephemeral Burn',
      description: 'Single-claim auto-destruct protocol that wipes in-memory buffer references upon receiver confirmation.',
      illustration: <PedestalAwardCadIllustration />,
    },
    {
      title: 'Subnet Peer Radar (Port 8888)',
      description: 'Zero-configuration UDP discovery across local Wi-Fi, Ethernet, and hotspots with 0ms cloud latency.',
      illustration: <LightningVortexCadIllustration />,
    },
    {
      title: 'Encrypted Clipboard & Audit Ledger',
      description: 'End-to-end encrypted token and chat syncing with downloadable signed SHA-256 JSON transaction receipts.',
      illustration: <CoinStacksCadIllustration />,
    },
  ]

  return (
    <section className="w-full max-w-[1200px] mx-auto px-6 py-20 dashed-container my-12 rounded-2xl bg-[#000000]/60">
      {/* Centered Heading */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#808080] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#7089ba]" />
          <span>CRYPTOGRAPHIC SYSTEM PRIMITIVES</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
          Engineered for 100% offline, zero-cloud peer data transit.
        </h2>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {cards.map((card, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#1c1c1c] hover:border-[#2a2a2a] transition-all group"
          >
            <div className="w-full mb-6 flex justify-center group-hover:scale-[1.02] transition-transform duration-300">
              {card.illustration}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 font-sans">
              {card.title}
            </h3>
            <p className="text-sm text-[#808080] max-w-sm leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
