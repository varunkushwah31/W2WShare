import React from 'react'
import type { NavPageType } from './Navigation'
import type { LegalDocType } from './pages/LegalModal'

interface FooterProps {
  onNavigate: (page: NavPageType) => void
  onOpenLegal: (doc: LegalDocType) => void
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => {
  return (
    <footer className="w-full border-t border-[#1c1c1c] bg-[#000000] pt-16 pb-12">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#1c1c1c]">
          {/* Brand & Technical Status */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 flex items-center justify-center relative">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
                  <path
                    d="M4 4h5v16H4V4zm11 0h5v16h-5V4z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="12" r="2.5" fill="#7089ba" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                W2W Share
              </span>
            </div>

            <p className="text-xs text-[#808080] max-w-xs leading-relaxed">
              Zero-knowledge, 100% offline peer-to-peer file & folder sharing platform. Client-side AES-256-GCM encryption with local subnet UDP discovery.
            </p>

            {/* System Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-[#282828] text-[10px] font-mono text-[#808080]">
              <span className="w-2 h-2 rounded-full bg-[#7089ba] animate-pulse" />
              <span>ALL SUBNET SERVICES OPERATIONAL · v2.0.4</span>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            {/* Product */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-white">
                Product
              </div>
              <ul className="space-y-2 text-xs text-[#808080]">
                <li>
                  <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Transfer Studio
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('security')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Security Whitepaper
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Enterprise Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('changelog')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Changelog
                  </button>
                </li>
              </ul>
            </div>

            {/* Engineering */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-white">
                Engineering
              </div>
              <ul className="space-y-2 text-xs text-[#808080]">
                <li>
                  <button onClick={() => onNavigate('blog')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Engineering Blog
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('security')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Threat Model & Primitives
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('changelog')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Release Blueprints
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal & Compliance */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-white">
                Legal
              </div>
              <ul className="space-y-2 text-xs text-[#808080]">
                <li>
                  <button onClick={() => onOpenLegal('privacy')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => onOpenLegal('terms')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => onOpenLegal('security')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Security Standards
                  </button>
                </li>
                <li>
                  <button onClick={() => onOpenLegal('compliance')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Compliance & SOC 2
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4d4d4d] font-mono">
          <div>© 2026 W2W Share Inc. All rights reserved. 100% Offline & Open Architecture.</div>
          <div className="flex items-center gap-6">
            <span>SPEC: 2.0.4</span>
            <span className="text-[#7089ba]">AES-256-GCM</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
