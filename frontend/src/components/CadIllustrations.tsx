import React from 'react'

interface CadIllustrationProps {
  className?: string
}

/**
 * Feature Split 1: Isometric Gear inside CAD Chassis with Sparkle Stars & Particle Matrix
 */
export const GearChassisCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-square max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid matrix background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
        CAD: ISO-8942 · 160x160mm
      </div>

      {/* SVG CAD Drafting Wireframe */}
      <svg
        viewBox="0 0 360 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 select-none overflow-visible"
      >
        <defs>
          <radialGradient id="gearGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7089ba" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7089ba" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle animated radial wash */}
        <circle cx="180" cy="180" r="120" fill="url(#gearGlow)" className="animate-pulse-glow" />

        {/* 4-Point CAD Sparkle Star Top-Left */}
        <g transform="translate(70, 110)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -50 L 15 -15 L 50 0 L 15 15 L 0 50 L -15 15 L -50 0 L -15 -15 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Top-Right */}
        <g transform="translate(280, 90)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -40 L 12 -12 L 40 0 L 12 12 L 0 40 L -12 12 L -40 0 L -12 -12 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Left */}
        <g transform="translate(60, 280)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -30 L 10 -10 L 30 0 L 10 10 L 0 30 L -10 10 L -30 0 L -10 -10 Z" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.05)" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Right */}
        <g transform="translate(300, 275)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -35 L 12 -10 L 40 0 L 12 10 L 0 35 L -12 10 L -40 0 L -12 -10 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
          </g>
        </g>

        {/* Isometric Chamfered CAD Chassis Box */}
        <path
          d="M 120 70 L 270 120 L 270 270 L 120 220 Z"
          stroke="#4d4d4d"
          strokeWidth="1"
          strokeDasharray="4 3"
          fill="none"
        />
        {/* Main Front Chamfered Chassis */}
        <rect
          x="100"
          y="100"
          width="160"
          height="160"
          rx="28"
          stroke="#7089ba"
          strokeWidth="1.6"
          strokeDasharray="4 2"
          fill="rgba(28, 28, 28, 0.85)"
        />
        {/* Outer Bezel Rim */}
        <rect
          x="108"
          y="108"
          width="144"
          height="144"
          rx="22"
          stroke="#808080"
          strokeWidth="1"
          strokeDasharray="2 3"
          fill="none"
        />

        {/* Isometric Rotating Precision CAD Gear */}
        <g transform="translate(180, 180)">
          {/* Animated gear teeth & spokes group */}
          <g className="animate-gear-spin">
            {/* Gear Central Axis & Hub Circles */}
            <circle cx="0" cy="0" r="22" stroke="#7089ba" strokeWidth="1.6" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.1)" />

            {/* 8 Radial Gear Teeth Outline */}
            <path
              d="
                M -12 -54 L 12 -54 L 14 -40 L 26 -36 L 40 -48 L 54 -34 L 42 -20 L 46 -8 
                L 58 -4 L 58 12 L 44 18 L 38 30 L 48 44 L 34 56 L 20 46 L 8 48 
                L 4 60 L -12 60 L -18 46 L -30 42 L -44 52 L -56 38 L -46 24 L -48 10 
                L -60 6 L -60 -10 L -46 -16 L -40 -28 L -50 -42 L -36 -54 L -22 -44 L -10 -46 Z
              "
              stroke="#7089ba"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="4 2"
              fill="rgba(112, 137, 186, 0.08)"
            />

            {/* Gear Hub Spoke Marks */}
            <line x1="0" y1="-22" x2="0" y2="-40" stroke="#808080" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="0" y1="22" x2="0" y2="40" stroke="#808080" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="-22" y1="0" x2="-40" y2="0" stroke="#808080" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="22" y1="0" x2="40" y2="0" stroke="#808080" strokeWidth="1" strokeDasharray="2 2" />

            {/* Stippled White Data Points on Gear */}
            <circle cx="-28" cy="-28" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="-28" r="1.5" fill="#ffffff" />
            <circle cx="-28" cy="28" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="28" r="1.5" fill="#ffffff" />
          </g>

          {/* Stationary Hub Core */}
          <circle cx="0" cy="0" r="10" stroke="#ffffff" strokeWidth="1.2" fill="#1c1c1c" />
          <circle cx="0" cy="0" r="3.5" fill="#7089ba" />
        </g>

        {/* Technical drafting dimension tick marks */}
        <line x1="90" y1="100" x2="90" y2="260" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="86" y1="100" x2="94" y2="100" stroke="#4d4d4d" strokeWidth="1" />
        <line x1="86" y1="260" x2="94" y2="260" stroke="#4d4d4d" strokeWidth="1" />
        <text x="74" y="185" fill="#808080" fontSize="8" fontFamily="Geist Mono" transform="rotate(-90 74 185)">160.00mm</text>
      </svg>
    </div>
  )
}

