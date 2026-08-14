import React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      id: 'item-1',
      question: 'How does W2W Share work with 100% zero internet?',
      answer:
        'W2W Share operates purely on your local network interfaces (Wi-Fi, Ethernet, or Mobile Hotspot). Devices discover each other via UDP multicast beacons on port 8888 and transfer binary chunks directly via local HTTP streaming or WebRTC DataChannels without touching the public internet.',
    },
    {
      id: 'item-2',
      question: 'How is end-to-end encryption enforced?',
      answer:
        'Your 6-digit claim PIN is expanded into a 256-bit symmetric key using PBKDF2 (100,000 iterations) and a 16-byte random hardware salt. Files are pre-compressed with Gzip and encrypted chunk-by-chunk with authenticated AES-256-GCM in your browser before transmission.',
    },
    {
      id: 'item-3',
      question: 'What happens during a Burn-After-Reading transfer?',
      answer:
        'When Burn-After-Reading is enabled, the session in-memory buffer references are permanently wiped from the host RAM the instant the receiver completes the chunk verification stream. No cached files or plaintext remain.',
    },
    {
      id: 'item-4',
      question: 'Are there any file or batch size limits?',
      answer:
        'No. Because W2W Share uses a 2MB sliding chunk window streamed directly through WebCrypto and Web Streams API, you can transfer multi-gigabyte video files, dataset archives, and entire nested folder trees without browser memory crashes.',
    },
  ]

  return (
    <section id="faq" className="w-full max-w-[1200px] mx-auto px-6 py-20 dashed-container my-12 rounded-2xl bg-[#000000]/60">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left Column: Heading */}
        <div className="lg:col-span-5 space-y-4">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[#808080]">
            QUESTIONS & ANSWERS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Frequently <br className="hidden sm:inline" />asked questions.
          </h2>
          <p className="text-sm text-[#808080] max-w-sm leading-relaxed">
            Need technical details on cryptographic primitives, UDP port binding, or enterprise air-gapped appliances?
          </p>
        </div>

        {/* Right Column: Accordion */}
        <div className="lg:col-span-7">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-[#1c1c1c]">
                <AccordionTrigger className="text-white hover:text-white/80 font-medium text-base sm:text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#ababab] leading-relaxed">
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
