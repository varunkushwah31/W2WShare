import React from 'react'
import { ArrowLeft, Check, ShieldCheck, Sparkle } from '@phosphor-icons/react'

interface EnterprisePricingPageProps {
  onBack: () => void
  onOpenDemo: () => void
}

export const EnterprisePricingPage: React.FC<EnterprisePricingPageProps> = ({
  onBack,
  onOpenDemo,
}) => {
  const tiers = [
    {
      name: 'COMMUNITY CORE',
      price: '$0',
      period: 'forever free',
      description: '100% offline peer sharing for individual engineers, researchers, and local LAN environments.',
      features: [
        'Zero Internet Required (100% Offline)',
        'Browser-Native AES-256-GCM + PBKDF2 (100k)',
        'Subnet Peer Radar UDP Discovery (Port 8888)',
        'Zero File Size Limits & 2MB Direct Streaming',
        'Burn-After-Reading Single-Claim Ephemeral Mode',
        'Signed JSON Cryptographic Audit Receipts',
      ],
      cta: 'Launch Core Studio',
      isPopular: false,
    },
    {
      name: 'ENTERPRISE ON-PREM',
      price: '$49',
      period: 'per node / month',
      description: 'Dedicated air-gapped appliances for defense, healthcare, and enterprise compliance teams.',
      features: [
        'Everything in Community Core, plus:',
        'Air-Gapped Hardware Appliance Deployment',
        'SAML 2.0 / OIDC / LDAP Identity Integration',
        'Centralized Cryptographic Audit SIEM Ingestion',
        'Custom TLS Certificate Authority Pinning',
        '99.999% Air-Gapped Network High-Availability SLA',
      ],
      cta: 'Book Enterprise Demo',
      isPopular: true,
    },
    {
      name: 'OEM EMBEDDED NODE',
      price: 'Custom',
      period: 'annual license',
      description: 'Custom hardware & firmware embedding for edge routers, tactical radios, and medical equipment.',
      features: [
        'Everything in Enterprise, plus:',
        'Custom Rust / C WebAssembly Core Bindings',
        'FIPS 140-3 Cryptographic HSM Integration',
        'Custom Multicast & Mesh Subnet Protocols',
        'Dedicated 24/7 Cryptographic Support Team',
      ],
      cta: 'Contact Engineering',
      isPopular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-[1150px] mx-auto space-y-14 animate-in fade-in duration-300">
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
          <span>ZERO CLOUD LICENSING · SPEC 2.0</span>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          Simple, Transparent Deployment
        </h1>
        <p className="text-sm text-[#808080] leading-relaxed">
          W2WShare Core is 100% free and open. Upgrade to Enterprise for air-gapped compliance, SIEM integration, and dedicated hardware appliances.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t, idx) => (
          <div
            key={idx}
            className={`p-7 rounded-2xl bg-[#141414] border flex flex-col justify-between space-y-6 relative transition-all ${
              t.isPopular ? 'border-[#7089ba]/40 shadow-xl' : 'border-[#1c1c1c] hover:border-[#2a2a2a]'
            }`}
          >
            {t.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#7089ba] text-white font-mono text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
                <Sparkle className="w-3 h-3" />
                <span>MOST POPULAR</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="font-mono text-xs uppercase tracking-wider text-[#7089ba]">
                {t.name}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white font-sans">{t.price}</span>
                <span className="text-xs text-[#808080] font-mono">{t.period}</span>
              </div>
              <p className="text-xs text-[#808080] leading-relaxed min-h-[36px]">
                {t.description}
              </p>

              <div className="pt-4 border-t border-[#1c1c1c] space-y-3">
                {t.features.map((f, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-xs text-[#ababab]">
                    <div className="w-4 h-4 rounded-full bg-[#7089ba]/15 text-[#7089ba] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" weight="bold" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (t.cta.includes('Demo') || t.cta.includes('Contact')) {
                  onOpenDemo()
                } else {
                  onBack()
                }
              }}
              className={`w-full py-2.5 rounded-full text-xs font-semibold transition-all ${
                t.isPopular
                  ? 'bg-white text-black hover:bg-white/90 shadow-sm'
                  : 'border border-[#282828] bg-[#1c1c1c] text-white hover:border-white'
              }`}
            >
              {t.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