/**
 * Feature Split 2: Retro Isometric CRT Computer Monitor on Pedestal
 */
export const CrtMonitorCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-square max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      <div className="absolute top-3 left-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
        CIPHER_STREAM: ACTIVE · AES-256-GCM
      </div>

      <svg
        viewBox="0 0 360 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 select-none overflow-visible"
      >
        <g stroke="#7089ba" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Base Pedestal (Isometric Plinth) */}
          <path
            d="M 80 270 L 160 315 L 290 255 L 210 210 Z"
            stroke="#7089ba"
            strokeDasharray="4 2"
            fill="rgba(112, 137, 186, 0.05)"
          />
          <path d="M 80 270 L 80 290 L 160 335 L 160 315 Z" stroke="#7089ba" strokeDasharray="3 2" fill="#141414" />
          <path d="M 160 335 L 290 275 L 290 255 L 160 315 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#141414" />

          {/* CRT Monitor Outer Box Housing */}
          <path
            d="M 110 95 L 195 55 L 285 100 L 200 140 Z"
            stroke="#7089ba"
            strokeDasharray="4 2"
            fill="rgba(112, 137, 186, 0.06)"
          />
          <path
            d="M 110 95 L 200 140 L 200 235 L 110 190 Z"
            stroke="#7089ba"
            strokeDasharray="4 2"
            fill="rgba(112, 137, 186, 0.04)"
          />
          <path
            d="M 200 140 L 285 100 L 285 195 L 200 235 Z"
            stroke="#7089ba"
            strokeDasharray="4 2"
            fill="rgba(28, 28, 28, 0.9)"
          />

          {/* CRT Screen Bezel Curved Face (Front Screen) */}
          <path
            d="M 208 148 L 277 113 L 277 185 L 208 222 Z"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="3 2"
            fill="#121212"
          />

          {/* Animated Screen Display Scanline / Code Lines */}
          <g className="animate-scanline">
            <line x1="215" y1="150" x2="270" y2="122" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="215" y1="160" x2="270" y2="132" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="215" y1="170" x2="270" y2="142" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="215" y1="180" x2="255" y2="160" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="215" y1="190" x2="265" y2="165" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            {/* Blinking cursor */}
            <rect x="268" y="163" width="3" height="4" fill="#ffffff" className="animate-pulse" />
          </g>

          {/* Isometric Keyboard Layout on Desk */}
          <path
            d="M 90 225 L 145 255 L 210 225 L 155 195 Z"
            stroke="#808080"
            strokeWidth="1"
            strokeDasharray="3 2"
            fill="#161616"
          />
          <line x1="105" y1="223" x2="165" y2="195" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="115" y1="230" x2="175" y2="202" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="125" y1="238" x2="185" y2="210" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />

          {/* Vent Grills on Rear Case */}
          <line x1="125" y1="115" x2="180" y2="142" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="125" y1="125" x2="180" y2="152" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="125" y1="135" x2="180" y2="162" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="125" y1="145" x2="180" y2="172" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 2" />

          {/* Floating Data Points with gentle pulse */}
          <circle cx="140" cy="80" r="1.5" fill="#ffffff" className="animate-ping" />
          <circle cx="280" cy="70" r="1.5" fill="#ffffff" />
          <circle cx="310" cy="160" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  )
}

/**
 * Feature Split 3: Isometric CAD Rocket Launching from Perspective Grid Base
 */
