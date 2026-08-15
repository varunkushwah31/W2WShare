import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShieldCheck, LockKey } from '@phosphor-icons/react'

export type LegalDocType = 'privacy' | 'terms' | 'security' | 'compliance'

interface LegalModalProps {
  type: LegalDocType | null
  onClose: () => void
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null

  const getDoc = () => {
    switch (type) {
      case 'privacy':
        return {
          title: 'Zero-Knowledge Privacy Policy',
          tag: '100% NO-LOGGING GUARANTEE',
          content: [
            {
              h: '1. Zero Data Collection',
              p: 'W2WShare is an open-source tool that operates strictly on your local subnet and hardware. W2WShare does not operate telemetry collectors, user tracking scripts, third-party analytics pixels, or remote key escrow servers. All binary data transfers stay bounded to your local network interfaces.',
            },
            {
              h: '2. Client-Side Cryptographic Isolation',
              p: 'Encryption (AES-256-GCM) and key derivation (PBKDF2 with 100,000 rounds) execute entirely within your client browser environment via WebCrypto. Secret keys and plaintext bytes are never transmitted to unencrypted storage.',
            },
            {
              h: '3. Ephemeral Memory Destruction',
              p: 'Sessions configured with Burn-After-Reading destroy in-memory buffer references immediately upon first confirmed download. No persistent traces or file remnants remain on the local host.',
            },
          ],
        }
      case 'terms':
        return {
          title: 'Terms of Open Architecture',
          tag: 'OPEN-SOURCE & COMMERCIAL USE',
          content: [
            {
              h: '1. Permitted Use',
              p: 'W2WShare is an open-source tool provided free of charge under the open architecture license for personal, educational, research, and commercial file sharing across private and enterprise networks.',
            },
            {
              h: '2. No Liability for Key Loss',
              p: 'Because W2WShare uses true zero-knowledge end-to-end encryption without key recovery backdoors, loss of the 6-digit claim PIN or cryptographic salt renders transferred files irrecoverable.',
            },
            {
              h: '3. Local Network Usage',
              p: 'Users are responsible for ensuring compliance with their organization network policies when operating W2WShare on their local network.',
            },
          ],
        }
      case 'security':
        return {
          title: 'Cryptographic Standards',
          tag: 'FIPS & NIST COMPLIANT PRIMITIVES',
          content: [
            {
              h: '1. Symmetric Cipher Specifications',
              p: 'AES-256-GCM with 128-bit authentication tags and cryptographically unique 12-byte IVs for each 2MB binary transfer chunk.',
            },
            {
              h: '2. Key Expansion Standard',
              p: 'PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt generated via secure hardware entropy.',
            },
            {
              h: '3. Integrity Digests',
              p: 'Pre-transfer SHA-256 and post-decryption SHA-256 validation ensuring mathematical byte-for-byte fidelity.',
            },
          ],
        }
      case 'compliance':
        return {
          title: 'Enterprise Compliance & Air-Gapped Controls',
          tag: 'SOC 2 TYPE II / ISO 27001 ALIGNED',
          content: [
            {
              h: '1. Air-Gapped Network Readiness',
              p: 'W2WShare functions 100% offline with zero outbound internet dependencies, satisfying strict air-gapped laboratory and defense requirements.',
            },
            {
              h: '2. Cryptographic Forensic Receipts',
              p: 'Every transfer produces a verifiable signed JSON audit receipt with transaction hashes, timestamps, and cipher metadata for compliance logs.',
            },
          ],
        }
    }
  }

  const doc = getDoc()

  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-[#1c1c1c] bg-[#141414] text-white p-7 rounded-2xl">
        <DialogHeader className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded border border-[#7089ba]/20 flex items-center gap-1">
              <LockKey className="w-3 h-3" />
              <span>{doc.tag}</span>
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-sans flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#7089ba]" />
            <span>{doc.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 text-xs font-mono">
          {doc.content.map((sec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#000000] border border-[#1c1c1c] space-y-1.5">
              <h4 className="text-white font-semibold text-sm">{sec.h}</h4>
              <p className="text-[#808080] leading-relaxed font-sans text-xs">{sec.p}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[#1c1c1c] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all"
          >
            Acknowledge & Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
