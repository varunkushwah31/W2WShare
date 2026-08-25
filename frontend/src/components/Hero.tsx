import React, { useState, useEffect, useRef } from 'react'
import { ArrowUpRightIcon, LightningIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { HeroLightBeamStipple } from './CadIllustrations'

interface HeroProps {
  onOpenDemo: () => void
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo }) => {
  const containerRef = useRef<HTMLElement>(null)
  const [coords, setCoords] = useState({ x: 420.5, y: 188.2 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Update CSS variables for 60fps hardware-accelerated spotlight
      containerRef.current.style.setProperty('--mouse-x', `${x}px`)
      containerRef.current.style.setProperty('--mouse-y', `${y}px`)

      // Update blueprint coordinate readout
      setCoords({
        x: Number(Math.max(0, x).toFixed(1)),
        y: Number(Math.max(0, y).toFixed(1)),
      })
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative pt-28 pb-10 flex flex-col items-center overflow-hidden dashed-divider-b bg-[#000000] cursor-default"
      style={
        {
          '--mouse-x': '50%',
          '--mouse-y': '38%',
        } as React.CSSProperties
      }
    >
      {/* Drafting table spotlight radial wash following mouse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(750px circle at var(--mouse-x) var(--mouse-y), rgba(112, 137, 186, 0.22) 0%, rgba(35, 48, 75, 0.12) 35%, rgba(18, 18, 18, 0.6) 60%, rgba(0, 0, 0, 0.95) 85%)`,
        }}
      />
      {/* Concentrated periwinkle desk lamp core glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x) var(--mouse-y), rgba(112, 137, 186, 0.25) 0%, rgba(112, 137, 186, 0.08) 50%, transparent 80%)`,
        }}
      />

      {/* Floating drafting coordinate watermark */}
      <div className="hidden lg:block absolute bottom-6 left-8 font-mono text-[10px] text-[#4d4d4d] select-none pointer-events-none z-20">
        <div>DRAFTING TABLE: NEGATIVE_SPACE</div>
        <div className="text-[#7089ba]">
          POS_X: {coords.x}mm · POS_Y: {coords.y}mm · SCALE: 1.00
        </div>
      </div>

      {/* Main Hero Content Stack (Tight, Balanced Spacing) */}
      <div className="relative z-10 max-w-[840px] mx-auto px-6 text-center flex flex-col items-center animate-in fade-in duration-700">
        {/* Eyebrow Chip with live beacon */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/20 bg-[#1c1c1c]/80 backdrop-blur-md mb-6 hover:border-white/40 transition-all cursor-pointer group shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7089ba] animate-ping" />
          <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-white font-medium">
            W2W SHARE 1.0 · 100% OFFLINE E2EE
          </span>
          <div className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            <ArrowUpRightIcon className="w-2.5 h-2.5" weight="bold" />
          </div>
        </div>

        {/* Display Headline (Raveo 1000 architectural weight) */}
        <h1 className="text-4xl sm:text-6xl md:text-[68px] font-extrabold text-white tracking-[-0.04em] leading-[1.08] mb-5 select-none font-sans">
          Encrypted file sharing made easy.
        </h1>

        {/* Subtitle in Steel #808080 */}
        <p className="text-base sm:text-lg text-[#808080] max-w-[580px] mx-auto leading-relaxed mb-7">
          Zero-trust, P2P file transfers. Browser-native E2EE, subnet peer discovery, and direct WebRTC streaming with absolutely no cloud required.
        </p>

        {/* Outlined / White Pill Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
          <a
            href="#workspace"
            className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-none cursor-pointer border border-white flex items-center gap-1.5"
          >
            <LightningIcon className="w-4 h-4 text-black" weight="fill" />
            <span>Start Sharing</span>
          </a>
          <button
            type="button"
            onClick={onOpenDemo}
            className="px-6 py-2.5 rounded-full border border-[#282828] bg-[#1c1c1c]/90 text-white text-sm font-medium hover:border-white hover:bg-[#242424] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheckIcon className="w-4 h-4 text-[#7089ba]" />
            <span>Claim by PIN</span>
          </button>
        </div>
      </div>

      {/* Bottom Radial Drafting Wash & Trusted By Badges */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 pt-2 flex flex-col items-center">
        <HeroLightBeamStipple className="mb-3" />

        <p className="text-xs text-[#808080] tracking-wide mb-4">
          Trusted across security teams, research labs, and air-gapped facilities
        </p>

        {/* Logo / Node Band */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 hover:opacity-100 transition-opacity font-mono text-xs text-[#808080]">
          <div className="flex items-center gap-2 text-white font-medium hover:text-[#7089ba] transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-[#7089ba]" />
            <span>DEFENSE LABS</span>
          </div>

          <div className="flex items-center gap-2 text-white font-medium hover:text-[#7089ba] transition-colors cursor-default">
            <span className="text-[#7089ba]">❖</span>
            <span>SYNTHETIX CORE</span>
          </div>

          <div className="flex items-center gap-2 text-white font-medium hover:text-[#7089ba] transition-colors cursor-default">
            <div className="w-3.5 h-3.5 rounded border border-[#7089ba] flex items-center justify-center text-[9px] text-[#7089ba]">⬡</div>
            <span>AIRGAP APPLIANCE</span>
          </div>

          <div className="flex items-center gap-2 text-white font-medium hover:text-[#7089ba] transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>CAMPUS SUBNET</span>
          </div>
        </div>
      </div>
    </section>
  )
}
