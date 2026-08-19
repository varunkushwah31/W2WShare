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
} from '@phosphor-icons/react'

export type W2WTabType = 'send' | 'receive' | 'radar' | 'clipboard' | 'ledger'

interface W2WWorkspaceProps {
  initialTab?: W2WTabType
  id?: string
}

export const W2WWorkspace: React.FC<W2WWorkspaceProps> = ({
  initialTab = 'send',
  id = 'workspace',
}) => {
  const [activeTab, setActiveTab] = useState<W2WTabType>(initialTab)
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterfaceDto | null>(null)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)

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
    <section id={id} className="w-full max-w-[1200px] mx-auto px-6 py-8">
      {/* Container with Dashed Containment */}
      <div className="dashed-container rounded-2xl bg-[#000000] p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Top Header & Tab Navigation Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#1c1c1c] pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                OFFLINE PEER STUDIO
              </span>
              <span className="font-mono text-[10px] text-[#808080]">
                SPEC: 1.00 · AES-256-GCM
              </span>
              <button
                type="button"
                onClick={() => setIsNetworkModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#161616] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#7089ba]/50 text-[10px] font-mono text-[#aaa] transition-all cursor-pointer"
                title="Click to configure network adapter or switch between College Wi-Fi and Hotspot modes"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-semibold">
                  {selectedInterface?.ip ? `${selectedInterface.displayName || selectedInterface.name}: ${selectedInterface.ip}` : 'Offline Network Hub'}
                </span>
                <span className="text-[#7089ba] ml-0.5">⚙ Config</span>
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              Encrypted Peer Sharing Terminal
            </h2>
          </div>

          {/* Navigation Pill Buttons */}
          <div className="flex flex-wrap items-center p-1 rounded-full bg-[#141414] border border-[#242424] self-stretch md:self-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-[#808080] hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Viewport - SendPanel / Receive / Radar is immediately visible with zero clutter */}
        <div className="transition-all duration-200">
          {activeTab === 'send' && <SendPanel selectedInterface={selectedInterface} />}
          {activeTab === 'receive' && <ReceivePanel />}
          {activeTab === 'radar' && (
            <PeerRadarPanel
              onSelectPeer={() => {
                setActiveTab('send')
              }}
            />
          )}
          {activeTab === 'clipboard' && <ClipboardChatPanel />}
          {activeTab === 'ledger' && <AuditLedgerPanel />}
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

