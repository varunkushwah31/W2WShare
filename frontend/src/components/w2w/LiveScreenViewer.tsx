import React, { useEffect, useRef, useState } from 'react'
import {
  CornersOutIcon,
  PictureInPictureIcon,
  XIcon,
  TelevisionSimpleIcon,
  ArrowsClockwiseIcon,
} from '@phosphor-icons/react'

interface LiveScreenViewerProps {
  stream: MediaStream | null
  onClose?: () => void
}

export const LiveScreenViewer: React.FC<LiveScreenViewerProps> = ({ stream, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.play().then(() => {
      setIsPlaying(true)
    }).catch((err) => {
      console.warn('[LiveScreenViewer] Autoplay prevented, waiting for user click:', err)
    })

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setStreamResolution({ width: video.videoWidth, height: video.videoHeight })
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.srcObject = null
    }
  }, [stream])

  const toggleFullscreen = async () => {
    const video = videoRef.current
    if (!video) return
    if (!document.fullscreenElement) {
      try {
        await video.requestFullscreen()
      } catch (err) {
        console.warn('Fullscreen request failed:', err)
      }
    } else {
      await document.exitFullscreen()
    }
  }

  const togglePip = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      }
    } catch (err) {
      console.warn('PiP request failed:', err)
    }
  }

  if (!stream) return null

  return (
    <div className="rounded-2xl bg-[#0d0d0d] border border-[#7089ba]/40 overflow-hidden shadow-2xl relative space-y-2 cyber-grid">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between p-3.5 bg-[#141414] border-b border-[#242424]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex items-center gap-2">
            <TelevisionSimpleIcon className="w-4 h-4 text-[#7089ba]" weight="duotone" />
            <span className="font-mono text-xs font-bold text-white tracking-wider">
              LIVE PEER SCREEN CAST
            </span>
          </div>
          <span className="font-mono text-[9px] text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold uppercase">
            WEBRTC DIRECT P2P
          </span>
          {streamResolution && (
            <span className="hidden sm:inline font-mono text-[10px] text-steel">
              {streamResolution.width}x{streamResolution.height}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePip}
            className="p-1.5 rounded-lg bg-carbon hover:bg-[#282828] text-steel hover:text-white transition-colors cursor-pointer"
            title="Picture-in-Picture"
          >
            <PictureInPictureIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-carbon hover:bg-[#282828] text-steel hover:text-white transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <CornersOutIcon className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-carbon hover:bg-[#eb5757]/20 text-steel hover:text-[#eb5757] transition-colors cursor-pointer"
              title="Close Stream Viewer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-steel font-mono text-xs">
            <ArrowsClockwiseIcon className="w-5 h-5 animate-spin text-[#7089ba]" />
            <span>Connecting to live video track...</span>
          </div>
        )}
      </div>
    </div>
  )
}
