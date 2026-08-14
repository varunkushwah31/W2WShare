import React, { useState } from 'react'
import { SendPanel } from './SendPanel'
import { ReceivePanel } from './ReceivePanel'
import { PeerRadarPanel } from './PeerRadarPanel'
import { ClipboardChatPanel } from './ClipboardChatPanel'
import { AuditLedgerPanel } from './AuditLedgerPanel'
import {
  UploadSimple,
  DownloadSimple,
  Broadcast,
  ClipboardText,
  ShieldCheck,
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

  const tabs = [
    {
      id: 'send' as const,
      label: 'Send Files',
      icon: <UploadSimple className="w-4 h-4" />,
    },
    {
      id: 'receive' as const,
      label: 'Receive Vault',
      icon: <DownloadSimple className="w-4 h-4" />,
    },
    {
      id: 'radar' as const,
      label: 'Subnet Radar',
      icon: <Broadcast className="w-4 h-4 text-[#7089ba]" />,
    },
    {
      id: 'clipboard' as const,
      label: 'Clipboard & Chat',
      icon: <ClipboardText className="w-4 h-4" />,
    },
    {
      id: 'ledger' as const,
      label: 'Audit Ledger',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ]

  return (
    <section id={id} className="w-full max-w-[1200px] mx-auto px-6 py-12">
      {/* Container with Dashed Containment */}
      <div className="dashed-container rounded-2xl bg-[#000000] p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Top Header & Tab Navigation Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#1c1c1c] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded-full border border-[#7089ba]/20">
                OFFLINE PEER STUDIO
              </span>
              <span className="font-mono text-[10px] text-[#808080]">
                SPEC: 1.00 · AES-256-GCM
              </span>
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
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
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

        {/* Tab Viewport */}
        <div className="transition-all duration-200">
          {activeTab === 'send' && <SendPanel />}
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
      </div>
    </section>
  )
}
