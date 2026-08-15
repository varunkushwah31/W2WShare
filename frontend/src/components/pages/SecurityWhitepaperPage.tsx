import React from 'react'
import { ArrowLeft, ShieldCheck, LockKey, Key, Cpu, FileCode } from '@phosphor-icons/react'

interface SecurityWhitepaperPageProps {
  onBack: () => void
}

export const SecurityWhitepaperPage: React.FC<SecurityWhitepaperPageProps> = ({ onBack }) => {
  const securitySections = [
    {
      icon: <Key className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
      title: 'PBKDF2 Key Generation',
      badge: '100K ITERS',
      description:
        'User 6-digit PINs + entropy keys are expanded into 256-bit symmetric keys using PBKDF2 (Password-Based Key Derivation Function 2) with HMAC-SHA256 and a cryptographically secure 16-byte random salt generated via crypto.getRandomValues().',
    },
    {
      icon: <LockKey className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
      title: 'AES-256-GCM Encryption',
      badge: 'GALOIS MODE',
      description:
        'All 2MB chunks are individually encrypted in-browser using WebCrypto AES-GCM-256. Each chunk receives a fresh 12-byte IV (Initialization Vector) and a 128-bit authentication tag, preventing replay, tampering, and ciphertext malleability.',
    },
    {
      icon: <Cpu className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
      title: 'Zero-Knowledge Network',
      badge: 'AIR-GAPPED READY',
      description:
        'The orchestrator acts as an ephemeral memory buffer without persistent disk caching or decryption keys. At no point are unencrypted buffers or derived secrets transmitted to external internet gateways or cloud hosts.',
    },
    {
      icon: <FileCode className="w-5 h-5 text-[#7089ba]" weight="duotone" />,
      title: 'SHA-256 Data Integrity',
      badge: 'INTEGRITY CHECK',
      description:
        'Before encryption, a SHA-256 message digest of the raw byte stream is calculated. Upon chunk streaming and client-side decryption, the receiving device independently computes the SHA-256 digest to verify mathematical byte-for-byte fidelity before saving to disk.',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-[1100px] mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CRYPTOGRAPHIC WHITEPAPER · SPEC 2.0</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          Security Architecture & Threat Model
        </h1>
        <p className="text-base text-[#808080] leading-relaxed">
          W2WShare guarantees zero-knowledge, end-to-end encrypted direct data transit across local subnets without intermediary cloud telemetry, external key escrow, or permanent persistence.
        </p>
      </div>

      {/* Cryptographic Primitives 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securitySections.map((sec, idx) => (
          <div
            key={idx}
            className="p-7 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-4 hover:border-[#2a2a2a] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center">
                {sec.icon}
              </div>
              <span className="font-mono text-[10px] text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20">
                {sec.badge}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white font-sans">{sec.title}</h3>
            <p className="text-xs text-[#808080] leading-relaxed font-mono">{sec.description}</p>
          </div>
        ))}
      </div>

      {/* Cryptographic Pipeline Flow */}
      <div className="p-8 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-6">
        <div className="space-y-1">
          <span className="font-mono text-[10px] text-[#7089ba] uppercase tracking-wider">
            DATA PIPELINE SCHEMA
          </span>
          <h3 className="text-xl font-bold text-white font-sans">
            End-to-End Encryption Flow Diagram
          </h3>
        </div>

        <div className="p-6 rounded-xl bg-[#000000] border border-[#242424] font-mono text-xs text-[#808080] space-y-4 overflow-x-auto leading-relaxed">
          <div className="flex items-center gap-3 text-white">
            <span className="text-[#7089ba]">[1] SENDER:</span>
            <span>Raw File / Folder ➔ Gzip Pre-Compression ➔ SHA-256 Digest</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <span className="text-[#7089ba]">[2] KEYGEN:</span>
            <span>6-Digit PIN + Salt(16B) ➔ PBKDF2-HMAC-SHA256 (100k) ➔ AES-256 Key</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <span className="text-[#7089ba]">[3] CIPHER:</span>
            <span>2MB Chunks + IV(12B) ➔ WebCrypto AES-GCM-256 ➔ Encrypted Binary Stream</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <span className="text-[#7089ba]">[4] TRANSIT:</span>
            <span>Local Subnet Streaming (Port 8080 / 8888) ➔ Zero Disk Persistence</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <span className="text-[#7089ba]">[5] RECEIVER:</span>
            <span>Decryption ➔ Decompression ➔ SHA-256 Verification ➔ Ephemeral Burn</span>
          </div>
        </div>
      </div>
    </div>
  )
}
