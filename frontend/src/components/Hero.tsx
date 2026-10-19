import React, { useEffect, useRef } from 'react'
import { ArrowUpRightIcon, LightningIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { HeroLightBeamStipple } from './CadIllustrations'

interface HeroProps {
  onOpenDemo: () => void
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo }) => {
  const containerRef = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const coordsRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const glow = glowRef.current
    if (!container || !glow) return

    let rafId: number | null = null
    let hasMoved = false

    const updateGlowPosition = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      // Check if mouse is within or near the hero bounds
      if (x < -100 || x > rect.width + 100 || y < -100 || y > rect.height + 100) {
        glow.style.opacity = '0'
        return
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        if (!glowRef.current) return

        if (!hasMoved) {
          // Snap directly on initial entry without fly-in transition
          glowRef.current.style.transition = 'opacity 0.4s ease-out'
          glowRef.current.style.transform = `translate3d(${x - 360}px, ${y - 360}px, 0)`
          glowRef.current.style.opacity = '1'
          hasMoved = true
          requestAnimationFrame(() => {
            if (glowRef.current) {
              glowRef.current.style.transition = 'opacity 0.4s ease-out, transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)'
            }
          })
        } else {
          glowRef.current.style.transform = `translate3d(${x - 360}px, ${y - 360}px, 0)`
          glowRef.current.style.opacity = '1'
        }

        if (coordsRef.current) {
          coordsRef.current.textContent = `POS_X: ${Math.max(0, x).toFixed(1)}mm · POS_Y: ${Math.max(0, y).toFixed(1)}mm · SCALE: 1.00`
        }
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateGlowPosition(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateGlowPosition(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleMouseLeave = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      if (glowRef.current) {
        glowRef.current.style.opacity = '0'
      }
    }

    // Attach to window for effortless, uninterrupted tracking across all child elements and sticky header
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100svh] min-h-[100dvh] w-full pt-16 sm:pt-24 md:pt-28 pb-4 sm:pb-8 md:pb-10 safe-area-bottom flex flex-col justify-between items-center overflow-hidden dashed-divider-b bg-void cursor-default"
    >
      {/* Smooth hardware-accelerated cursor following dim light effect */}
      <div
        ref={glowRef}
        className="hero-cursor-glow pointer-events-none absolute top-0 left-0 rounded-full opacity-0 will-change-transform z-0"
        style={{
          width: '720px',
          height: '720px',
          transition: 'opacity 0.4s ease-out, transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Floating drafting coordinate watermark */}
      <div className="hidden lg:block absolute bottom-6 left-8 font-mono text-[10px] text-graphite select-none pointer-events-none z-20">
        <div>DRAFTING TABLE: ARCHITECTURAL_SPACE</div>
        <div className="text-periwinkle">
          <span ref={coordsRef}>POS_X: 420.5mm · POS_Y: 188.2mm · SCALE: 1.00</span>
        </div>
      </div>

      {/* Main Hero Content Stack (Vertically centered in available viewport space) */}
      <div className="relative z-10 w-full max-w-210 mx-auto px-4 sm:px-6 text-center my-auto flex flex-col items-center animate-in fade-in duration-700 py-2 sm:py-6">
        {/* Eyebrow Chip with live beacon */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-0.5 sm:py-1 rounded-full border border-carbon bg-carbon/80 backdrop-blur-md mb-3 sm:mb-6 hover:border-steel transition-all cursor-pointer group shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-periwinkle animate-ping" />
          <span className="font-mono text-[8.5px] sm:text-[9px] uppercase tracking-[0.04em] text-paper font-medium">
            W2W SHARE 1.0 · 100% OFFLINE E2EE
          </span>
          <div className="w-3.5 h-3.5 rounded-full bg-paper text-void flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            <ArrowUpRightIcon className="w-2.5 h-2.5" weight="bold" />
          </div>
        </div>

        {/* Display Headline (Raveo 1000 architectural weight) */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold text-paper tracking-[-0.04em] leading-[1.08] mb-3 sm:mb-5 select-none font-sans">
          Encrypted file sharing made easy.
        </h1>

        {/* Subtitle in Steel */}
        <p className="text-xs sm:text-base md:text-lg text-steel max-w-145 mx-auto leading-relaxed mb-4 sm:mb-7 px-2 sm:px-0">
          Zero-trust, P2P file transfers. Browser-native E2EE, subnet peer discovery, and direct WebRTC streaming with absolutely no cloud required.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
          <a
            href="#workspace"
            className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-paper text-void text-xs sm:text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-none cursor-pointer border border-paper flex items-center gap-1.5"
          >
            <LightningIcon className="w-4 h-4" weight="fill" />
            <span>Start Sharing</span>
          </a>
          <button
            type="button"
            onClick={onOpenDemo}
            className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full border border-carbon bg-carbon text-paper text-xs sm:text-sm font-medium hover:border-paper hover:bg-carbon-hover transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheckIcon className="w-4 h-4 text-periwinkle" />
            <span>Claim by PIN</span>
          </button>
        </div>
      </div>

      {/* Bottom Radial Drafting Wash & Trusted By Badges (Pinned to dynamic bottom of screen) */}
      <div className="relative z-10 w-full max-w-300 mx-auto px-3 sm:px-6 mt-auto flex flex-col items-center shrink-0">
        <HeroLightBeamStipple className="h-8 xs:h-10 sm:h-16 md:h-20 lg:h-25 mb-1 sm:mb-3" />

        <p className="text-[10px] sm:text-xs text-steel tracking-wide mb-2 sm:mb-4 text-center px-2">
          Trusted across security teams, research labs, and air-gapped facilities
        </p>

        {/* Logo / Node Band */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-10 md:gap-14 opacity-75 hover:opacity-100 transition-opacity font-mono text-[10px] sm:text-xs text-steel">
          <div className="flex items-center gap-1.5 sm:gap-2 text-paper font-medium hover:text-periwinkle transition-colors cursor-default">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-periwinkle" />
            <span>DEFENSE LABS</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-paper font-medium hover:text-periwinkle transition-colors cursor-default">
            <span className="text-periwinkle">❖</span>
            <span>SYNTHETIC CORE</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-paper font-medium hover:text-periwinkle transition-colors cursor-default">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border border-periwinkle flex items-center justify-center text-[8px] sm:text-[9px] text-periwinkle">⬡</div>
            <span>AIR GAP APPLIANCE</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-paper font-medium hover:text-periwinkle transition-colors cursor-default">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
            <span>CAMPUS SUBNET</span>
          </div>
        </div>
      </div>
    </section>
  )
}
