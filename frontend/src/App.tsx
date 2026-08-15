import { useState } from 'react'
import { Navigation, type NavPageType } from './components/Navigation'
import { Hero } from './components/Hero'
import { W2WWorkspace } from './components/w2w/W2WWorkspace'
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

// Full Sub-Pages
import { ChangelogPage } from './components/pages/ChangelogPage'
import { SecurityWhitepaperPage } from './components/pages/SecurityWhitepaperPage'
import { EnterprisePricingPage } from './components/pages/EnterprisePricingPage'
import { EngineeringBlogPage } from './components/pages/EngineeringBlogPage'
import { LegalModal, type LegalDocType } from './components/pages/LegalModal'

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPageType>('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'demo' | 'login'>('demo')
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null)

  const handleOpenDemo = () => {
    setModalMode('demo')
    setModalOpen(true)
  }

  const handleOpenLogin = () => {
    setModalMode('login')
    setModalOpen(true)
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
        onOpenDemo={handleOpenDemo}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Content Router */}
      <main className="relative">
        {currentPage === 'home' && (
          <>
            {/* 1. Hero Section */}
            <Hero onOpenDemo={handleOpenDemo} />

            {/* 2. Interactive W2WShare Live Terminal Workspace */}
            <W2WWorkspace id="workspace" initialTab="send" />

            {/* Section 2 Intro Header */}
            <div className="pt-20 pb-4 text-center max-w-3xl mx-auto px-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
                What you get with an end-to-end encrypted sharing platform.
              </h2>
            </div>

            {/* 3. Feature Split Panel 1: Connect Your Data */}
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
              id="query"
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
            <FaqSection />

            {/* 10. Bottom Drafting CTA */}
            <CtaSection onOpenDemo={handleOpenDemo} />
          </>
        )}

        {currentPage === 'changelog' && (
          <ChangelogPage onBack={() => handleNavigate('home')} />
        )}

        {currentPage === 'security' && (
          <SecurityWhitepaperPage onBack={() => handleNavigate('home')} />
        )}

        {currentPage === 'pricing' && (
          <EnterprisePricingPage
            onBack={() => handleNavigate('home')}
            onOpenDemo={handleOpenDemo}
          />
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

      {/* Interactive Demo & Login Modal */}
      <BookDemoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
      />

      {/* Legal & Compliance Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  )
}

export default App
