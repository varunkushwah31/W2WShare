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

    let animFrameId: number | null = null
    let isHovered = false

    // Initialize positions to hero center
    const rect = container.getBoundingClientRect()
    let currentX = rect.width / 2
    let currentY = rect.height * 0.38
    let targetX = currentX
    let targetY = currentY

    // Position immediately at center on mount with zero offset flicker
    glow.style.transform = `translate3d(${currentX - 360}px, ${currentY - 360}px, 0)`

    const animate = () => {
      // Fluid physics damping: 0.14 gives responsive, buttery smooth cursor following at native 60-144fps
      const dx = targetX - currentX
      const dy = targetY - currentY

      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        currentX += dx * 0.14
        currentY += dy * 0.14
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${currentX - 360}px, ${currentY - 360}px, 0)`
        }

        if (coordsRef.current && isHovered) {
          coordsRef.current.textContent = `POS_X: ${Math.max(0, currentX).toFixed(1)}mm · POS_Y: ${Math.max(0, currentY).toFixed(1)}mm · SCALE: 1.00`
        }
      }

      animFrameId = requestAnimationFrame(animate)
    }

    animFrameId = requestAnimationFrame(animate)

    const handlePointerMove = (clientX: number, clientY: number) => {
      const bRect = container.getBoundingClientRect()
      const x = clientX - bRect.left
      const y = clientY - bRect.top

      // Check if cursor is within or reasonably close to hero section bounds
      if (x >= -50 && x <= bRect.width + 50 && y >= -50 && y <= bRect.height + 50) {
        isHovered = true
        targetX = Math.max(0, Math.min(bRect.width, x))
        targetY = Math.max(0, Math.min(bRect.height, y))
      } else {
        // Return gracefully to center rest position when cursor leaves hero
        isHovered = false
        targetX = bRect.width / 2
        targetY = bRect.height * 0.38
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleMouseLeave = () => {
      const bRect = container.getBoundingClientRect()
      isHovered = false
      targetX = bRect.width / 2
      targetY = bRect.height * 0.38
    }

    const handleResize = () => {
      if (!isHovered) {
        const bRect = container.getBoundingClientRect()
        targetX = bRect.width / 2
        targetY = bRect.height * 0.38
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', handleResize)
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
        className="hero-cursor-glow pointer-events-none absolute top-0 left-0 rounded-full will-change-transform z-0"
        style={{
          width: '720px',
          height: '720px',
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
