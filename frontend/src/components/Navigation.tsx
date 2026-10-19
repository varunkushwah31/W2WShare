import React, {useEffect, useState} from 'react'
import {
  LightningIcon,
  ListIcon,
  XIcon,
  DeviceMobileIcon,
  SunIcon,
  MoonIcon,
} from '@phosphor-icons/react'
import { useTheme } from '../lib/theme'

export type NavPageType = 'home' | 'features' | 'changelog' | 'security' | 'blog' | 'guide'

interface NavigationProps {
  currentPage: NavPageType
  onNavigate: (page: NavPageType) => void
  onOpenDemo: () => void
  onOpenMobileApp?: () => void
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  onOpenDemo,
  onOpenMobileApp,
}) => {
  const { isDark, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (page: NavPageType) => {
    onNavigate(page)
    setMobileMenuOpen(false)
    if (page === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const navLinks = [
    { id: 'home' as const, label: 'Studio' },
    { id: 'guide' as const, label: 'How to Use' },
    { id: 'security' as const, label: 'Security' },
    { id: 'changelog' as const, label: 'Updates' },
    { id: 'blog' as const, label: 'Blog' },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top,0px)] ${
          scrolled
            ? 'bg-void/90 backdrop-blur-md border-b border-carbon shadow-xs'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-300 mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Technical scale indicator */}
          <div className="hidden lg:block absolute -left-15 top-1/2 -translate-y-1/2 font-mono text-sm text-graphite select-none pointer-events-none">
            1.00
          </div>

          {/* Logo — W2W Share with Monogram Bracket */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-paper group-hover:text-periwinkle transition-colors">
                <path
                  d="M4 4h5v16H4V4zm11 0h5v16h-5V4z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" className="text-periwinkle" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-paper font-sans">
                W2W Share
              </span>
              <span className="hidden sm:inline-block font-mono text-[9px] text-periwinkle bg-periwinkle/10 px-2 py-0.5 rounded-full border border-periwinkle/20 font-medium">
                v1.0 E2EE
              </span>
            </div>
          </button>

          {/* Center Navigation Links (Clean, Uniformly Spaced) */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id
              return (
                <button
                  type="button"
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-sm transition-colors relative py-1 cursor-pointer ${
                    isActive
                      ? 'text-paper font-semibold'
                      : 'text-steel hover:text-paper font-medium'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-periwinkle" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button (Light Vellum / Dark Blueprint) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Drafting Mode: Switch to Architectural Light Vellum' : 'Drafting Mode: Switch to Night Blueprint Table'}
              className="p-2 rounded-full border border-carbon bg-carbon hover:bg-carbon-hover text-steel hover:text-paper transition-all cursor-pointer shadow-sm flex items-center justify-center"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-periwinkle hover:text-paper transition-colors" weight="bold" />
              ) : (
                <MoonIcon className="w-4 h-4 text-periwinkle hover:text-paper transition-colors" weight="bold" />
              )}
            </button>

            {onOpenMobileApp && (
              <button
                type="button"
                onClick={onOpenMobileApp}
                className="px-3 py-1.5 rounded-full bg-carbon hover:bg-carbon-hover text-periwinkle hover:text-paper text-xs font-mono border border-periwinkle/30 hover:border-periwinkle/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Open W2W Mobile Companion QR & PWA Setup"
              >
                <DeviceMobileIcon className="w-3.5 h-3.5 text-periwinkle" />
                <span className="hidden lg:inline">Mobile App</span>
                <span className="text-[9px] bg-periwinkle/20 text-periwinkle px-1.5 py-0.5 rounded font-bold">PWA</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDemo}
              className="px-4 py-1.5 rounded-full bg-paper text-void text-xs font-semibold hover:opacity-90 transition-all border border-paper flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <LightningIcon className="w-3.5 h-3.5" weight="fill" />
              <span>Claim by PIN</span>
            </button>
          </div>

          {/* Mobile Action Controls */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-full border border-carbon bg-carbon text-steel hover:text-paper transition-colors cursor-pointer flex items-center justify-center"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-periwinkle" weight="bold" />
              ) : (
                <MoonIcon className="w-4 h-4 text-periwinkle" weight="bold" />
              )}
            </button>
            <button
              type="button"
              onClick={onOpenDemo}
              className="px-3 py-1 rounded-full bg-paper text-void text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <LightningIcon className="w-3.5 h-3.5" weight="fill" />
              <span>Claim</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-paper p-1.5 rounded-lg hover:bg-carbon transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <ListIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-void/95 backdrop-blur-lg md:hidden p-6 flex flex-col justify-between border-b border-carbon">
          <div className="space-y-4">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id
              return (
                <button
                  type="button"
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`block w-full text-left text-lg py-1 ${
                    isActive ? 'text-paper font-bold' : 'text-steel hover:text-paper font-medium'
                  }`}
                >
                  <span>{link.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-3 pt-6 border-t border-carbon">
            {/* Theme Selector Pill for Mobile */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-carbon bg-carbon">
              <div className="flex items-center gap-2">
                {isDark ? (
                  <MoonIcon className="w-4 h-4 text-periwinkle" weight="bold" />
                ) : (
                  <SunIcon className="w-4 h-4 text-periwinkle" weight="bold" />
                )}
                <span className="font-mono text-xs font-semibold text-paper">
                  {isDark ? 'Mode: Dark Blueprint' : 'Mode: Light Vellum'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-1 rounded-full text-xs font-mono font-medium border border-carbon bg-void text-paper hover:border-steel transition-all cursor-pointer"
              >
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>

            {onOpenMobileApp && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenMobileApp()
                }}
                className="w-full py-2.5 rounded-full border border-periwinkle/40 bg-periwinkle/10 text-periwinkle font-mono text-sm flex items-center justify-center gap-2 hover:bg-periwinkle/20 transition-all cursor-pointer"
              >
                <DeviceMobileIcon className="w-4 h-4" />
                <span>Open Mobile Companion (PWA)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenDemo()
              }}
              className="w-full py-2.5 rounded-full bg-paper text-void font-semibold text-sm hover:opacity-90 cursor-pointer"
            >
              Claim by PIN
            </button>
          </div>
        </div>
      )}
    </>
  )
}

