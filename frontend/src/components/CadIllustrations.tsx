import React from 'react'

interface CadIllustrationProps {
  className?: string
}

/**
 * Feature Split 1: Isometric Gear inside CAD Chassis with Sparkle Stars & Particle Matrix
 */
export const GearChassisCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-square max-w-[420px] rounded-2xl bg-[#1c1c1c] p-6 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      {/* Stippled dot grid matrix background */}
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      {/* Hover technical blueprint dimension overlay */}
      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-[#000000]/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
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
    <div className={`relative w-full aspect-square max-w-[420px] rounded-2xl bg-[#1c1c1c] p-6 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      <div className="absolute top-3 left-3 font-mono text-[9px] text-[#7089ba] bg-[#000000]/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
        QUERY_STREAM: ACTIVE · AES-256
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

          {/* Animated Screen Display Scanlines / Code Lines */}
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
    <div className={`relative w-full aspect-square max-w-[420px] rounded-2xl bg-[#1c1c1c] p-6 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group cursor-crosshair transition-all duration-300 hover:border-[#2a2a2a] ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-30 pointer-events-none" />

      <div className="absolute top-3 right-3 font-mono text-[9px] text-[#7089ba] bg-[#000000]/80 px-2 py-0.5 rounded border border-[#7089ba]/20 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <circle cx="215" cy="310" r="2.5" fill="#ffffff" className="animate-ping" />
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
            <circle cx="0" cy="55" r="1.5" fill="#ffffff" className="animate-ping" />

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
 * 4-Grid Card 1: Fast + Accurate Answers (Laptop + Magic Star Wand)
 */
export const LaptopWandCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl bg-[#1c1c1c] p-4 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group hover:border-[#2a2a2a] transition-all ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Display bezel */}
          <path
            d="M 50 60 L 130 25 L 180 50 L 100 85 Z"
            strokeDasharray="4 2"
            fill="rgba(112, 137, 186, 0.05)"
          />
          <path
            d="M 60 62 L 125 33 L 168 54 L 103 83 Z"
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="3 2"
            fill="#121212"
          />
          <circle cx="68" cy="62" r="1.5" fill="#7089ba" />
          <circle cx="73" cy="60" r="1.5" fill="#7089ba" />
          <circle cx="78" cy="58" r="1.5" fill="#7089ba" />

          {/* Screen Content Lines */}
          <line x1="85" y1="65" x2="140" y2="42" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />
          <line x1="90" y1="73" x2="150" y2="48" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 3" />

          {/* Laptop Base */}
          <path
            d="M 50 85 L 100 85 L 165 115 L 115 145 Z"
            stroke="#7089ba"
            strokeDasharray="3 2"
            fill="rgba(28, 28, 28, 0.8)"
          />
          <path d="M 50 85 L 50 90 L 115 150 L 115 145 Z" stroke="#4d4d4d" fill="#141414" />
          <path d="M 115 150 L 165 120 L 165 115 L 115 145 Z" stroke="#4d4d4d" fill="#141414" />

          {/* Animated Magic Wand (Properly Nested Transform) */}
          <g transform="translate(195, 80)">
            <g className="animate-float">
              <path d="M -40 40 L 0 0" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M -40 40 L 0 0" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="2 2" />

              {/* Star tip */}
              <path
                d="M 0 0 L 10 -20 L 30 -30 L 10 -40 L 0 -60 L -10 -40 L -30 -30 L -10 -20 Z"
                stroke="#7089ba"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                fill="rgba(112, 137, 186, 0.18)"
              />
              <circle cx="0" cy="-30" r="3" fill="#ffffff" />

              <line x1="35" y1="-30" x2="50" y2="-30" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="-35" y1="-30" x2="-50" y2="-30" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="0" y1="-65" x2="0" y2="-80" stroke="#7089ba" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="45" cy="-55" r="1.5" fill="#ffffff" className="animate-ping" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

/**
 * 4-Grid Card 2: Less Reporting Work (Pedestal + #1 Ribbon Award)
 */
export const PedestalAwardCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl bg-[#1c1c1c] p-4 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group hover:border-[#2a2a2a] transition-all ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Isometric Stage */}
          <path
            d="M 70 120 L 140 85 L 220 120 L 150 155 Z"
            strokeDasharray="4 2"
            fill="rgba(112, 137, 186, 0.06)"
          />
          <path d="M 70 120 L 70 155 L 150 190 L 150 155 Z" strokeDasharray="3 2" fill="#141414" />
          <path d="M 150 155 L 150 190 L 220 155 L 220 120 Z" stroke="#4d4d4d" strokeDasharray="3 2" fill="#181818" />

          {/* Plinth Block */}
          <path
            d="M 100 85 L 140 65 L 180 85 L 140 105 Z"
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="3 2"
            fill="rgba(112, 137, 186, 0.1)"
          />
          <path d="M 100 85 L 100 105 L 140 125 L 140 105 Z" stroke="#7089ba" strokeDasharray="2 2" fill="#121212" />
          <path d="M 140 105 L 140 125 L 180 105 L 180 85 Z" stroke="#4d4d4d" strokeDasharray="2 2" fill="#161616" />

          {/* Animated #1 Medallion (Properly Nested Transform) */}
          <g transform="translate(140, 55)">
            <g className="animate-float">
              <circle cx="0" cy="0" r="22" stroke="#7089ba" strokeWidth="1.6" strokeDasharray="4 2" fill="#1c1c1c" />
              <circle cx="0" cy="0" r="16" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.15)" />
              <text x="0" y="5" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="Geist Mono" textAnchor="middle">#1</text>
              <path d="M -8 18 L -14 38 L -4 34 L 0 22 Z" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.1)" />
              <path d="M 8 18 L 14 38 L 4 34 L 0 22 Z" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="2 2" fill="rgba(112, 137, 186, 0.1)" />
            </g>
          </g>

          <circle cx="70" cy="40" r="1.5" fill="#ffffff" />
          <circle cx="215" cy="45" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  )
}

/**
 * 4-Grid Card 3: Unified Data (Lightning Bolt + Orbital Vortex Rings)
 */
export const LightningVortexCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl bg-[#1c1c1c] p-4 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group hover:border-[#2a2a2a] transition-all ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Orbital Rings */}
          <ellipse cx="140" cy="145" rx="55" ry="16" strokeDasharray="3 3" stroke="#4d4d4d" />
          <ellipse cx="140" cy="115" rx="70" ry="20" strokeDasharray="4 2" stroke="#7089ba" fill="rgba(112, 137, 186, 0.03)" className="animate-dash-flow" />
          <ellipse cx="140" cy="80" rx="60" ry="18" strokeDasharray="3 3" stroke="#7089ba" />

          {/* Animated Lightning Bolt (Properly Nested Transform) */}
          <g transform="translate(140, 100)">
            <g className="animate-float">
              <path
                d="M 8 -65 L -20 -10 L -4 -10 L -18 45 L 20 -8 L 4 -8 Z"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="4 2"
                fill="rgba(112, 137, 186, 0.22)"
              />
              <path
                d="M 12 -62 L -14 -8 L 0 -8 L -12 42 L 22 -6 L 8 -6 Z"
                stroke="#7089ba"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            </g>
          </g>

          {/* Orbital Orbit Nodes */}
          <circle cx="85" cy="112" r="3" fill="#ffffff" className="animate-pulse" />
          <circle cx="195" cy="120" r="2.5" fill="#7089ba" />
          <circle cx="95" cy="78" r="2" fill="#7089ba" />
          <circle cx="180" cy="52" r="2" fill="#ffffff" className="animate-ping" />
        </g>
      </svg>
    </div>
  )
}

/**
 * 4-Grid Card 4: Drive Revenue with Data (Coin Cylinder Stacks & Dollar Tokens)
 */
export const CoinStacksCadIllustration: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl bg-[#1c1c1c] p-4 flex items-center justify-center overflow-hidden border border-[#1c1c1c] group hover:border-[#2a2a2a] transition-all ${className}`}>
      <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

      <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 select-none overflow-visible">
        <g stroke="#7089ba" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Base */}
          <path d="M 40 155 L 140 185 L 240 145 L 140 115 Z" stroke="#4d4d4d" strokeWidth="1" strokeDasharray="3 3" />

          {/* Left Stack */}
          <g transform="translate(90, 135)">
            <ellipse cx="0" cy="20" rx="20" ry="8" strokeDasharray="3 2" fill="#141414" />
            <line x1="-20" y1="0" x2="-20" y2="20" stroke="#7089ba" strokeDasharray="2 2" />
            <line x1="20" y1="0" x2="20" y2="20" stroke="#7089ba" strokeDasharray="2 2" />
            <ellipse cx="0" cy="0" rx="20" ry="8" strokeDasharray="3 2" fill="rgba(112, 137, 186, 0.08)" />
            <text x="0" y="3" fill="#ffffff" fontSize="9" fontFamily="Geist Mono" textAnchor="middle">$</text>
          </g>

          {/* Main Stack */}
          <g transform="translate(155, 110)">
            <ellipse cx="0" cy="50" rx="30" ry="12" strokeDasharray="4 2" fill="#141414" />
            <line x1="-30" y1="-30" x2="-30" y2="50" stroke="#7089ba" strokeWidth="1.5" strokeDasharray="3 2" />
            <line x1="30" y1="-30" x2="30" y2="50" stroke="#7089ba" strokeWidth="1.5" strokeDasharray="3 2" />
            <ellipse cx="0" cy="35" rx="30" ry="12" strokeDasharray="2 3" stroke="#4d4d4d" />
            <ellipse cx="0" cy="20" rx="30" ry="12" strokeDasharray="2 3" stroke="#4d4d4d" />
            <ellipse cx="0" cy="5" rx="30" ry="12" strokeDasharray="2 3" stroke="#4d4d4d" />
            <ellipse cx="0" cy="-10" rx="30" ry="12" strokeDasharray="2 3" stroke="#4d4d4d" />
            <ellipse cx="0" cy="-30" rx="30" ry="12" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="4 2" fill="rgba(112, 137, 186, 0.18)" />
            <text x="0" y="-25" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="Geist Mono" textAnchor="middle">$</text>
          </g>

          {/* Animated Floating Coins (Properly Nested Transform) */}
          <g transform="translate(195, 60)">
            <g className="animate-float">
              <ellipse cx="0" cy="0" rx="16" ry="10" stroke="#7089ba" strokeWidth="1.4" strokeDasharray="3 2" fill="#1c1c1c" />
              <text x="0" y="4" fill="#ffffff" fontSize="10" fontFamily="Geist Mono" textAnchor="middle">$</text>
            </g>
          </g>

          <g transform="translate(95, 65)">
            <g className="animate-float-alt">
              <ellipse cx="0" cy="0" rx="14" ry="9" stroke="#7089ba" strokeWidth="1.2" strokeDasharray="3 2" fill="#1c1c1c" />
              <text x="0" y="3" fill="#ffffff" fontSize="8" fontFamily="Geist Mono" textAnchor="middle">$</text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

/**
 * Hero Bottom Radial Fan Stipple Pattern
 */
export const HeroLightBeamStipple: React.FC<CadIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`w-full max-w-[480px] h-[100px] flex items-center justify-center relative overflow-hidden ${className}`}>
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