export const RocketLaunchCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-square max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
        THRUST: P2P_WEBRTC_STREAM
      </div>

      <svg
        viewBox="0 0 360 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 select-none overflow-visible"
      >
        {/* Isometric Perspective Grid Base Plane */}
        <g stroke="#4d4d4d" strokeWidth="0.8" strokeDasharray="3 3">
          <line x1="60" y1="280" x2="200" y2="350" />
          <line x1="90" y1="260" x2="230" y2="330" />
          <line x1="120" y1="240" x2="260" y2="310" />
          <line x1="150" y1="220" x2="290" y2="290" />
          <line x1="180" y1="200" x2="320" y2="270" />

          <line x1="60" y1="280" x2="180" y2="200" />
          <line x1="95" y1="298" x2="215" y2="218" />
          <line x1="130" y1="315" x2="250" y2="235" />
          <line x1="165" y1="332" x2="285" y2="252" />
          <line x1="200" y1="350" x2="320" y2="270" />
        </g>

        {/* Launch Plinth Surface Outline */}
        <path
          d="M 60 280 L 200 350 L 320 270 L 180 200 Z"
          stroke="#7089ba"
          strokeWidth="1.2"
          strokeDasharray="4 2"
          fill="none"
        />

        {/* Animated Continuous Exhaust Trail Streamers (Directly Connected to Nozzle) */}
        <g stroke="#7089ba" strokeWidth="1.4" strokeDasharray="4 3" fill="none" className="animate-dash-flow">
          <path d="M 237 184 C 235 220 225 260 215 310" />
          <path d="M 245 188 C 245 225 248 260 245 295" />
          <path d="M 253 184 C 255 220 270 250 285 275" />
        </g>

        {/* Exhaust landing nodes */}
        <g transform="translate(215, 310)">
          <circle
            cx="0"
            cy="0"
            r="2.5"
            fill="#ffffff"
            className="animate-ping"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>
        <circle cx="245" cy="295" r="2" fill="#ffffff" />
        <circle cx="285" cy="275" r="2.5" fill="#ffffff" />

        {/* Isometric Animated CAD Rocket Body with Integrated Luminous Jet Thrust */}
        <g transform="translate(245, 140)">
          <g className="animate-float">
            {/* Luminous Thruster Flame Plume (Moves with Rocket) */}
            <path
              d="M -9 44 Q 0 80 9 44 Z"
              fill="rgba(112, 137, 186, 0.45)"
              stroke="#7089ba"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              className="animate-pulse"
            />
            <path
              d="M -4 44 Q 0 65 4 44 Z"
              fill="#ffffff"
              opacity="0.9"
            />
            {/* Luminous Thrust Dot (Anchored directly to flame plume start point) */}
            <g transform="translate(0, 55)">
              <circle
                cx="0"
                cy="0"
                r="1.5"
                fill="#ffffff"
                className="animate-ping"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
              <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            </g>

            {/* Main Cone Capsule */}
            <path
              d="M 0 -75 C -18 -40 -18 10 -18 35 L 18 35 C 18 10 18 -40 0 -75 Z"
              stroke="#7089ba"
              strokeWidth="1.6"
              strokeDasharray="4 2"
              fill="rgba(28, 28, 28, 0.9)"
            />

            {/* Center Porthole Window */}
            <circle cx="0" cy="-15" r="10" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.2)" />
            <circle cx="0" cy="-15" r="4" fill="#7089ba" />

            {/* Wings */}
            <path
              d="M -18 15 L -35 45 L -18 42 Z"
              stroke="#7089ba"
              strokeWidth="1.4"
              strokeDasharray="3 2"
              fill="rgba(112, 137, 186, 0.1)"
            />
            <path
              d="M 18 15 L 35 45 L 18 42 Z"
              stroke="#7089ba"
              strokeWidth="1.4"
              strokeDasharray="3 2"
              fill="rgba(112, 137, 186, 0.1)"
            />

            <line x1="0" y1="5" x2="0" y2="45" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* Thruster Nozzle Ring */}
            <ellipse cx="0" cy="38" rx="14" ry="4" stroke="#7089ba" strokeWidth="1.4" fill="#141414" />
            <ellipse cx="0" cy="44" rx="10" ry="3" stroke="#808080" strokeWidth="1" strokeDasharray="2 2" fill="none" />
          </g>
        </g>

        {/* CAD Star Accents */}
        <g stroke="#7089ba" strokeWidth="1" className="animate-pulse">
          <circle cx="90" cy="80" r="2" fill="#ffffff" />
          <circle cx="310" cy="50" r="2" fill="#ffffff" />
        </g>
      </svg>
    </div>
  )
}

