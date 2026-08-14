import React from 'react'
import { Lightning, ShieldCheck } from '@phosphor-icons/react'

interface CtaSectionProps {
  onOpenDemo: () => void
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenDemo }) => {
  return (
    <section className="relative w-full max-w-[1200px] mx-auto px-6 py-28 dashed-container my-16 rounded-2xl bg-[#000000] overflow-hidden text-center">
      {/* Stippled dot grid matrix background */}
      <div className="absolute inset-0 bg-stipple-dense opacity-40 pointer-events-none" />

      {/* Central subtle periwinkle wash glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#7089ba]/10 blur-[90px] rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7089ba]/10 border border-[#7089ba]/20 font-mono text-[10px] uppercase tracking-wider text-[#7089ba]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ZERO CLOUD · 100% OFFLINE</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-[-0.04em] leading-[1.10] font-sans">
          Transfers without <br />the wait.
        </h2>

        <p className="text-base sm:text-lg text-[#808080] max-w-lg leading-relaxed">
          Zero-knowledge client-side encryption with local subnet gigabit throughput.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <a
            href="#workspace"
            className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-none border border-white cursor-pointer flex items-center gap-1.5"
          >
            <Lightning className="w-4 h-4 text-black" weight="fill" />
            <span>Launch Transfer Studio</span>
          </a>
          <button
            onClick={onOpenDemo}
            className="px-6 py-2.5 rounded-full border border-[#282828] bg-[#141414] text-white text-sm font-medium hover:border-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-[#7089ba]" />
            <span>Join by PIN</span>
          </button>
        </div>
      </div>
    </section>
  )
}
