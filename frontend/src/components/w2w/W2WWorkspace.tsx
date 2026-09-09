import React, { useState, useEffect } from 'react'
import { SendPanel } from './SendPanel'
import { ReceivePanel } from './ReceivePanel'
import { PeerRadarPanel } from './PeerRadarPanel'
import { ClipboardChatPanel } from './ClipboardChatPanel'
import { AuditLedgerPanel } from './AuditLedgerPanel'
import { OfflineNetworkModal } from './OfflineNetworkModal'
import { api, type NetworkInterfaceDto } from '@/lib/api'
import {
  UploadSimpleIcon,
  DownloadSimpleIcon,
  BroadcastIcon,
  ClipboardTextIcon,
  ShieldCheckIcon,
  DeviceMobileIcon,
} from '@phosphor-icons/react'

export type W2WTabType = 'send' | 'receive' | 'radar' | 'clipboard' | 'ledger'

interface W2WWorkspaceProps {
  initialTab?: W2WTabType
  id?: string
  onOpenMobileApp?: () => void
}

function getSharingHubLabel(iface: NetworkInterfaceDto | null): string {
  if (!iface?.ip) {
    return 'Offline Sharing Hub (Method 1 & 2)'
  }
  const method = iface.interfaceType === 'HOTSPOT' ? 'Method 1 (Hotspot)' : 'Method 2 (Router)'
  return `${method}: ${iface.ip}`
}

export const W2WWorkspace: React.FC<W2WWorkspaceProps> = ({
  initialTab = 'send',
  id = 'workspace',
  onOpenMobileApp,
}) => {
  const [activeTab, setActiveTab] = useState<W2WTabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('pin') || params.get('code') || params.get('mode') === 'receiver') {
        return 'receive'
      }
    }
    return initialTab
  })
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterfaceDto | null>(null)
  const [targetPeer, setTargetPeer] = useState<import('@/lib/api').DiscoveredPeer | null>(null)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }

  useEffect(() => {
    api.getNetworkInfo().then((net) => {
      if (net?.interfaces && net.interfaces.length > 0) {
        const preferred = net.interfaces.find((i) => !i.isLoopback) || net.interfaces[0]
        setSelectedInterface(preferred)
      }
    }).catch(() => {})
  }, [])

  const tabs = [
    {
      id: 'send' as const,
      label: 'Send Files',
      icon: <UploadSimpleIcon className="w-4 h-4" />,
    },
    {
      id: 'receive' as const,
      label: 'Receive Vault',
      icon: <DownloadSimpleIcon className="w-4 h-4" />,
    },
    {
      id: 'radar' as const,
      label: 'Subnet Radar',
      icon: <BroadcastIcon className="w-4 h-4 text-[#7089ba]" />,
    },
    {
      id: 'clipboard' as const,
      label: 'Clipboard & Chat',
      icon: <ClipboardTextIcon className="w-4 h-4" />,
    },
    {
      id: 'ledger' as const,
      label: 'Audit Ledger',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
    },
  ]

  return (
    <section id={id} className="w-full max-w-300 mx-auto px-6 py-8">
      {/* Container with Dashed Containment & Cyber-Grid */}
      <div className="dashed-container rounded-2xl bg-void cyber-grid p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Top Header: Title & Utility Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                OFFLINE PEER STUDIO
              </span>
              <span className="font-mono text-[10px] text-steel">
                SPEC: 1.0.0 · AES-256-GCM
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              Encrypted Peer Sharing Terminal
            </h2>
          </div>

          {/* Utility Controls: Network Interface & Mobile Companion */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsNetworkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#7089ba]/50 text-[11px] font-mono text-[#aaa] transition-all cursor-pointer shadow-sm"
              title="Click to configure offline sharing: Method 1 (Smartphone Personal Hotspot) or Method 2 (Standard Wi-Fi Router / LAN)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-semibold">
                {getSharingHubLabel(selectedInterface)}
              </span>
              <span className="text-[#7089ba] ml-0.5">⚙ Config</span>
            </button>

            {onOpenMobileApp && (
              <button
                type="button"
                onClick={onOpenMobileApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7089ba]/10 hover:bg-[#7089ba]/20 border border-[#7089ba]/30 hover:border-[#7089ba]/60 text-[11px] font-mono text-[#7089ba] transition-all cursor-pointer shadow-sm"
                title="Open Mobile Companion QR & PWA Setup"
              >
                <DeviceMobileIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                <span className="font-semibold">Mobile Client</span>
                <span className="text-[9px] bg-[#7089ba]/20 px-1.5 py-0.5 rounded text-[#7089ba] font-bold">PWA</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Horizontal Tab Navigation Dock (Never Wraps Awkwardly) */}
        <div className="border-t border-b border-carbon/80 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 rounded-xl bg-[#141414] border border-[#242424] flex-nowrap overflow-x-auto no-scrollbar gap-1 max-w-full">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeTab === t.id
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-steel hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Telemetry Status Readout */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-steel shrink-0 pr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>RAM_DIRECT</span>
            <span className="text-[#333]">·</span>
            <span className="text-[#7089ba]">ZERO-CLOUD</span>
          </div>
        </div>

        {/* Tab Viewport - SendPanel / Receive / Radar is immediately visible with zero clutter */}
        <div className="transition-all duration-200">
          {activeTab === 'send' && (
            <SendPanel
              selectedInterface={selectedInterface}
              targetPeer={targetPeer}
              onClearTargetPeer={() => setTargetPeer(null)}
              onSessionCreated={(sId, p) => {
                setActiveSessionId(sId)
                setActivePin(p)
              }}
            />
          )}
          {activeTab === 'receive' && (
            <ReceivePanel
              selectedInterface={selectedInterface}
              onSessionJoined={(sId, p) => {
                setActiveSessionId(sId)
                setActivePin(p)
              }}
              onSwitchToSend={() => setActiveTab('send')}
            />
          )}
          {activeTab === 'radar' && (
            <PeerRadarPanel
              selectedInterface={selectedInterface}
              onSelectedInterfaceChange={setSelectedInterface}
              onSelectPeer={(peer) => {
                setTargetPeer(peer)
                setActiveTab('send')
              }}
            />
          )}
          {activeTab === 'clipboard' && (
            <ClipboardChatPanel
              initialSessionId={activeSessionId}
              initialPin={activePin}
              onSessionTerminated={() => {
                setActiveSessionId(null)
                setActivePin(null)
              }}
            />
          )}
          {activeTab === 'ledger' && (
            <AuditLedgerPanel
              onSwitchToSend={() => setActiveTab('send')}
              onSwitchToReceive={() => setActiveTab('receive')}
            />
          )}
        </div>

        {/* Dedicated Offline & Campus Network Configuration Modal */}
        <OfflineNetworkModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
          selectedInterface={selectedInterface}
          onSelectedInterfaceChange={setSelectedInterface}
        />
      </div>
    </section>
  )
}