/**
 * 4-Grid Card 1: Fast Stream Sink (Workstation Console + 2MB Binary Chunk Pipeline)
 */
export const FastStreamSinkCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-4/3 max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        CAD: STREAM_SINK · 2MB_CHUNKS
      </div>

      <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <defs>
          <radialGradient id="sinkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7089ba" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7089ba" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radial Glow */}
        <circle cx="160" cy="130" r="90" fill="url(#sinkGlow)" className="animate-pulse-glow" />

        {/* 4-Point CAD Sparkle Star Top-Right */}
        <g transform="translate(265, 45)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -22 L 6 -6 L 22 0 L 6 6 L 0 22 L -6 6 L -22 0 L -6 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Left */}
        <g transform="translate(45, 195)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* Isometric Perspective Grid Base Floor */}
        <g stroke="#4d4d4d" strokeWidth="0.8" strokeDasharray="3 3">
          <line x1="30" y1="180" x2="150" y2="230" />
          <line x1="55" y1="165" x2="175" y2="215" />
          <line x1="80" y1="150" x2="200" y2="200" />
          <line x1="105" y1="135" x2="225" y2="185" />
          <line x1="130" y1="120" x2="250" y2="170" />

          <line x1="30" y1="180" x2="130" y2="120" />
          <line x1="60" y1="192" x2="160" y2="132" />
          <line x1="90" y1="205" x2="190" y2="145" />
          <line x1="120" y1="217" x2="220" y2="157" />
          <line x1="150" y1="230" x2="250" y2="170" />
        </g>

        {/* Base Plinth Surface Outline */}
        <path d="M 30 180 L 150 230 L 250 170 L 130 120 Z" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="4 2" fill="none" />

        {/* Isometric Workstation / Terminal Console Box (Left Side) */}
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Console Top Face */}
          <path d="M 65 130 L 125 100 L 165 120 L 105 150 Z" strokeDasharray="4 2" fill="rgba(112, 137, 186, 0.06)" />
          {/* Console Left Face */}
          <path d="M 65 130 L 65 155 L 105 175 L 105 150 Z" strokeDasharray="3 2" fill="#141414" />
          {/* Console Right Face (Display Bezel) */}
          <path d="M 105 150 L 165 120 L 165 145 L 105 175 Z" strokeDasharray="4 2" fill="rgba(28, 28, 28, 0.9)" />

          {/* Front Screen Bezel */}
          <path d="M 112 148 L 158 125 L 158 142 L 112 165 Z" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" fill="#121212" />

          {/* Animated Screen Scanlines / Buffer Flow Lines */}
          <g className="animate-scanline">
            <line x1="116" y1="150" x2="154" y2="131" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="116" y1="156" x2="154" y2="137" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="116" y1="162" x2="145" y2="147" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <rect x="147" y="145" width="2.5" height="3" fill="#ffffff" className="animate-pulse" />
          </g>

          {/* Console Keyboard / Tray Deck */}
          <path d="M 75 160 L 115 180 L 140 168 L 100 148 Z" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="2 2" fill="#161616" />
          <line x1="85" y1="163" x2="120" y2="175" stroke="#7089ba" strokeWidth="0.8" strokeDasharray="2 2" />
        </g>

        {/* Animated Data Pipeline Stream Rails Flowing into Sink Console */}
        <g stroke="#7089ba" strokeWidth="1.4" strokeDasharray="4 3" fill="none" className="animate-dash-flow">
          <path d="M 245 80 C 220 100 185 110 158 125" />
          <path d="M 255 95 C 230 115 195 125 165 135" />
          <path d="M 235 110 C 215 125 185 140 155 150" />
        </g>

        {/* Stream Landing Nodes on Console */}
        <circle cx="158" cy="125" r="2" fill="#ffffff" />
        <circle cx="165" cy="135" r="2" fill="#ffffff" />

        {/* Floating 2MB Isometric Chunk Block */}
        <g transform="translate(235, 75)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Top Face */}
            <path d="M 0 -20 L 22 -9 L 0 2 L -22 -9 Z" stroke="#ffffff" strokeWidth="1.3" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.2)" />
            {/* Left Face */}
            <path d="M -22 -9 L 0 2 L 0 24 L -22 13 Z" strokeDasharray="3 2" fill="#161616" />
            {/* Right Face */}
            <path d="M 0 2 L 22 -9 L 22 13 L 0 24 Z" strokeDasharray="3 2" fill="#121212" />

            {/* Chunk Center Luminous Core */}
            <circle cx="0" cy="2" r="3" fill="#1c1c1c" stroke="#7089ba" strokeWidth="1" />
            <circle cx="0" cy="2" r="1.5" fill="#ffffff" />
            <circle cx="0" cy="2" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          </g>
        </g>

        {/* Technical Drafting Dimension Tick Mark */}
        <g stroke="#4d4d4d" strokeWidth="1">
          <line x1="285" y1="55" x2="285" y2="105" strokeDasharray="2 3" />
          <line x1="281" y1="55" x2="289" y2="55" />
          <line x1="281" y1="105" x2="289" y2="105" />
        </g>
        <text x="295" y="83" fill="#808080" fontSize="7.5" fontFamily="Geist Mono, JetBrains Mono Variable, monospace">2.00MB</text>

        {/* Floating ambient star dots */}
        <circle cx="95" cy="65" r="1.5" fill="#ffffff" />
        <circle cx="210" cy="185" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  )
}
export const LaptopWandCadIllustration = FastStreamSinkCadIllustration

