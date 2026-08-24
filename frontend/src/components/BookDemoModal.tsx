import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArrowRightIcon, CheckCircleIcon, LockKeyIcon, KeyIcon, ShieldCheckIcon, UserIcon, EnvelopeIcon, BuildingIcon } from '@phosphor-icons/react'

interface BookDemoModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'demo' | 'login'
}

type TabType = 'pin' | 'demo' | 'login'

const TAB_BADGES: Record<TabType, string> = {
  pin: 'INSTANT DECRYPT',
  demo: 'AIR-GAPPED APPLIANCE',
  login: 'NODE AUTH',
}

const TAB_TITLES: Record<TabType, string> = {
  pin: 'Claim Transfer by PIN',
  demo: 'Deploy On-Premise Node',
  login: 'Local Node Keystore',
}

const TAB_DESCRIPTIONS: Record<TabType, string> = {
  pin: 'Enter the 6-digit claim PIN to decrypt incoming file streams in-browser.',
  demo: 'Request a dedicated air-gapped hardware image for your subnet.',
  login: 'Authenticate using your local device keystore secret.',
}

const TAB_BUTTON_TEXTS: Record<TabType, string> = {
  pin: 'Claim & Decrypt Files',
  demo: 'Request Node Image',
  login: 'Authenticate Node',
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({
  isOpen,
  onClose,
  mode = 'demo',
}) => {
  const [selectedTab, setSelectedTab] = useState<TabType | null>(null)
  const activeTab: TabType = selectedTab ?? (mode === 'login' ? 'login' : 'pin')
  const [submitted, setSubmitted] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    networkType: 'Local Air-Gapped LAN',
  })
  const [loginData, setLoginData] = useState({
    nodeId: '',
    token: '',
  })

  const handleClose = () => {
    setSelectedTab(null)
    setSubmitted(false)
    setPinValue('')
    onClose()
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (activeTab === 'pin') {
      if (pinValue.trim().length === 6) {
        window.location.href = `/?pin=${pinValue.trim()}#workspace`
        handleClose()
        return
      }
    } else if (activeTab === 'login') {
      if (loginData.nodeId.trim()) {
        import('@/lib/auth').then(({ authStore }) => {
          authStore.login(loginData.nodeId.trim(), loginData.token.trim())
        })
      }
    }
    setSubmitted(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md border border-[#222222] bg-[#121212] text-white p-6 sm:p-8 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 mb-2 text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/25 flex items-center gap-1 font-medium">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>{TAB_BADGES[activeTab]}</span>
            </span>
          </div>

          <DialogTitle className="text-2xl font-bold tracking-tight text-white font-sans">
            {TAB_TITLES[activeTab]}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#808080] leading-relaxed">
            {TAB_DESCRIPTIONS[activeTab]}
          </DialogDescription>
        </DialogHeader>

        {/* 3-Way Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-[#000000] rounded-xl border border-[#242424] my-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTab('pin')
              setSubmitted(false)
            }}
            className={`py-2 text-xs font-mono tracking-wide rounded-lg transition-all cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-white text-black font-bold shadow'
                : 'text-[#808080] hover:text-white font-medium'
            }`}
          >
            Claim PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('demo')
              setSubmitted(false)
            }}
            className={`py-2 text-xs font-mono tracking-wide rounded-lg transition-all cursor-pointer ${
              activeTab === 'demo'
                ? 'bg-white text-black font-bold shadow'
                : 'text-[#808080] hover:text-white font-medium'
            }`}
          >
            On-Premise
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('login')
              setSubmitted(false)
            }}
            className={`py-2 text-xs font-mono tracking-wide rounded-lg transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-black font-bold shadow'
                : 'text-[#808080] hover:text-white font-medium'
            }`}
          >
            Node Auth
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#7089ba]/20 text-[#7089ba] flex items-center justify-center mx-auto border border-[#7089ba]/40">
              <CheckCircleIcon className="w-6 h-6" weight="bold" />
            </div>
            <h4 className="text-base font-bold text-white font-sans">
              {activeTab === 'demo' ? 'Appliance Request Registered' : 'Authentication Confirmed'}
            </h4>
            <p className="text-xs text-[#808080] max-w-xs mx-auto leading-relaxed">
              {activeTab === 'demo'
                ? 'Our systems engineer will deliver your air-gapped subnet appliance documentation.'
                : 'Local hardware node credentials verified.'}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 px-6 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Tab 1: Claim PIN */}
            {activeTab === 'pin' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="claim-pin-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    6-Digit Claim PIN
                  </label>
                  <div className="relative flex items-center">
                    <KeyIcon className="w-5 h-5 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="claim-pin-input"
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      placeholder="e.g. 849201"
                      value={pinValue}
                      onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                      className="w-full py-3 pl-11 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-base font-mono tracking-[0.2em] text-white placeholder-[#4d4d4d] transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#000000] border border-[#202020] text-xs font-mono text-[#808080] flex items-center justify-between">
                  <span>CRYPTO CIPHER:</span>
                  <span className="text-white font-medium">AES-256-GCM / PBKDF2</span>
                </div>
              </div>
            )}

            {/* Tab 2: On-Premise */}
            {activeTab === 'demo' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="lead-engineer-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    Lead Engineer
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="lead-engineer-input"
                      type="text"
                      required
                      placeholder="Alex Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white placeholder-[#4d4d4d] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="work-email-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    Work Email
                  </label>
                  <div className="relative flex items-center">
                    <EnvelopeIcon className="w-4 h-4 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="work-email-input"
                      type="email"
                      required
                      placeholder="engineer@defense-lab.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white placeholder-[#4d4d4d] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="organization-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    Organization / Node Subnet
                  </label>
                  <div className="relative flex items-center">
                    <BuildingIcon className="w-4 h-4 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="organization-input"
                      type="text"
                      required
                      placeholder="Air-Gapped Systems Cluster"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white placeholder-[#4d4d4d] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Node Auth */}
            {activeTab === 'login' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="node-id-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    Node ID / Device Address
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="node-id-input"
                      type="text"
                      required
                      placeholder="node-01.w2w.local"
                      value={loginData.nodeId}
                      onChange={(e) => setLoginData({ ...loginData, nodeId: e.target.value })}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white placeholder-[#4d4d4d] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="keystore-secret-input" className="block text-[11px] font-mono uppercase text-[#808080] tracking-wider">
                    Hardware Keystore Secret Token
                  </label>
                  <div className="relative flex items-center">
                    <LockKeyIcon className="w-4 h-4 text-[#7089ba] absolute left-3.5 pointer-events-none" />
                    <input
                      id="keystore-secret-input"
                      type="password"
                      required
                      placeholder="••••••••••••••••"
                      value={loginData.token}
                      onChange={(e) => setLoginData({ ...loginData, token: e.target.value })}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#000000] border border-[#2a2a2a] focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white placeholder-[#4d4d4d] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Pill Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 mt-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 flex items-center justify-center gap-2 transition-all group cursor-pointer shadow-md"
            >
              <span>{TAB_BUTTON_TEXTS[activeTab]}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#808080] pt-1">
              <LockKeyIcon className="w-3 h-3 text-[#7089ba]" />
              <span>100% OFFLINE · ZERO INTERNET REQUIRED</span>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
