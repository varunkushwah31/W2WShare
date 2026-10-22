import React, { useState, useEffect, useRef } from 'react'
import { SendPanel } from './SendPanel'
import { ReceivePanel } from './ReceivePanel'
import { PeerRadarPanel } from './PeerRadarPanel'
import { ClipboardChatPanel } from './ClipboardChatPanel'
import { AuditLedgerPanel } from './AuditLedgerPanel'
import { OfflineNetworkModal } from './OfflineNetworkModal'
import { AirDropModal, type AirDropRequestData } from './AirDropModal'
import { api, getLocalDeviceInfo, getWebSocketUrl, type NetworkInterfaceDto } from '@/lib/api'
import { soundEngine } from '@/lib/sound'
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

  // Global AirDrop Receiver state
  const [incomingAirDrop, setIncomingAirDrop] = useState<AirDropRequestData | null>(null)
  const [airDropModalOpen, setAirDropModalOpen] = useState(false)
  const [airDropModalStatus, setAirDropModalStatus] = useState<'prompt' | 'transferring' | 'completed' | 'declined' | 'error'>('prompt')
  const presenceWsRef = useRef<WebSocket | null>(null)

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }

  // AirDrop Presence and Signal Listener
  useEffect(() => {
    const localDevice = getLocalDeviceInfo()
    api.announcePresence(localDevice).catch(() => {})

    const wsUrl = getWebSocketUrl('/ws/signaling')
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      presenceWsRef.current = ws

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          type: 'REGISTER_DEVICE',
          payload: localDevice,
        }))
      }

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return
        try {
          const signal = JSON.parse(event.data)
          if (signal.type === 'AIRDROP_REQUEST' && signal.payload) {
            const req = signal.payload as AirDropRequestData
            if (!req.targetDeviceId || req.targetDeviceId === localDevice.deviceId) {
              soundEngine.peerConnect()
              setIncomingAirDrop(req)
              setAirDropModalStatus('prompt')
              setAirDropModalOpen(true)
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    const pollTimer = setInterval(async () => {
      try {
        const pending = await api.getPendingAirDropRequests(localDevice.deviceId)
        if (pending && pending.length > 0 && !airDropModalOpen) {
          const firstReq = pending[0] as AirDropRequestData
          soundEngine.peerConnect()
          setIncomingAirDrop(firstReq)
          setAirDropModalStatus('prompt')
          setAirDropModalOpen(true)
        }
      } catch {
        // ignore
      }
    }, 3000)

    return () => {
      clearInterval(pollTimer)
      if (ws) {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
    }
  }, [airDropModalOpen])

  const handleAcceptAirDrop = async () => {
    if (!incomingAirDrop) return
    const localDevice = getLocalDeviceInfo()
    try {
      await api.respondAirDrop({
        sessionId: incomingAirDrop.sessionId,
        targetDeviceId: localDevice.deviceId,
        accepted: true,
      })
      if (presenceWsRef.current?.readyState === WebSocket.OPEN) {
        presenceWsRef.current.send(JSON.stringify({
          type: 'AIRDROP_RESPONSE',
          payload: {
            sessionId: incomingAirDrop.sessionId,
            senderDeviceId: incomingAirDrop.senderDeviceId,
            accepted: true,
          },
        }))
      }
      setAirDropModalOpen(false)
      setActivePin(incomingAirDrop.pin)
      setActiveSessionId(incomingAirDrop.sessionId)
      setActiveTab('receive')
      soundEngine.peerConnect()
    } catch (err) {
      console.error('Failed to accept AirDrop:', err)
    }
  }

  const handleDeclineAirDrop = async () => {
    if (!incomingAirDrop) return
    const localDevice = getLocalDeviceInfo()
    try {
      await api.respondAirDrop({
        sessionId: incomingAirDrop.sessionId,
        targetDeviceId: localDevice.deviceId,
        accepted: false,
      })
      if (presenceWsRef.current?.readyState === WebSocket.OPEN) {
        presenceWsRef.current.send(JSON.stringify({
          type: 'AIRDROP_RESPONSE',
          payload: {
            sessionId: incomingAirDrop.sessionId,
            senderDeviceId: incomingAirDrop.senderDeviceId,
            accepted: false,
          },
        }))
      }
    } catch {
      // ignore
    }
    setAirDropModalStatus('declined')
    setTimeout(() => {
      setAirDropModalOpen(false)
      setIncomingAirDrop(null)
    }, 700)
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
    <section id={id} className="w-full max-w-300 mx-auto px-3 sm:px-6 py-4 sm:py-8 scroll-mt-20 sm:scroll-mt-24">
      {/* Container with Dashed Containment & Cyber-Grid */}
      <div className="dashed-container rounded-2xl bg-void cyber-grid p-3.5 sm:p-10 space-y-6 sm:space-y-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-stipple-grid opacity-20 pointer-events-none" />

        {/* Top Header: Title & Utility Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-periwinkle bg-periwinkle/10 px-2 py-0.5 rounded-full border border-periwinkle/20">
                OFFLINE PEER STUDIO
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] text-steel">
                SPEC: 1.0.0 · AES-256-GCM
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-paper tracking-tight font-sans">
              Encrypted Peer Sharing Terminal
            </h2>
          </div>

          {/* Utility Controls: Network Interface & Mobile Companion */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNetworkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-carbon hover:bg-carbon-hover border border-carbon hover:border-periwinkle/50 text-[10px] sm:text-[11px] font-mono text-steel transition-all cursor-pointer shadow-sm truncate max-w-full"
              title="Click to configure offline sharing: Method 1 (Smartphone Personal Hotspot) or Method 2 (Standard Wi-Fi Router / LAN)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-paper font-semibold truncate">
                {getSharingHubLabel(selectedInterface)}
              </span>
              <span className="text-periwinkle ml-0.5 shrink-0">Config</span>
            </button>

            {onOpenMobileApp && (
              <button
                type="button"
                onClick={onOpenMobileApp}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-periwinkle/10 hover:bg-periwinkle/20 border border-periwinkle/30 hover:border-periwinkle/60 text-[10px] sm:text-[11px] font-mono text-periwinkle transition-all cursor-pointer shadow-sm shrink-0"
                title="Open Mobile Companion QR & PWA Setup"
              >
                <DeviceMobileIcon className="w-3.5 h-3.5 text-periwinkle" />
                <span className="font-semibold">Mobile App</span>
                <span className="text-[9px] bg-periwinkle/20 px-1.5 py-0.2 rounded text-periwinkle font-bold">PWA</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Horizontal Tab Navigation Dock */}
        <div className="border-t border-b border-carbon/80 py-2 sm:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-xl bg-carbon/60 border border-carbon flex-nowrap overflow-x-auto no-scrollbar gap-1 max-w-full touch-pan-x">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeTab === t.id
                    ? 'bg-paper text-void font-semibold shadow-sm'
                    : 'text-steel hover:text-paper hover:bg-carbon-hover'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Telemetry Status Readout */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-steel shrink-0 pr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>RAM_DIRECT</span>
            <span className="text-steel/50">·</span>
            <span className="text-periwinkle">ZERO-CLOUD</span>
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

        {/* Global Apple-Style AirDrop Prompt Modal */}
        <AirDropModal
          isOpen={airDropModalOpen}
          request={incomingAirDrop}
          status={airDropModalStatus}
          onAccept={handleAcceptAirDrop}
          onDecline={handleDeclineAirDrop}
          onClose={() => {
            setAirDropModalOpen(false)
            setIncomingAirDrop(null)
          }}
        />
      </div>

      {/* Mobile Sticky Bottom Quick Dock */}
      <nav aria-label="Mobile Navigation Dock" className="fixed bottom-3 inset-x-3 z-30 sm:hidden bg-[#121212]/90 backdrop-blur-md border border-[#282828] rounded-2xl p-1 shadow-2xl flex items-center justify-around safe-area-bottom">
        {tabs.map((t) => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id)
                const el = document.getElementById(id)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-steel hover:text-white'
              }`}
            >
              {t.icon}
              <span className="text-[9px] font-mono leading-none tracking-tight">
                {t.id === 'send' ? 'Send' : t.id === 'receive' ? 'Receive' : t.id === 'radar' ? 'Radar' : t.id === 'clipboard' ? 'Chat' : 'Ledger'}
              </span>
            </button>
          )
        })}
      </nav>
    </section>
  )
}

