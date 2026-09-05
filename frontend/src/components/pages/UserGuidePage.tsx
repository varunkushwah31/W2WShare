import React, { useState } from 'react'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  UploadSimpleIcon,
  DownloadSimpleIcon,
  DeviceMobileIcon,
  WifiHighIcon,
  BroadcastIcon,
  ClipboardTextIcon,
  ShieldCheckIcon,
  FileZipIcon,
  LightningIcon,
  CheckCircleIcon,
  FlameIcon,
} from '@phosphor-icons/react'

interface UserGuidePageProps {
  onBack: () => void
}

type GuideTab = 'instructions' | 'mobile-hotspot' | 'features' | 'network'

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('instructions')

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 max-w-275 mx-auto space-y-10 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1c1c] pb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#282828] bg-[#141414] text-xs font-mono text-white hover:border-white transition-all cursor-pointer w-fit"
        >
          <ArrowLeftIcon className="w-4 h-4 text-[#7089ba]" />
          <span>Return to Studio</span>
        </button>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[#7089ba] bg-[#7089ba]/10 px-3 py-1 rounded-full border border-[#7089ba]/20 flex items-center gap-1.5 w-fit font-bold">
          <BookOpenIcon className="w-3.5 h-3.5" />
          <span>OFFICIAL USER MANUAL & FEATURE REFERENCE</span>
        </div>
      </div>

      {/* Hero Intro */}
      <div className="space-y-3 max-w-3xl">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
          How to Use W2W Share
        </h1>
        <p className="text-sm sm:text-base text-steel leading-relaxed">
          W2W Share is a zero-knowledge, 100% offline peer-to-peer file, folder, clipboard, and chat sharing platform.
          Files are sliced and encrypted directly in your browser with hardware AES-256-GCM before transmission across local Wi-Fi or mobile hotspots with zero cloud intermediaries.
        </p>
      </div>

      {/* Guide Navigation Switcher */}
      <div className="flex flex-wrap items-center p-1 rounded-xl bg-[#141414] border border-[#242424] gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('instructions')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'instructions'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-steel hover:text-white'
          }`}
        >
          <UploadSimpleIcon className="w-4 h-4" />
          <span>1. Step-by-Step Instructions</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mobile-hotspot')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'mobile-hotspot'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-steel hover:text-white'
          }`}
        >
          <DeviceMobileIcon className="w-4 h-4" />
          <span>2. Mobile & Offline Hotspot</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'features'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-steel hover:text-white'
          }`}
        >
          <LightningIcon className="w-4 h-4" />
          <span>3. Complete Feature Guide</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'network'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-steel hover:text-white'
          }`}
        >
          <WifiHighIcon className="w-4 h-4" />
          <span>4. Network & Troubleshooting</span>
        </button>
      </div>

      {/* TAB 1: STEP-BY-STEP INSTRUCTIONS */}
      {activeTab === 'instructions' && (
        <div className="space-y-8">
          {/* Sending Section */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <UploadSimpleIcon className="w-5 h-5" weight="bold" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-sans">
                  How to Send Files & Nested Folders
                </h3>
                <p className="text-xs text-steel mt-0.5">
                  Send any file type, photo, video, ISO, or entire recursive folder structure.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <span className="font-mono text-xs text-[#7089ba] font-bold">STEP 01</span>
                <h4 className="text-sm font-semibold text-white">Stage Your Payload</h4>
                <p className="text-xs text-steel leading-relaxed">
                  Drag and drop files or folders into the drop zone, or use <strong>"Select Files"</strong> / <strong>"Select Folder"</strong>. Image files display automatic thumbnail previews.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <span className="font-mono text-xs text-[#7089ba] font-bold">STEP 02</span>
                <h4 className="text-sm font-semibold text-white">Select Security Options</h4>
                <p className="text-xs text-steel leading-relaxed">
                  Toggle <strong>Burn After Reading</strong> for instant auto-destruction after 1 download, enable <strong>Gzip Pre-Compression</strong> to save bandwidth, and choose an expiry window.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <span className="font-mono text-xs text-[#7089ba] font-bold">STEP 03</span>
                <h4 className="text-sm font-semibold text-white">Generate Vault & PIN</h4>
                <p className="text-xs text-steel leading-relaxed">
                  Click <strong>"Generate Encrypted Transfer Vault"</strong>. Files are sliced into 2MB chunks and encrypted with AES-256-GCM. A unique 6-digit PIN (e.g. <code className="text-[#7089ba]">739104</code>) is produced.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <span className="font-mono text-xs text-[#7089ba] font-bold">STEP 04</span>
                <h4 className="text-sm font-semibold text-white">Share with Peer</h4>
                <p className="text-xs text-steel leading-relaxed">
                  Share the 6-digit PIN, display the QR code for mobile camera scanning, or copy the direct receiver deep-link. Monitor real-time speed (MB/s) and ETA countdown.
                </p>
              </div>
            </div>
          </div>

          {/* Receiving Section */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <DownloadSimpleIcon className="w-5 h-5" weight="bold" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-sans">
                  How to Receive & Decrypt Files
                </h3>
                <p className="text-xs text-steel mt-0.5">
                  Three simple ways to claim incoming encrypted file streams.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#7089ba]" />
                  <span>Method A: 6-Cell Split PIN</span>
                </div>
                <p className="text-xs text-steel leading-relaxed">
                  In the <strong>Receive Vault</strong> tab, type the 6-digit room code into the interactive split boxes. The cursor advances automatically to the next box, with backward backspace navigation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#7089ba]" />
                  <span>Method B: Clipboard Paste</span>
                </div>
                <p className="text-xs text-steel leading-relaxed">
                  Click <strong>"Paste Code from Clipboard"</strong> or press <code className="text-[#7089ba]">Ctrl+V</code>. If you copied a PIN or receiver URL, all 6 cells auto-populate and trigger the lookup immediately.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#7089ba]" />
                  <span>Method C: Zero-Click Link</span>
                </div>
                <p className="text-xs text-steel leading-relaxed">
                  When you open a link sent by the sender (<code className="text-[11px] text-[#7089ba]">/?code=XXXXXX&mode=receiver</code>), W2W Share switches directly to the Receive Vault and connects automatically.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-carbon/60 border border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" weight="bold" />
                  <span>Download Options: Single File, Inline Preview, or All as .ZIP</span>
                </div>
                <p className="text-steel text-[11px]">
                  You can inspect high-res photos, play audio/video directly in your browser, download files individually, or click <strong>"Download All as .ZIP"</strong> to bundle everything into one archive.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOBILE & OFFLINE HOTSPOT */}
      {activeTab === 'mobile-hotspot' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mobile Companion PWA */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                  <DeviceMobileIcon className="w-5 h-5" weight="bold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-sans">
                    Mobile Companion & PWA
                  </h3>
                  <p className="text-xs text-steel mt-1">
                    Seamless phone-to-PC sharing with zero App Store downloads.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-steel">
                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">1. Instant Camera QR Launch:</strong>
                    <span>Click <strong>"📱 Mobile Client"</strong> in the top header and point your iPhone or Android camera at the QR code. W2W Share opens instantly in Safari/Chrome.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">2. 1-Click PWA Installation:</strong>
                    <span>Tap <em>"Add to Home Screen"</em> on iOS or Android to install W2W Share as a standalone native-feeling application with offline caching.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">3. System Share Sheet Target:</strong>
                    <span>Share high-res photos and 4K videos directly from your phone's native Share menu into W2W Share.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Hotspot Operation */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                  <WifiHighIcon className="w-5 h-5" weight="bold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-sans">
                    Zero-Internet Hotspot Mode
                  </h3>
                  <p className="text-xs text-steel mt-1">
                    Share files anywhere with 0 MB cellular data and zero router needed.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-steel">
                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">1. Turn on Phone Hotspot:</strong>
                    <span>Turn on Personal Hotspot on your phone. You can toggle Cellular/Mobile Data completely OFF to ensure zero data usage.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">2. Connect Computer to Phone:</strong>
                    <span>Connect your laptop or other devices to the phone's Wi-Fi hotspot.</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-void border border-[#242424] space-y-1">
                    <strong className="text-white block">3. Auto-Join Wi-Fi QR Code:</strong>
                    <span>Use the Hotspot Config in W2W Share to generate an auto-join QR code. Peers scan the QR code to join your hotspot without typing passwords.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                ⚡ Local 5GHz Wi-Fi speeds deliver 50 MB/s – 100+ MB/s directly between devices!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE FEATURE GUIDE */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <BroadcastIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">Subnet Peer Radar</h4>
              <p className="text-xs text-steel leading-relaxed">
                Broadcasts UDP discovery beacons on port <strong>8888</strong>. Active workstations, laptops, and mobile phones on your local Wi-Fi appear on your drafting table with 1-click connect.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <LightningIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">WebRTC Direct P2P</h4>
              <p className="text-xs text-steel leading-relaxed">
                Direct browser-to-browser data tunnels using WebRTC DataChannels. Binary chunks flow directly between local IPs with zero server storage and fallback to local HTTP relay if blocked.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <ClipboardTextIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">E2EE Clipboard & Chat</h4>
              <p className="text-xs text-steel leading-relaxed">
                Securely sync passwords, API tokens, SSH keys, or code snippets across devices in real time. Features ephemeral peer messaging with audio alerts and 1-click copy.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <FlameIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">Burn After Reading</h4>
              <p className="text-xs text-steel leading-relaxed">
                Guarantees ephemeral single-use delivery. The session token and temporary server buffers are purged immediately upon the first successful download completion.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <FileZipIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">Gzip Pre-Compression</h4>
              <p className="text-xs text-steel leading-relaxed">
                Browser-native <code className="text-[#7089ba]">CompressionStream</code> reduces text, code, logs, and JSON payloads by up to 80% before encryption, minimizing transmission time.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#141414] border border-carbon space-y-3">
              <div className="w-9 h-9 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <ShieldCheckIcon className="w-5 h-5" weight="duotone" />
              </div>
              <h4 className="text-base font-bold text-white font-sans">Audit Ledger & Receipts</h4>
              <p className="text-xs text-steel leading-relaxed">
                Cryptographic transaction history recording file names, sizes, chunk metrics, and mathematical SHA-256 hashes with exportable signed JSON receipts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NETWORK & TROUBLESHOOTING */}
      {activeTab === 'network' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-carbon space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-void border border-[#282828] flex items-center justify-center text-[#7089ba]">
              <WifiHighIcon className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-sans">
                Network Topology & Troubleshooting Guide
              </h3>
              <p className="text-xs text-steel mt-0.5">
                Ensure optimal local network performance and connectivity.
              </p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
              <div className="text-white font-bold">1. Required Firewall Ports:</div>
              <ul className="list-disc list-inside text-steel space-y-1">
                <li><strong className="text-white">Port 8080 (TCP):</strong> HTTP REST API, web assets, and WebSocket signaling (<code className="text-[#7089ba]">/ws/signaling</code>).</li>
                <li><strong className="text-white">Port 8888 (UDP):</strong> Subnet Peer Radar discovery beacons.</li>
                <li><strong className="text-white">Dynamic (UDP):</strong> WebRTC direct peer data channels between devices on the same subnet.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
              <div className="text-white font-bold">2. Bypassing Campus Wi-Fi / AP Isolation:</div>
              <p className="text-steel leading-relaxed">
                University campus Wi-Fi and hotel networks frequently enforce <strong>Access Point (AP) Isolation</strong>, blocking direct communication between connected clients.
                To bypass this restriction:
              </p>
              <ul className="list-disc list-inside text-steel space-y-1">
                <li>Enable <strong>Personal Hotspot</strong> on a mobile phone and connect your computers to it. Hotspots do not enforce AP isolation.</li>
                <li>W2W Share automatically routes chunks through the host machine using its built-in HTTP chunk relay fallback when direct WebRTC is blocked.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-void border border-[#242424] space-y-2">
              <div className="text-white font-bold">3. Browser WebCrypto Security Context:</div>
              <p className="text-steel leading-relaxed">
                Modern browsers require a <strong>Secure Context</strong> (<code className="text-[#7089ba]">localhost</code> or <code className="text-[#7089ba]">https://</code>) to access hardware encryption and the camera.
                When accessing over local LAN IP (e.g. <code className="text-[#7089ba]">http://192.168.x.x:8080</code>), you can add your host IP to Chrome's <code className="text-white">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
