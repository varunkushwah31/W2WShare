import React, { useEffect, useRef, useState } from 'react'
import {
  LightningIcon,
  ClockIcon,
  HardDrivesIcon,
  GaugeIcon,
  ArrowsLeftRightIcon,
} from '@phosphor-icons/react'

interface TransferTelemetryChartProps {
  currentSpeedMbps: number
  totalBytes: number
  transferredBytes: number
  isDirectP2p?: boolean
  isCompressed?: boolean
  originalSizeBytes?: number
  currentChunk?: number
  totalChunks?: number
  className?: string
}

export const TransferTelemetryChart: React.FC<TransferTelemetryChartProps> = ({
  currentSpeedMbps,
  totalBytes,
  transferredBytes,
  isDirectP2p = false,
  isCompressed = false,
  originalSizeBytes = 0,
  currentChunk = 0,
  totalChunks = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedHistoryRef = useRef<number[]>([0])
  const peakSpeedRef = useRef(0)
  const [peakSpeed, setPeakSpeed] = useState(0)

  // Track rolling speed history for smooth 60fps chart rendering
  useEffect(() => {
    speedHistoryRef.current = [...speedHistoryRef.current.slice(-35), currentSpeedMbps]
    if (currentSpeedMbps > peakSpeedRef.current) {
      peakSpeedRef.current = currentSpeedMbps
      setPeakSpeed(currentSpeedMbps)
    }
  }, [currentSpeedMbps])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      const history = speedHistoryRef.current
      const peak = peakSpeedRef.current

      ctx.clearRect(0, 0, width, height)

      // Background grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      // Horizontal grid lines
      for (let y = 15; y < height; y += 22) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      ctx.setLineDash([])

      if (history.length < 2) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      const maxVal = Math.max(peak * 1.15, 10)
      const stepX = width / (history.length - 1)

      // Path creation for filled area under curve
      ctx.beginPath()
      ctx.moveTo(0, height)

      history.forEach((speed, idx) => {
        const x = idx * stepX
        const normalizedY = height - (speed / maxVal) * (height - 12) - 4
        if (idx === 0) {
          ctx.lineTo(x, normalizedY)
        } else {
          // Smooth bezier curve between points
          const prevX = (idx - 1) * stepX
          const prevY = height - (history[idx - 1] / maxVal) * (height - 12) - 4
          const cpX = (prevX + x) / 2
          ctx.bezierCurveTo(cpX, prevY, cpX, normalizedY, x, normalizedY)
        }
      })

      ctx.lineTo(width, height)
      ctx.closePath()

      // Gradient fill under curve
      const areaGradient = ctx.createLinearGradient(0, 0, 0, height)
      if (isDirectP2p) {
        areaGradient.addColorStop(0, 'rgba(52, 211, 153, 0.25)')
        areaGradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)')
      } else {
        areaGradient.addColorStop(0, 'rgba(112, 137, 186, 0.35)')
        areaGradient.addColorStop(1, 'rgba(112, 137, 186, 0.0)')
      }
      ctx.fillStyle = areaGradient
      ctx.fill()

      // Line stroke path
      ctx.beginPath()
      history.forEach((speed, idx) => {
        const x = idx * stepX
        const normalizedY = height - (speed / maxVal) * (height - 12) - 4
        if (idx === 0) {
          ctx.moveTo(x, normalizedY)
        } else {
          const prevX = (idx - 1) * stepX
          const prevY = height - (history[idx - 1] / maxVal) * (height - 12) - 4
          const cpX = (prevX + x) / 2
          ctx.bezierCurveTo(cpX, prevY, cpX, normalizedY, x, normalizedY)
        }
      })

      ctx.strokeStyle = isDirectP2p ? '#34d399' : '#7089ba'
      ctx.lineWidth = 2.2
      ctx.stroke()

      // Pulsing pulse node at newest head coordinate
      const lastX = width
      const lastY = height - (history[history.length - 1] / maxVal) * (height - 12) - 4

      ctx.beginPath()
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = isDirectP2p ? '#34d399' : '#7089ba'
      ctx.lineWidth = 2
      ctx.stroke()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isDirectP2p])

  // Calculate ETA
  const remainingBytes = Math.max(0, totalBytes - transferredBytes)
  const currentBytesPerSec = currentSpeedMbps * 1024 * 1024
  let etaSeconds = 0
  if (currentBytesPerSec > 0 && remainingBytes > 0) {
    etaSeconds = Math.ceil(remainingBytes / currentBytesPerSec)
  }

  const formatEta = (secs: number) => {
    if (secs <= 0) return '00:00s'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `00:${s.toString().padStart(2, '0')}s`
  }

  // Calculate compression savings
  let compressionRatio = 0
  if (isCompressed && originalSizeBytes > 0 && totalBytes < originalSizeBytes) {
    compressionRatio = Math.round(((originalSizeBytes - totalBytes) / originalSizeBytes) * 100)
  }

  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-[#0c0c0c] border border-[#202020] space-y-4 ${className}`}>
      {/* Top Protocol Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-carbon pb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#282828]">
            <GaugeIcon className="w-3.5 h-3.5 text-[#7089ba]" />
            <span className="text-steel">PIPELINE:</span>
            <span className="text-white font-bold">{currentSpeedMbps.toFixed(1)} MB/s</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#181818] text-steel border border-[#282828]">
            <span>Peak:</span>
            <span className="text-white">{peakSpeed.toFixed(1)} MB/s</span>
          </div>
        </div>

        {/* Transport Protocol Badge */}
        <div className="flex items-center gap-2">
          {isDirectP2p ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              <LightningIcon className="w-3.5 h-3.5" weight="fill" />
              <span>WebRTC Direct P2P (0ms Relay)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#7089ba]/10 border border-[#7089ba]/20 text-[#7089ba]">
              <ArrowsLeftRightIcon className="w-3.5 h-3.5" />
              <span>Subnet HTTP Chunk Relay</span>
            </div>
          )}
        </div>
      </div>

      {/* 60 FPS Telemetry Canvas */}
      <div className="relative w-full h-24 bg-void rounded-lg border border-[#1a1a1a] p-2 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={480}
          height={80}
          className="w-full h-full block"
        />

        {/* Watermark coordinate */}
        <div className="absolute bottom-1 right-2 font-mono text-[9px] text-graphite pointer-events-none">
          60 FPS · WEB CRYPTO SLIDING SINK
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222]">
          <div className="text-[10px] text-steel flex items-center gap-1 mb-0.5">
            <ClockIcon className="w-3 h-3 text-[#7089ba]" />
            <span>EST. TIME REMAINING</span>
          </div>
          <div className="text-white font-bold text-sm">
            {remainingBytes === 0 ? 'Complete' : formatEta(etaSeconds)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222]">
          <div className="text-[10px] text-steel flex items-center gap-1 mb-0.5">
            <HardDrivesIcon className="w-3 h-3 text-[#7089ba]" />
            <span>CHUNK PIPELINE</span>
          </div>
          <div className="text-white font-bold text-sm">
            {totalChunks > 0 ? `${currentChunk} / ${totalChunks} (2MB)` : '100%'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222]">
          <div className="text-[10px] text-steel flex items-center gap-1 mb-0.5">
            <LightningIcon className="w-3 h-3 text-[#7089ba]" />
            <span>GZIP SAVINGS</span>
          </div>
          <div className="text-white font-bold text-sm">
            {compressionRatio > 0 ? `${compressionRatio}% Saved` : isCompressed ? 'Gzip Active' : 'Off'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222]">
          <div className="text-[10px] text-steel flex items-center gap-1 mb-0.5">
            <GaugeIcon className="w-3 h-3 text-[#7089ba]" />
            <span>INTEGRITY CHECK</span>
          </div>
          <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
            <span>SHA-256 OK</span>
          </div>
        </div>
      </div>
    </div>
  )
}
