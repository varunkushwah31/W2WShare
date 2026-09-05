import { useState, useEffect } from 'react'
import { Navigation, type NavPageType } from './components/Navigation'
import { Hero } from './components/Hero'
import { W2WWorkspace, type W2WTabType } from './components/w2w/W2WWorkspace'
import { FeatureSplitPanel } from './components/FeatureSplitPanel'
import {
  GearChassisCadIllustration,
  CrtMonitorCadIllustration,
  RocketLaunchCadIllustration,
} from './components/CadIllustrations'
import { AiAnalyticsGrid } from './components/AiAnalyticsGrid'
import { ArchitectureComparison } from './components/ArchitectureComparison'
import { HowItWorks } from './components/HowItWorks'
import { FaqSection } from './components/FaqSection'
import { CtaSection } from './components/CtaSection'
import { Footer } from './components/Footer'
import { BookDemoModal } from './components/BookDemoModal'
import { MobileCompanionModal } from './components/w2w/MobileCompanionModal'

// Full Sub-Pages
import { ChangelogPage } from './components/pages/ChangelogPage'
import { SecurityWhitepaperPage } from './components/pages/SecurityWhitepaperPage'
import { EngineeringBlogPage } from './components/pages/EngineeringBlogPage'
import { UserGuidePage } from './components/pages/UserGuidePage'
import { LegalModal, type LegalDocType } from './components/pages/LegalModal'

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPageType>('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [mobileCompanionOpen, setMobileCompanionOpen] = useState(false)
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null)

  // MangoShare-style deep link detection: auto-switch to receive vault
  const [initialWorkspaceTab, setInitialWorkspaceTab] = useState<W2WTabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('pin') || params.get('code') || params.get('mode') === 'receiver') {
        return 'receive'
      }
    }
    return 'send'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('pin') || params.get('code') || params.get('mode') === 'receiver') {
        // Smoothly scroll down to workspace for direct receiving
        const timer = setTimeout(() => {
          const el = document.getElementById('workspace')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
          }
        }, 150)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const handleOpenClaimPin = () => {
    setModalOpen(true)
  }

  const handleClaimPin = (pin: string) => {
    setModalOpen(false)
    if (currentPage !== 'home') {
      setCurrentPage('home')
    }
    setInitialWorkspaceTab('receive')
    window.history.replaceState(null, '', `/?pin=${pin}#workspace`)
    setTimeout(() => {
      const el = document.getElementById('workspace')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleNavigate = (page: NavPageType) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#7089ba]/30 selection:text-white relative">
      {/* Navigation */}
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenDemo={handleOpenClaimPin}
        onOpenMobileApp={() => setMobileCompanionOpen(true)}
      />

      {/* Main Content Router */}
      <main className="relative">
        {currentPage === 'home' && (
          <>
            {/* 1. Hero Section */}
            <Hero onOpenDemo={handleOpenClaimPin} />

            {/* 2. Interactive W2W Share Live Terminal Workspace */}
            <W2WWorkspace
              id="workspace"
              initialTab={initialWorkspaceTab}
              onOpenMobileApp={() => setMobileCompanionOpen(true)}
            />

            {/* Section 2 Intro Header */}
            <div className="pt-20 pb-4 text-center max-w-3xl mx-auto px-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
                What you get with an end-to-end encrypted sharing platform.
              </h2>
            </div>

            {/* 3. Feature Split Panel 1: Subnet Radar */}
            <FeatureSplitPanel
              id="features"
              eyebrow="SUBNET RADAR"
              heading="Auto-discover nearby devices on Wi-Fi."
              description="W2W Share broadcasts on UDP port 8888, detecting workstations, mobile phones, and laptops across your local LAN in real time."
              items={[
                'Instant peer discovery on Wi-Fi and mobile hotspots',
                'Zero Bluetooth pairing or cloud handshake delays',
                'Automatic network interface topology mapping',
                'No internet access or gateway required',
              ]}
              illustration={<GearChassisCadIllustration />}
              reverse={false}
            />

            {/* 4. 4-Grid System Primitives Cards */}
            <AiAnalyticsGrid />

            {/* 5. Feature Split Panel 2: Cryptographic Engine */}
            <FeatureSplitPanel
              id="crypto"
              eyebrow="CLIENT-SIDE CIPHER"
              heading="AES-256-GCM and PBKDF2 (100k rounds)."
              description="Symmetric encryption executes directly in your browser with hardware-level Galois/Counter Mode authentication tags."
              items={[
                'PBKDF2 key derivation with 16-byte random salts',
                '2MB binary sliding window chunk streaming',
                'Hardware-accelerated Gzip pre-compression',
                'Byte-for-byte mathematical SHA-256 integrity checks',
              ]}
              illustration={<CrtMonitorCadIllustration />}
              reverse={true}
            />

            {/* 6. Feature Split Panel 3: Ephemeral Burn & Audit */}
            <FeatureSplitPanel
              eyebrow="EPHEMERAL DESTRUCTION"
              heading="Single-claim auto-destruct & signed receipts."
              description="Ensure zero lingering data artifacts on network nodes with instant in-memory buffer deallocation."
              items={[
                'Native Burn-After-Reading execution on 1st download',
                'Forensic cryptographic audit trail in localStorage',
                'Downloadable signed JSON compliance receipts',
                'Zero server-side disk persistence or telemetry',
              ]}
              illustration={<RocketLaunchCadIllustration />}
              reverse={false}
            />

            {/* 7. Architecture Specification Matrix */}
            <ArchitectureComparison />

            {/* 8. 3-Step How It Works Section */}
            <HowItWorks />

            {/* 9. FAQ Accordion Section */}
            <FaqSection onNavigate={handleNavigate} />

            {/* 10. Bottom Drafting CTA */}
            <CtaSection onOpenDemo={handleOpenClaimPin} />
          </>
        )}

        {currentPage === 'guide' && (
          <UserGuidePage onBack={() => handleNavigate('home')} />
        )}

        {currentPage === 'changelog' && (
          <ChangelogPage onBack={() => handleNavigate('home')} />
        )}

        {currentPage === 'security' && (
          <SecurityWhitepaperPage onBack={() => handleNavigate('home')} />
        )}

        {currentPage === 'blog' && (
          <EngineeringBlogPage onBack={() => handleNavigate('home')} />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenLegal={(doc) => setLegalModalType(doc)}
      />

      {/* Interactive Quick Claim PIN Modal */}
      <BookDemoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onClaim={handleClaimPin}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Mobile Companion PWA & QR Modal */}
      <MobileCompanionModal
        isOpen={mobileCompanionOpen}
        onClose={() => setMobileCompanionOpen(false)}
      />
    </div>
  )
}

export default App