/**
 * 4-Grid Card 2: Ephemeral Auto-Destruct (Secure Plinth + Ephemeral Memory Vault Core)
 */
export const EphemeralDestructCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-4/3 max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        CAD: AUTO_DESTRUCT · ZERO_ARTIFACTS
      </div>

      <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <defs>
          <radialGradient id="destructGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7089ba" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7089ba" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radial Glow */}
        <circle cx="160" cy="120" r="90" fill="url(#destructGlow)" className="animate-pulse-glow" />

        {/* 4-Point CAD Sparkle Star Top-Left */}
        <g transform="translate(55, 55)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -22 L 6 -6 L 22 0 L 6 6 L 0 22 L -6 6 L -22 0 L -6 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Right */}
        <g transform="translate(265, 185)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* Isometric Plinth / Pedestal Base (matching CrtMonitor plinth style) */}
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Ground Contour Rings */}
          <ellipse cx="160" cy="180" rx="95" ry="36" stroke="#4d4d4d" strokeWidth="0.8" strokeDasharray="3 3" />
          <ellipse cx="160" cy="180" rx="65" ry="24" stroke="#7089ba" strokeWidth="1.1" strokeDasharray="4 2" fill="rgba(112, 137, 186, 0.04)" className="animate-dash-flow" />

          {/* Pedestal Step 1 (Lower Slab) */}
          <path d="M 100 160 L 160 185 L 220 160 L 160 135 Z" strokeDasharray="4 2" fill="rgba(112, 137, 186, 0.06)" />
          <path d="M 100 160 L 100 172 L 160 197 L 160 185 Z" strokeDasharray="3 2" fill="#141414" />
          <path d="M 160 185 L 160 197 L 220 172 L 220 160 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#141414" />

          {/* Pedestal Step 2 (Upper Core) */}
          <path d="M 120 145 L 160 162 L 200 145 L 160 128 Z" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.1)" />
          <path d="M 120 145 L 120 153 L 160 170 L 160 162 Z" strokeDasharray="2 2" fill="#121212" />
          <path d="M 160 162 L 160 170 L 200 153 L 200 145 Z" stroke="#4d4d4d" strokeDasharray="2 2" fill="#161616" />
        </g>

        {/* Deallocation Vaporizing Streamers into Pedestal */}
        <g stroke="#7089ba" strokeWidth="1.3" strokeDasharray="3 3" fill="none" className="animate-dash-flow">
          <line x1="140" y1="125" x2="140" y2="85" />
          <line x1="160" y1="118" x2="160" y2="70" />
          <line x1="180" y1="125" x2="180" y2="85" />
        </g>

        {/* Floating Ephemeral Vault Core (Levitating Padlock Chamber) */}
        <g transform="translate(160, 68)">
          <g className="animate-float">
            {/* Outer Rotating Security Reticle Ring */}
            <circle cx="0" cy="0" r="26" stroke="#7089ba" strokeWidth="1.5" strokeDasharray="4 2" fill="rgba(28, 28, 28, 0.9)" />
            <circle cx="0" cy="0" r="20" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.15)" />

            {/* Padlock Shackle */}
            <path d="M -7 0 L -7 -9 A 7 7 0 0 1 7 -9 L 7 0" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Padlock Body */}
            <rect x="-10" y="0" width="20" height="15" rx="3" fill="#161616" stroke="#7089ba" strokeWidth="1.4" />
            {/* Padlock Keyhole / Luminous Core */}
            <circle cx="0" cy="6" r="2" fill="#ffffff" />
            <line x1="0" y1="7" x2="0" y2="11" stroke="#ffffff" strokeWidth="1.2" />

            {/* Luminous Ping Anchor Node */}
            <circle cx="0" cy="-9" r="2" fill="#ffffff" />
            <circle cx="0" cy="-9" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          </g>
        </g>

        {/* Technical Drafting Dimension Tick Mark */}
        <g stroke="#4d4d4d" strokeWidth="1">
          <line x1="50" y1="110" x2="50" y2="165" strokeDasharray="2 3" />
          <line x1="46" y1="110" x2="54" y2="110" />
          <line x1="46" y1="165" x2="54" y2="165" />
        </g>
        <text x="36" y="142" fill="#808080" fontSize="7.5" fontFamily="Geist Mono, JetBrains Mono Variable, monospace" transform="rotate(-90 36 142)">0x00_PURGE</text>

        {/* Floating ambient star dots */}
        <circle cx="250" cy="80" r="1.5" fill="#ffffff" />
        <circle cx="85" cy="120" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  )
}
export const PedestalAwardCadIllustration = EphemeralDestructCadIllustration

