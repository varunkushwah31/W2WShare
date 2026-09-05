import React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { QuestionIcon, ShieldCheckIcon, SparkleIcon } from '@phosphor-icons/react'
import type { NavPageType } from '@/components/Navigation'

interface FaqSectionProps {
  onNavigate?: (page: NavPageType) => void
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onNavigate }) => {
  const faqs = [
    {
      id: 'item-1',
      tag: 'OFFLINE MESH',
      question: 'How does W2W Share work with 100% zero internet?',
      answer:
        'W2W Share operates purely on your local network interfaces (Wi-Fi, Ethernet, or Mobile Hotspot). Devices discover each other via UDP multicast beacons on port 8888 and transfer binary chunks directly via local HTTP streaming or WebRTC DataChannels without touching the public internet.',
    },
    {
      id: 'item-2',
      tag: 'E2E CRYPTO',
      question: 'How is end-to-end encryption enforced?',
      answer:
        'Your 6-digit claim PIN is expanded into a 256-bit symmetric key using PBKDF2 (100,000 iterations) and a 16-byte random hardware salt. Files are pre-compressed with Gzip and encrypted chunk-by-chunk with authenticated AES-256-GCM in your browser before transmission.',
    },
    {
      id: 'item-3',
      tag: 'RAM SCRUBBING',
      question: 'What happens during a Burn-After-Reading transfer?',
      answer:
        'When Burn-After-Reading is enabled, the session in-memory buffer references are permanently wiped from host RAM the instant the receiver completes the chunk verification stream. No cached files or plaintext remain on disk or memory.',
    },
    {
      id: 'item-4',
      tag: 'STREAMING ENGINE',
      question: 'Are there any file or batch size limits?',
      answer:
        'No. Because W2W Share uses a 2MB sliding chunk window streamed directly through WebCrypto and Web Streams API, you can transfer multi-gigabyte video files, dataset archives, and entire nested folder trees without browser memory crashes.',
    },
    {
      id: 'item-5',
      tag: 'CROSS-PLATFORM',
      question: 'Does it work between iPhone, Android, Mac, and Windows?',
      answer:
        'Yes. W2W Share is 100% web-standard and runs in any modern browser (Chrome, Safari, Firefox, Edge) with zero software or app installation required. You can also install it as a lightweight Progressive Web App (PWA) on iOS and Android for 1-tap launcher access.',
    },
    {
      id: 'item-6',
      tag: 'NAT / FIREWALL',
      question: 'What happens if direct WebRTC peer-to-peer connection fails?',
      answer:
        'If strict corporate symmetric NATs or router AP isolation prevent direct browser-to-browser WebRTC DataChannels, W2W Share seamlessly falls back to local in-memory WebSocket chunk streaming or the local host HTTP relay without interrupting your transfer.',
    },
  ]

  return (
    <section id="faq" className="w-full max-w-300 mx-auto px-6 py-16 sm:py-20 dashed-container my-12 rounded-2xl bg-void/60">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        {/* Left Column: Heading & Context */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/25 flex items-center gap-1.5 font-medium">
              <QuestionIcon className="w-3.5 h-3.5" />
              <span>QUESTIONS & ANSWERS</span>
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Frequently <br className="hidden sm:inline" />asked questions.
          </h2>

          <p className="text-sm text-steel max-w-sm leading-relaxed">
            Need technical details on cryptographic primitives, UDP port binding, or air-gapped local mesh streaming?
          </p>

          {/* Quick Info Box */}
          <div className="p-4 rounded-xl bg-carbon/60 border border-[#262626] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-[#7089ba]">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>100% Zero-Cloud Guarantee</span>
            </div>
            <p className="text-xs text-steel leading-relaxed">
              Every cryptographic key is derived client-side. No user accounts, telemetries, or logs are uploaded to any external server.
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('guide')}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#7089ba] hover:underline pt-1 cursor-pointer"
              >
                <span>Read in-depth technical documentation</span>
                <SparkleIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: High-Performance Accordion */}
        <div className="lg:col-span-7">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-carbon">
                <AccordionTrigger className="text-white hover:text-white/90 font-medium text-base sm:text-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-left">
                    <span className="font-mono text-[9px] text-[#7089ba] tracking-wider uppercase bg-[#7089ba]/10 border border-[#7089ba]/20 px-2 py-0.5 rounded-md w-fit shrink-0 font-medium">
                      {faq.tag}
                    </span>
                    <span className="text-white font-medium text-sm sm:text-base tracking-tight leading-snug">
                      {faq.question}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-ash leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

