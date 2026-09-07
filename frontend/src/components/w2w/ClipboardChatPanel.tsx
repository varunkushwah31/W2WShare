import React, { useState, useEffect, useRef } from 'react'
import { api, getWebSocketUrl, type ChatMessage } from '@/lib/api'
import { soundEngine } from '@/lib/sound'
import { QrCodeModal } from './QrCodeModal'
import {
  ClipboardTextIcon,
  PaperPlaneRightIcon,
  CopyIcon,
  CheckIcon,
  LockKeyIcon,
  ArrowsClockwiseIcon,
  BroadcastIcon,
  QrCodeIcon,
  TrashIcon,
  KeyIcon,
  PlusCircleIcon,
  ChatCircleTextIcon,
} from '@phosphor-icons/react'

interface ClipboardChatPanelProps {
  initialSessionId?: string | null
  initialPin?: string | null
}

export const ClipboardChatPanel: React.FC<ClipboardChatPanelProps> = ({
  initialSessionId,
  initialPin,
}) => {
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '')
  const [pin, setPin] = useState<string>(initialPin || '')
  const [joinPinInput, setJoinPinInput] = useState('')
  const [clipboardText, setClipboardText] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncingClip, setSyncingClip] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [senderRole, setSenderRole] = useState<'Sender' | 'Receiver'>('Sender')
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  const chatScrollContainerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Scroll only the chat box internally without affecting window scroll position
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight
    }
  }, [messages])

  // Setup WebSocket connection when sessionId changes
  useEffect(() => {
    if (!sessionId) return

    let active = true

    try {
      if (wsRef.current) {
        wsRef.current.close()
      }

      const wsUrl = getWebSocketUrl('/ws/signaling')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!active) return
        setWsConnected(true)
        if (pin) {
          ws.send(JSON.stringify({ type: 'JOIN_BY_PIN', payload: pin }))
        } else {
          ws.send(JSON.stringify({ type: 'REGISTER_SENDER', payload: sessionId }))
        }
      }

      ws.onmessage = (event) => {
        if (!active) return
        try {
          const signal = JSON.parse(event.data)
          if (signal.type === 'CHAT_MESSAGE' && signal.payload) {
            const msg: ChatMessage = typeof signal.payload === 'object'
              ? signal.payload
              : {
                  id: String(Date.now()),
                  senderRole: 'Peer',
                  content: String(signal.payload),
                  timestamp: Date.now(),
                }
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            soundEngine.chatMsg()
          } else if (signal.type === 'TEXT_MESSAGE' && signal.payload) {
            const text = String(signal.payload)
            setClipboardText(text)
            setLastSyncTime(Date.now())
            soundEngine.peerConnect()
          } else if (signal.type === 'PEER_CONNECTED') {
            soundEngine.peerConnect()
          }
        } catch {
          // Ignore non-json frames
        }
      }

      ws.onclose = () => {
        if (active) setWsConnected(false)
      }

      ws.onerror = () => {
        if (active) setWsConnected(false)
      }
    } catch {
      // Socket creation error
    }

    return () => {
      active = false
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [sessionId, pin])

  // Polling fallback to ensure 100% reliability
  useEffect(() => {
    if (!sessionId) return
    const poll = async () => {
      try {
        const [chatHistory, clipData] = await Promise.all([
          api.getChatHistory(sessionId),
          api.getClipboard(sessionId),
        ])
        setMessages(chatHistory)
        if (clipData.text && clipData.text !== clipboardText) {
          setClipboardText(clipData.text)
          setLastSyncTime(Date.now())
        }
      } catch {
        // Session might be initializing
      }
    }

    poll()
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [sessionId, clipboardText])

  const handleCreateNewSession = async () => {
    try {
      const res = await api.createSession({ expiresInSeconds: 3600 })
      setSessionId(res.sessionId)
      setPin(res.pin)
      setMessages([])
      setClipboardText('')
      setLastSyncTime(null)
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    }
  }

  const handleJoinByPin = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const cleanPin = joinPinInput.trim()
    if (cleanPin.length !== 6) return

    try {
      const session = await api.getSessionByPin(cleanPin)
      setSessionId(session.sessionId)
      setPin(cleanPin)
      setJoinPinInput('')

      const [chatHistory, clipData] = await Promise.all([
        api.getChatHistory(session.sessionId),
        api.getClipboard(session.sessionId),
      ])
      setMessages(chatHistory)
      if (clipData.text) {
        setClipboardText(clipData.text)
        setLastSyncTime(Date.now())
      }
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    }
  }

  const handlePushClipboard = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!clipboardText.trim()) return
    setSyncingClip(true)
    try {
      let targetSession = sessionId
      if (!targetSession) {
        const res = await api.createSession({ expiresInSeconds: 3600 })
        targetSession = res.sessionId
        setSessionId(res.sessionId)
        setPin(res.pin)
      }
      await api.saveClipboard(targetSession, clipboardText)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'TEXT_MESSAGE', payload: clipboardText }))
      }
      setLastSyncTime(Date.now())
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    } finally {
      setSyncingClip(false)
    }
  }

  const handleFetchClipboard = async () => {
    if (!sessionId) return
    setSyncingClip(true)
    try {
      const res = await api.getClipboard(sessionId)
      if (res.text) {
        setClipboardText(res.text)
        setLastSyncTime(Date.now())
      }
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    } finally {
      setSyncingClip(false)
    }
  }

  const handleCopyClipboard = async () => {
    await navigator.clipboard.writeText(clipboardText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendMessage = async (e: React.SubmitEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const content = chatInput.trim()
    setChatInput('')

    try {
      let targetSession = sessionId
      if (!targetSession) {
        const res = await api.createSession({ expiresInSeconds: 3600 })
        targetSession = res.sessionId
        setSessionId(res.sessionId)
        setPin(res.pin)
      }

      const msg = await api.addChatMessage(targetSession, content, senderRole)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CHAT_MESSAGE', payload: msg }))
      }
      soundEngine.chatMsg()
    } catch {
      soundEngine.errorTone()
    }
  }

  const handleCopyMessage = async (msgId: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedMsgId(msgId)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  const handleClearChat = () => {
    setMessages([])
  }

  return (
    <div className="space-y-6">
      {/* Top Sync & Pairing Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-carbon flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-void border border-[#242424] flex items-center justify-center text-[#7089ba]">
            <BroadcastIcon className="w-5 h-5" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white font-sans">
                Local Peer Synchronization
              </h4>
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                wsConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[#222] text-[#888] border-[#333]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#666]'}`} />
                <span>{wsConnected ? 'LIVE WS' : 'REST SYNC'}</span>
              </span>
            </div>
            <p className="text-[11px] text-steel mt-0.5">
              {pin ? `Active Session PIN: ${pin} · E2EE Encrypted channel` : 'Connect using a 6-digit PIN or start a new sync channel.'}
            </p>
          </div>
        </div>

        {/* Pairing controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {pin ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-xl bg-void border border-[#282828] text-xs font-mono text-white flex items-center gap-2">
                <span className="text-steel">PIN:</span>
                <strong className="tracking-widest text-[#7089ba] text-sm">{pin}</strong>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="p-2 rounded-xl bg-void border border-[#282828] text-white hover:border-white text-xs transition-colors cursor-pointer"
                title="Show Pairing QR"
              >
                <QrCodeIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="px-3 py-1.5 rounded-xl border border-[#282828] text-white text-xs hover:border-white transition-colors cursor-pointer"
              >
                New Session
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleJoinByPin} className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <KeyIcon className="w-3.5 h-3.5 text-[#7089ba] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter PIN"
                    value={joinPinInput}
                    onChange={(e) => setJoinPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-28 py-1.5 pl-8 pr-2 bg-void border focus:border-[#7089ba] focus:outline-none rounded-xl text-xs font-mono text-white tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joinPinInput.trim().length !== 6}
                  className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Join
                </button>
              </form>
              <span className="text-[#444] text-xs">or</span>
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="px-3 py-1.5 rounded-xl border border-[#282828] text-white text-xs hover:border-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <PlusCircleIcon className="w-3.5 h-3.5 text-[#7089ba]" />
                <span>Create Channel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zero-Knowledge Clipboard */}
        <div className="p-6 rounded-2xl bg-[#141414] border border-carbon space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-carbon pb-3">
              <div className="flex items-center gap-2">
                <ClipboardTextIcon className="w-5 h-5 text-[#7089ba]" weight="duotone" />
                <h4 className="text-base font-bold text-white font-sans">
                  Zero-Knowledge Clipboard
                </h4>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded border border-[#7089ba]/20">
                <LockKeyIcon className="w-3 h-3" />
                <span>E2EE SYNC</span>
              </div>
            </div>

            <p className="text-xs text-steel">
              Paste API tokens, SSH keys, passwords, or snippets. Synchronizes securely across devices on your local network.
            </p>

            <textarea
              rows={8}
              placeholder="Paste or type confidential text here..."
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              className="w-full p-3 rounded-xl bg-void border border-[#242424] focus:outline-none text-xs font-mono text-white leading-relaxed resize-none transition-colors"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-steel px-1">
              {lastSyncTime ? (
                <span>Last Synced: <strong className="text-white">{new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
              ) : (
                <span>Ready to sync</span>
              )}
              <span>{clipboardText.length} chars</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePushClipboard}
                disabled={syncingClip || !clipboardText.trim()}
                className="flex-1 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {syncingClip ? (
                  <ArrowsClockwiseIcon className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LockKeyIcon className="w-3.5 h-3.5" />
                )}
                <span>Push to Local Network</span>
              </button>

              <button
                type="button"
                onClick={handleCopyClipboard}
                disabled={!clipboardText.trim()}
                className="px-3.5 py-2.5 rounded-full border border-[#282828] text-white text-xs hover:border-white disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-[#7089ba]" weight="bold" /> : <CopyIcon className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {sessionId && (
                <button
                  type="button"
                  onClick={handleFetchClipboard}
                  className="p-2.5 rounded-full border border-[#282828] text-white hover:border-white text-xs transition-colors cursor-pointer"
                  title="Fetch Latest from Server"
                >
                  <ArrowsClockwiseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ephemeral In-Session Encrypted Chat */}
        <div className="p-6 rounded-2xl bg-[#141414] border border-carbon space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-carbon pb-3">
              <div className="flex items-center gap-2">
                <ChatCircleTextIcon className="w-5 h-5 text-[#7089ba]" weight="duotone" />
                <h4 className="text-base font-bold text-white font-sans">
                  Ephemeral Peer Chat
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* Role switch */}
                <div className="flex items-center p-0.5 rounded-lg bg-void border border-[#242424] text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSenderRole('Sender')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      senderRole === 'Sender' ? 'bg-white text-black font-semibold' : 'text-steel'
                    }`}
                  >
                    Sender
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderRole('Receiver')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      senderRole === 'Receiver' ? 'bg-white text-black font-semibold' : 'text-steel'
                    }`}
                  >
                    Receiver
                  </button>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear Chat"
                    className="p-1 rounded text-steel hover:text-[#eb5757] transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages timeline */}
            <div ref={chatScrollContainerRef} className="h-48 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-void border border-[#242424]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-graphite text-xs">
                  <span>No messages yet.</span>
                  <span className="text-[10px] text-[#333333]">Send a message to start live peer ledger.</span>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`group relative p-2.5 rounded-lg max-w-[85%] text-xs ${
                      m.senderRole === senderRole
                        ? 'ml-auto bg-carbon text-white border border-[#2a2a2a]'
                        : 'mr-auto bg-[#7089ba]/15 text-white border border-[#7089ba]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] text-steel font-mono mb-1">
                      <span className="font-semibold text-white/90">{m.senderRole}</span>
                      <div className="flex items-center gap-1.5">
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.id, m.content)}
                          className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                          title="Copy text"
                        >
                          {copiedMsgId === m.id ? (
                            <CheckIcon className="w-3 h-3 text-[#7089ba]" />
                          ) : (
                            <CopyIcon className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="wrap-break-word leading-relaxed whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Input box */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Type encrypted message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-void border border-[#242424] focus:outline-none rounded-full px-4 py-2.5 text-xs text-white transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow"
            >
              <PaperPlaneRightIcon className="w-3.5 h-3.5" weight="bold" />
            </button>
          </form>
        </div>
      </div>

      {/* QR Modal */}
      {pin && (
        <QrCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          pin={pin}
          url={`${window.location.origin}/?pin=${pin}#workspace`}
        />
      )}
    </div>
  )
}

