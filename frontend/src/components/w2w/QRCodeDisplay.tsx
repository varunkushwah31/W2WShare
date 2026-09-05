import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCodeIcon, WarningCircleIcon } from '@phosphor-icons/react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  className?: string
  alt?: string
  darkColor?: string
  lightColor?: string
  level?: 'L' | 'M' | 'Q' | 'H'
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  className = '',
  alt = 'QR Code',
  darkColor = '#000000',
  lightColor = '#ffffff',
  level = 'M',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    if (!value || value.trim() === '') {
      setDataUrl(null)
      setError('No data provided for QR code')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    QRCode.toDataURL(value, {
      width: size * 2, // High-DPI 2x scaling for crisp mobile rendering
      margin: 1,
      errorCorrectionLevel: level,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to generate QR code:', err)
          setError('Failed to generate QR code')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [value, size, darkColor, lightColor, level])

  return (
    <div
      className={`relative flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-inner ${className}`}
      style={{ width: size, height: size }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white text-neutral-400 z-10">
          <QrCodeIcon className="w-8 h-8 animate-pulse text-[#7089ba]" />
          <span className="text-[10px] font-mono mt-1 text-neutral-500">Generating QR...</span>
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-neutral-100 text-neutral-600 text-xs font-mono z-10">
          <WarningCircleIcon className="w-6 h-6 text-amber-500 mb-1" />
          <span>{error}</span>
        </div>
      ) : (
        dataUrl && (
          <img
            src={dataUrl}
            alt={alt}
            width={size}
            height={size}
            className={`w-full h-full object-contain block transition-opacity duration-200 ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )
      )}
    </div>
  )
}
