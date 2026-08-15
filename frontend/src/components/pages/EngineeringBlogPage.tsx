import React from 'react'
import { ArrowLeftIcon, BookOpenIcon, ClockIcon, TagIcon, UserIcon } from '@phosphor-icons/react'

interface EngineeringBlogPageProps {
  onBack: () => void
}

export const EngineeringBlogPage: React.FC<EngineeringBlogPageProps> = ({ onBack }) => {
  const articles = [
    {
      id: 'webcrypto-streams',
      title: 'How we achieved 10GB+ in-browser direct-to-disk streams using Web Crypto & CompressionStream',
      excerpt:
        'We bypassed browser heap memory bottlenecks using 2MB chunk pipelining, CompressionStream gzip transforms, and authenticated AES-256-GCM cipher sinks.',
      tag: 'ENGINEERING_BLOG',
      date: 'August 15, 2026',
      readTime: '7 min read',
      author: 'W2W Core Team',
    },
    {
      id: 'udp-subnet-radar',
      title: 'How to send UDP discovery beacons across local networks using IEEE 802.11 UDP broadcast frames',
      excerpt:
        'How we send UDP discovery beacons across local networks using IEEE 802.11 UDP broadcast frames.',
      tag: 'ENGINEERING_BLOG',
      date: 'July 22, 2026',
      readTime: '5 min read',
      author: 'W2W Core Team',
    },
    {
      id: 'ephemeral-burn-mechanics',
      title: 'How we achieved Zero-Knowledge Ephemeral Burn with cryptographic zeroization',
      excerpt:
        'How we achieved zero-knowledge ephemeral burn with cryptographic zeroization of WebCrypto key handles.',
      tag: 'ENGINEERING_BLOG',
      date: 'June 30, 2026',
      readTime: '9 min read',
      author: 'W2W Core Team',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-[1050px] mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20 flex items-center gap-1.5">
          <BookOpenIcon className="w-3.5 h-3.5" />
          <span>W2W BLOG</span>
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          W2W Dispatches
        </h1>
        <p className="text-sm text-[#808080] leading-relaxed">
          W2WShare dispatches contains technical insights and details into the protocol, browser-native cryptographic benchmarks, stream piping, and zero-knowledge threat modeling.
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
                <TagIcon className="w-3 h-3" />
                {art.tag}
              </span>
              <span>·</span>
              <span>{art.date}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
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
              <UserIcon className="w-3.5 h-3.5 text-[#7089ba]" />
              <span>{art.author}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
