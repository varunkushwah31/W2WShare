import React, { useState, useEffect } from 'react'
import { List, X, Lightning } from '@phosphor-icons/react'

export type NavPageType = 'home' | 'features' | 'changelog' | 'security' | 'pricing' | 'blog'

interface NavigationProps {
  currentPage: NavPageType
  onNavigate: (page: NavPageType) => void
  onOpenDemo: () => void
  onOpenLogin: () => void
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  onOpenDemo,
  onOpenLogin,
}) => {
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
    { id: 'security' as const, label: 'Security' },
    { id: 'changelog' as const, label: 'Updates' },
    { id: 'pricing' as const, label: 'Pricing' },
    { id: 'blog' as const, label: 'Blog' },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-black/90 backdrop-blur-md border-b border-[#1c1c1c]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between relative">
          {/* Technical scale indicator */}
          <div className="hidden lg:block absolute left-[-60px] top-1/2 -translate-y-1/2 font-mono text-sm text-[#4d4d4d] select-none pointer-events-none">
            1.00
          </div>

          {/* Logo — W2W Share with Monogram Bracket */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white group-hover:text-[#7089ba] transition-colors">
                <path
                  d="M4 4h5v16H4V4zm11 0h5v16h-5V4z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="2.5" fill="#7089ba" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                W2W Share
              </span>
              <span className="hidden sm:inline-block font-mono text-[9px] text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20 font-medium">
                v2.0 E2EE
              </span>
            </div>
          </button>

          {/* Center Navigation Links (Clean, Uniformly Spaced) */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-sm transition-colors relative py-1 cursor-pointer ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#808080] hover:text-white font-medium'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7089ba]" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 text-sm font-medium text-[#808080] hover:text-white transition-colors rounded-full cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={onOpenDemo}
              className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all border border-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Lightning className="w-3.5 h-3.5" weight="fill" />
              <span>Quick PIN</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-black/95 backdrop-blur-lg md:hidden p-6 flex flex-col justify-between border-b border-[#1c1c1c]">
          <div className="space-y-4">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`block w-full text-left text-lg py-1 ${
                    isActive ? 'text-white font-bold' : 'text-[#808080] hover:text-white font-medium'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-3 pt-6 border-t border-[#1c1c1c]">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenLogin()
              }}
              className="w-full py-2.5 rounded-full border border-[#282828] text-sm text-white hover:bg-[#1c1c1c]"
            >
              Login
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenDemo()
              }}
              className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90"
            >
              Quick PIN Claim
            </button>
          </div>
        </div>
      )}
    </>
  )
}
