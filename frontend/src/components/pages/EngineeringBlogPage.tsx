import React from 'react'
import { ArrowLeft, BookOpen, Clock, Tag, User } from '@phosphor-icons/react'

interface EngineeringBlogPageProps {
  onBack: () => void
}

export const EngineeringBlogPage: React.FC<EngineeringBlogPageProps> = ({ onBack }) => {
  const articles = [
    {
      id: 'webcrypto-streams',
      title: 'Building 10GB+ In-Browser Direct-to-Disk Streams with Web Crypto & CompressionStream',
      excerpt:
        'How we bypassed browser heap memory bottlenecks using 2MB chunk pipelining, CompressionStream gzip transforms, and authenticated AES-256-GCM cipher sinks.',
      tag: 'SYSTEMS ARCHITECTURE',
      date: 'August 10, 2026',
      readTime: '7 min read',
      author: 'W2W Cryptographic Team',
    },
    {
      id: 'udp-subnet-radar',
      title: 'Why Subnet UDP Multicast Beacons Beat Bluetooth LE for Local Offline Discovery',
      excerpt:
        'Comparing IEEE 802.11 UDP broadcast frames against Bluetooth GATT service advertisements on latency, cross-platform OS permissions, and Wi-Fi hotspot throughput.',
      tag: 'NETWORKING',
      date: 'July 22, 2026',
      readTime: '5 min read',
      author: 'Distributed Systems Lab',
    },
    {
      id: 'ephemeral-burn-mechanics',
      title: 'Zero-Knowledge Ephemeral Burn: Memory Deallocation at the Hardware Edge',
      excerpt:
        'A formal verification of single-claim session destruction, cryptographic zeroization of WebCrypto key handles, and immutable SHA-256 ledger signing.',
      tag: 'CRYPTOGRAPHY',
      date: 'June 30, 2026',
      readTime: '9 min read',
      author: 'Security Research Group',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-[1050px] mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>ENGINEERING DISPATCHES · BLOG</span>
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          Engineering & Cryptographic Dispatches
        </h1>
        <p className="text-sm text-[#808080] leading-relaxed">
          Deep dives into local subnet protocols, browser-native cryptographic benchmarks, stream piping, and zero-knowledge threat modeling.
        </p>
      </div>

      {/* Articles List */}
      <div className="space-y-6">
        {articles.map((art) => (
          <article
            key={art.id}
            className="p-7 rounded-2xl bg-[#141414] border border-[#1c1c1c] hover:border-[#2a2a2a] transition-all space-y-4 group cursor-default"
          >
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#808080]">
              <span className="inline-flex items-center gap-1 text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20">
                <Tag className="w-3 h-3" />
                {art.tag}
              </span>
              <span>·</span>
              <span>{art.date}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {art.readTime}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white font-sans group-hover:text-[#7089ba] transition-colors">
              {art.title}
            </h2>

            <p className="text-xs text-[#808080] leading-relaxed font-sans">
              {art.excerpt}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#ababab]">
              <User className="w-3.5 h-3.5 text-[#7089ba]" />
              <span>{art.author}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
