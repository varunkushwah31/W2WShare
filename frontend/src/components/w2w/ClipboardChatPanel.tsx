import React, { useState, useEffect } from 'react'
import { api, type ChatMessage } from '@/lib/api'
import { soundEngine } from '@/lib/sound'
import {
  ClipboardText,
  PaperPlaneRight,
  Copy,
  Check,
  LockKey,
  ArrowsClockwise,
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
  const [clipboardText, setClipboardText] = useState('')
  const [copied, setCopied] = useState(false)
  const [syncingClip, setSyncingClip] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [senderRole, setSenderRole] = useState<'Sender' | 'Receiver'>('Sender')

  // Auto poll chat & clipboard if session exists
  useEffect(() => {
    if (!sessionId) return
    const poll = async () => {
      try {
        const [chatHistory, clipData] = await Promise.all([
          api.getChatHistory(sessionId),
          api.getClipboard(sessionId),
        ])
        setMessages(chatHistory)
        if (clipData.text && !clipboardText) {
          setClipboardText(clipData.text)
        }
      } catch {
        // Session might not have messages yet
      }
    }

    poll()
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [sessionId, clipboardText])

  const handlePushClipboard = async () => {
    if (!clipboardText.trim()) return
    setSyncingClip(true)
    try {
      let targetSession = sessionId
      if (!targetSession) {
        const res = await api.createSession({ expiresInSeconds: 900 })
        targetSession = res.sessionId
        setSessionId(res.sessionId)
        setPin(res.pin)
      }
      await api.saveClipboard(targetSession, clipboardText)
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
      }
      soundEngine.peerConnect()
    } catch {
      soundEngine.errorTone()
    } finally {
      setSyncingClip(false)
    }
  }

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(clipboardText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    try {
      let targetSession = sessionId
      if (!targetSession) {
        const res = await api.createSession({ expiresInSeconds: 1800 })
        targetSession = res.sessionId
        setSessionId(res.sessionId)
        setPin(res.pin)
      }

      const msg = await api.addChatMessage(targetSession, chatInput, senderRole)
      setMessages((prev) => [...prev, msg])
      setChatInput('')
      soundEngine.chatMsg()
    } catch {
      soundEngine.errorTone()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Encrypted Clipboard Sync */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div className="flex items-center gap-2">
              <ClipboardText className="w-5 h-5 text-[#7089ba]" weight="duotone" />
              <h4 className="text-base font-bold text-white font-sans">
                Zero-Knowledge Clipboard
              </h4>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#7089ba] bg-[#7089ba]/10 px-2 py-0.5 rounded border border-[#7089ba]/20">
              <LockKey className="w-3 h-3" />
              <span>E2EE SYNC</span>
            </div>
          </div>

          <p className="text-xs text-[#808080]">
            Paste API tokens, SSH keys, passwords, or snippets. Synchronizes securely across devices on your local network.
          </p>

          <textarea
            rows={8}
            placeholder="Paste or type confidential text here..."
            value={clipboardText}
            onChange={(e) => setClipboardText(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#000000] border border-[#242424] focus:border-[#7089ba] focus:outline-none text-xs font-mono text-white placeholder-[#4d4d4d] leading-relaxed resize-none transition-colors"
          />
        </div>

        <div className="space-y-3 pt-2">
          {sessionId && pin && (
            <div className="flex items-center justify-between text-xs font-mono text-[#808080] px-1">
              <span>SYNC PIN: <strong className="text-white tracking-widest">{pin}</strong></span>
              <span className="truncate max-w-[140px]">ID: {sessionId.slice(0, 8)}...</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePushClipboard}
              disabled={syncingClip || !clipboardText.trim()}
              className="flex-1 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {syncingClip ? (
                <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LockKey className="w-3.5 h-3.5" />
              )}
              <span>Push to Local Network</span>
            </button>

            <button
              onClick={handleCopyClipboard}
              disabled={!clipboardText.trim()}
              className="px-3 py-2 rounded-full border border-[#282828] text-white text-xs hover:border-white disabled:opacity-50 transition-all flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#7089ba]" weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {sessionId && (
              <button
                onClick={handleFetchClipboard}
                className="p-2 rounded-full border border-[#282828] text-white hover:border-white text-xs transition-colors"
                title="Fetch Latest from Server"
              >
                <ArrowsClockwise className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ephemeral In-Session Encrypted Chat */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-[#1c1c1c] space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white font-sans">
                Ephemeral Peer Chat
              </h4>
            </div>

            {/* Role switch */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#000000] border border-[#242424] text-[10px] font-mono">
              <button
                onClick={() => setSenderRole('Sender')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  senderRole === 'Sender' ? 'bg-white text-black font-semibold' : 'text-[#808080]'
                }`}
              >
                Sender
              </button>
              <button
                onClick={() => setSenderRole('Receiver')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  senderRole === 'Receiver' ? 'bg-white text-black font-semibold' : 'text-[#808080]'
                }`}
              >
                Receiver
              </button>
            </div>
          </div>

          {/* Messages timeline */}
          <div className="h-48 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[#000000] border border-[#242424]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#4d4d4d] text-xs">
                <span>No messages yet.</span>
                <span className="text-[10px] text-[#333333]">Send a message to start live peer ledger.</span>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-lg max-w-[85%] text-xs ${
                    m.senderRole === senderRole
                      ? 'ml-auto bg-[#1c1c1c] text-white border border-[#2a2a2a]'
                      : 'mr-auto bg-[#7089ba]/15 text-white border border-[#7089ba]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] text-[#808080] font-mono mb-1">
                    <span>{m.senderRole}</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="break-words leading-relaxed">{m.content}</div>
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
            className="flex-1 bg-[#000000] border border-[#242424] focus:border-[#7089ba] focus:outline-none rounded-full px-4 py-2 text-xs text-white placeholder-[#4d4d4d] transition-colors"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
          >
            <PaperPlaneRight className="w-3.5 h-3.5" weight="bold" />
          </button>
        </form>
      </div>
    </div>
  )
}