/**
 * 4-Grid Card 3: Subnet Peer Radar (UDP 8888 Concentric Sweep + Discovered Peers)
 */
export const SubnetRadarCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-4/3 max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        CAD: PEER_RADAR · UDP_8888
      </div>

      <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7089ba" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7089ba" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radial Glow */}
        <circle cx="160" cy="130" r="90" fill="url(#radarGlow)" className="animate-pulse-glow" />

        {/* 4-Point CAD Sparkle Star Top-Right */}
        <g transform="translate(265, 55)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -22 L 6 -6 L 22 0 L 6 6 L 0 22 L -6 6 L -22 0 L -6 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Left */}
        <g transform="translate(50, 195)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* Perspective Isometric Grid Floor (like Rocket card) */}
        <g stroke="#4d4d4d" strokeWidth="0.8" strokeDasharray="3 3">
          <line x1="40" y1="140" x2="280" y2="140" />
          <line x1="160" y1="85" x2="160" y2="195" />
        </g>

        {/* Concentric Isometric Subnet Radar Rings */}
        <ellipse cx="160" cy="140" rx="100" ry="38" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="4 3" />
        <ellipse cx="160" cy="140" rx="72" ry="27" stroke="#7089ba" strokeWidth="1.4" strokeDasharray="4 2" fill="rgba(112, 137, 186, 0.05)" className="animate-dash-flow" />
        <ellipse cx="160" cy="140" rx="42" ry="16" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="3 2" />
        <ellipse cx="160" cy="140" rx="16" ry="6" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />

        {/* Sweeping Radar Sector Ray */}
        <line x1="160" y1="140" x2="245" y2="120" stroke="#7089ba" strokeWidth="1.4" strokeDasharray="3 2" className="animate-dash-flow" />

        {/* Central Beacon Mast (Antenna) */}
        <g>
          <line x1="160" y1="140" x2="160" y2="70" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="4 2" />
          {/* Strut Trusses */}
          <line x1="160" y1="90" x2="142" y2="140" stroke="#7089ba" strokeWidth="0.9" strokeDasharray="2 2" />
          <line x1="160" y1="90" x2="178" y2="140" stroke="#7089ba" strokeWidth="0.9" strokeDasharray="2 2" />

          {/* Floating Antenna Transmitter Head */}
          <g transform="translate(160, 66)">
            <g className="animate-float">
              {/* Broadcast Arc Waves */}
              <path d="M -16 -4 A 18 18 0 0 1 16 -4" stroke="#7089ba" strokeWidth="1.3" strokeDasharray="2 2" fill="none" />
              <path d="M -24 -8 A 26 26 0 0 1 24 -8" stroke="#7089ba" strokeWidth="1.1" strokeDasharray="3 2" fill="none" />

              {/* Antenna Node Core */}
              <circle cx="0" cy="0" r="3.5" stroke="#7089ba" strokeWidth="1.2" fill="#1c1c1c" />
              <circle cx="0" cy="0" r="2" fill="#ffffff" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            </g>
          </g>
        </g>

        {/* Discovered Peer Node 1: Wi-Fi Workstation (Left) */}
        <g transform="translate(98, 130)">
          <circle cx="0" cy="0" r="3.5" fill="#141414" stroke="#7089ba" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
          <circle cx="0" cy="0" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          <line x1="-6" y1="0" x2="-4" y2="0" stroke="#7089ba" strokeWidth="1" />
          <line x1="4" y1="0" x2="6" y2="0" stroke="#7089ba" strokeWidth="1" />
        </g>

        {/* Discovered Peer Node 2: Ethernet Host (Right) */}
        <g transform="translate(225, 148)">
          <circle cx="0" cy="0" r="3.5" fill="#141414" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
          <circle cx="0" cy="0" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        </g>

        {/* Discovered Peer Node 3: Mobile Hotspot (Top Right) */}
        <g transform="translate(200, 115)">
          <circle cx="0" cy="0" r="2.5" fill="#141414" stroke="#7089ba" strokeWidth="1" />
          <circle cx="0" cy="0" r="1.5" fill="#7089ba" />
        </g>

        {/* Technical Drafting Dimension Tick Mark */}
        <g stroke="#4d4d4d" strokeWidth="1">
          <line x1="285" y1="120" x2="285" y2="160" strokeDasharray="2 3" />
          <line x1="281" y1="120" x2="289" y2="120" />
          <line x1="281" y1="160" x2="289" y2="160" />
        </g>
        <text x="295" y="143" fill="#808080" fontSize="7.5" fontFamily="Geist Mono, JetBrains Mono Variable, monospace">UDP:8888</text>

        {/* Floating ambient star dots */}
        <circle cx="75" cy="80" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  )
}
export const LightningVortexCadIllustration = SubnetRadarCadIllustration

