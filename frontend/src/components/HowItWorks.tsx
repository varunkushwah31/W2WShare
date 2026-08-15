import React from 'react'
import { LockKeyIcon, BroadcastIcon, DownloadSimpleIcon, ShieldCheckIcon } from '@phosphor-icons/react'

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: 'STEP 01',
      title: 'Stage & Encrypt',
      description:
        'Drag & drop files or folders. Compresses via Gzip and applies client-side AES-256-GCM encryption with PBKDF2.',
      icon: <LockKeyIcon className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
    },
    {
      step: 'STEP 02',
      title: 'Share 6-Digit PIN',
      description:
        'Auto-broadcasts to nearby devices on local Wi-Fi port 8888, or share the generated 6-digit numeric claim PIN or wireframe QR code.',
      icon: <BroadcastIcon className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
    },
    {
      step: 'STEP 03',
      title: 'Stream & Download',
      description:
        'Decrypts with the shared PIN and verifies mathematical hash integrity in real time, with optional single-claim burn-after-reading destruction.',
      icon: <DownloadSimpleIcon className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
    },
  ]

  return (
    <section className="w-full max-w-[1200px] mx-auto px-6 py-20 dashed-container my-12 rounded-2xl bg-[#000000]/60">
      {/* Centered Heading */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#808080] flex items-center justify-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4 text-[#7089ba]" />
          <span>3 EASY STEPS</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
          Stream files offline in 3 simple steps.
        </h2>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {steps.map((item, index) => (
          <div key={index} className="flex flex-col items-start space-y-4 p-4">
            {/* Step Icon & Counter */}
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center">
                {item.icon}
              </div>
              <span className="font-mono text-[10px] text-[#7089ba] tracking-wider bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                {item.step}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white font-sans">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-[#808080] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