/**
 * 4-Grid Card 4: Cryptographic Audit Ledger (SHA-256 Hash Chains & Signed Receipts)
 */
export const CryptographicLedgerCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-4/3 max-w-105 rounded-2xl bg-carbon p-6 flex items-center justify-center overflow-hidden border border-carbon group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-void/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        CAD: AUDIT_CHAIN · SHA-256
      </div>

      <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <defs>
          <radialGradient id="ledgerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7089ba" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7089ba" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Radial Glow */}
        <circle cx="160" cy="130" r="90" fill="url(#ledgerGlow)" className="animate-pulse-glow" />

        {/* 4-Point CAD Sparkle Star Top-Left */}
        <g transform="translate(55, 55)">
          <g className="animate-float" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -22 L 6 -6 L 22 0 L 6 6 L 0 22 L -6 6 L -22 0 L -6 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* 4-Point CAD Sparkle Star Bottom-Right */}
        <g transform="translate(265, 185)">
          <g className="animate-float-alt" stroke="#7089ba" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.05)" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
          </g>
        </g>

        {/* Perspective Ground Grid Base */}
        <g stroke="#4d4d4d" strokeWidth="0.8" strokeDasharray="3 3">
          <line x1="30" y1="165" x2="160" y2="220" />
          <line x1="160" y1="220" x2="290" y2="165" />
          <line x1="60" y1="140" x2="160" y2="182" />
          <line x1="160" y1="182" x2="260" y2="140" />
        </g>

        {/* Merkle Hash Chaining Conduits */}
        <g stroke="#7089ba" strokeWidth="1.4" strokeDasharray="4 2" className="animate-dash-flow">
          <path d="M 110 148 L 138 138" />
          <path d="M 182 138 L 210 148" />
        </g>

        {/* Block 0: Genesis Block (Left) */}
        <g transform="translate(85, 148)" stroke="#7089ba" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 0 -16 L 24 -6 L 0 4 L -24 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
          <path d="M -24 -6 L 0 4 L 0 24 L -24 14 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#141414" />
          <path d="M 0 4 L 24 -6 L 24 14 L 0 24 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#121212" />
        </g>

        {/* Block 1: Main Merkle Audit Block (Center, Larger) */}
        <g transform="translate(160, 132)" stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Top Face */}
          <path d="M 0 -24 L 32 -10 L 0 4 L -32 -10 Z" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.12)" />
          {/* Left Face */}
          <path d="M -32 -10 L 0 4 L 0 34 L -32 20 Z" strokeDasharray="4 2" fill="#141414" />
          {/* Right Face */}
          <path d="M 0 4 L 32 -10 L 32 20 L 0 34 Z" strokeDasharray="4 2" fill="rgba(28, 28, 28, 0.9)" />

          {/* Strata Scanlines on Face */}
          <g className="animate-scanline">
            <line x1="-26" y1="-1" x2="-6" y2="8" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="-26" y1="7" x2="-6" y2="16" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="-26" y1="15" x2="-6" y2="24" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 3" />
          </g>

          {/* Center Hub Node */}
          <circle cx="0" cy="-10" r="3" fill="#1c1c1c" stroke="#7089ba" strokeWidth="1" />
          <circle cx="0" cy="-10" r="1.5" fill="#ffffff" />
        </g>

        {/* Block 2: Head Block (Right) */}
        <g transform="translate(235, 148)" stroke="#7089ba" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 0 -16 L 24 -6 L 0 4 L -24 -6 Z" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.05)" />
          <path d="M -24 -6 L 0 4 L 0 24 L -24 14 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#141414" />
          <path d="M 0 4 L 24 -6 L 24 14 L 0 24 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#121212" />
        </g>

        {/* Floating Cryptographic Signed Receipt Badge */}
        <g transform="translate(160, 68)">
          <g className="animate-float">
            {/* Chamfered Security Badge */}
            <rect x="-35" y="-18" width="70" height="36" rx="8" fill="rgba(28, 28, 28, 0.95)" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="4 2" />
            <rect x="-30" y="-14" width="60" height="28" rx="5" fill="none" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />

            {/* Verification Checkmark Symbol */}
            <path d="M -8 1 L -2 7 L 8 -5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Pulsing Security Beacon */}
            <circle cx="0" cy="-18" r="2" fill="#ffffff" />
            <circle cx="0" cy="-18" r="3" fill="#ffffff" className="animate-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          </g>
        </g>

        {/* Technical Dimension Line */}
        <g stroke="#4d4d4d" strokeWidth="1">
          <line x1="285" y1="125" x2="285" y2="175" strokeDasharray="2 3" />
          <line x1="281" y1="125" x2="289" y2="125" />
          <line x1="281" y1="175" x2="289" y2="175" />
        </g>
        <text x="295" y="153" fill="#808080" fontSize="7.5" fontFamily="Geist Mono, JetBrains Mono Variable, monospace">SHA-256</text>

        {/* Floating ambient star dots */}
        <circle cx="215" cy="55" r="1.5" fill="#ffffff" />
        <circle cx="105" cy="75" r="1.5" fill="#ffffff" />
      </svg>
    </div>
  )
}
export const CoinStacksCadIllustration = CryptographicLedgerCadIllustration

/**
 * Hero Bottom Radial Fan Stipple Pattern
 */
export const HeroLightBeamStipple: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`w-full max-w-120 h-25 flex items-center justify-center relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-70 overflow-visible">
        <g stroke="#7089ba" strokeWidth="0.8" strokeDasharray="2 4" className="animate-dash-flow">
          <line x1="200" y1="100" x2="60" y2="10" />
          <line x1="200" y1="100" x2="90" y2="5" />
          <line x1="200" y1="100" x2="125" y2="0" />
          <line x1="200" y1="100" x2="160" y2="0" />
          <line x1="200" y1="100" x2="200" y2="0" />
          <line x1="200" y1="100" x2="240" y2="0" />
          <line x1="200" y1="100" x2="275" y2="0" />
          <line x1="200" y1="100" x2="310" y2="5" />
          <line x1="200" y1="100" x2="340" y2="10" />
        </g>
        <path d="M 120 100 A 80 80 0 0 1 280 100" stroke="#7089ba" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="200" cy="100" r="6" fill="#7089ba" fillOpacity="0.4" className="animate-ping" />
      </svg>
    </div>
  )
}
