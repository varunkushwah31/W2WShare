# 🎨 W2W Share — React 19 Frontend Architecture

This directory contains the production-grade frontend client for **W2W Share**, built with **React 19**, **TypeScript 5.9**, **Vite 8.2**, and **Tailwind CSS 4**.

---

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server with HMR on port 5173
npm run dev
```

### Production Build
```bash
# Type-check and build optimized static assets to /dist
npm run build

# Preview the production build locally
npm run preview
```

---

## 📁 Component Architecture

```text
frontend/src/
├── components/
│   ├── w2w/                            # Core W2W Peer Sharing Workspace
│   │   ├── W2WWorkspace.tsx            # Main workspace container & navigation tabs
│   │   ├── SendPanel.tsx               # File drop zone, thumbnails, presence banner & telemetry
│   │   ├── ReceivePanel.tsx            # 6-cell split PIN input, manifest viewer, and decryption
│   │   ├── PeerRadarPanel.tsx          # Subnet radar visual scanner and topology list
│   │   ├── ClipboardChatPanel.tsx      # Zero-knowledge clipboard & ephemeral peer chat
│   │   ├── AuditLedgerPanel.tsx        # Forensic transaction log & signed receipts
│   │   ├── MobileCompanionModal.tsx    # Mobile QR scan, PWA guide & hotspot portal
│   │   ├── OfflineNetworkModal.tsx     # Campus Wi-Fi / AP isolation bypass & Wi-Fi QR
│   │   ├── QrCodeModal.tsx             # Dynamic transfer claim QR & Wi-Fi join QR
│   │   ├── MediaPreviewModal.tsx       # In-browser media player (Image, Video, Audio, Code)
│   │   └── TransferTelemetryChart.tsx  # Canvas-based real-time throughput & speed chart
│   ├── pages/                          # Standalone sub-pages
│   │   ├── ChangelogPage.tsx           # Platform release notes
│   │   ├── EngineeringBlogPage.tsx     # Deep-dive architecture writeups
│   │   ├── SecurityWhitepaperPage.tsx  # Cryptographic specifications & threat model
│   │   └── LegalModal.tsx              # Privacy policy and terms dialog
│   ├── ui/                             # Reusable accessible UI primitives (Radix UI)
│   │   ├── dialog.tsx                  # Accessible modal dialog
│   │   └── ...
│   ├── Navigation.tsx                  # Top header bar with studio navigation & mobile trigger
│   ├── Hero.tsx                        # Dynamic hero section with quick-action CTA buttons
│   ├── HowItWorks.tsx                  # 3-step visual workflow explanation
│   ├── FeatureSplitPanel.tsx           # Feature showcase panels with CAD illustrations
│   └── Footer.tsx                      # Application footer
├── lib/
│   ├── api.ts                          # REST client and WebSocket signaling client
│   ├── crypto.ts                       # WebCrypto AES-256-GCM and PBKDF2 encryption engine
│   ├── auth.ts                         # Local node keystore authentication store
│   └── sound.ts                        # Web Audio API procedural sound synthesizer
└── index.css                           # Cyber-grid styling, theme variables, and keyframe animations
```

---

## 🔑 Key Frontend Technologies & Standards

1. **WebCrypto API (`window.crypto.subtle`):**
   - Implemented in `src/lib/crypto.ts`.
   - Generates 16-byte random salts and 12-byte initialization vectors (IVs).
   - Derives 256-bit AES keys from human-readable 6-digit PINs using PBKDF2 with 100,000 iterations.
   - Slices files into 2MB binary chunks and encrypts/decrypts with AES-256-GCM.

2. **WebRTC `RTCDataChannel`:**
   - Initiates peer-to-peer data channels via WebSocket signaling (`/ws/signaling`).
   - Binary ArrayBuffers stream directly between browsers on the same local subnet without touching server disk or CPU.

3. **File System Access API:**
   - Supported Chromium browsers stream decrypted chunks directly to physical disk via `showSaveFilePicker()` to handle 10GB+ transfers with zero memory exhaustion.

4. **Web Audio API Sound Engine:**
   - Synthesizes subtle audio cues for peer connections, transfer completions, chat messages, and error states without relying on external MP3 audio assets.

5. **Design System Tokens:**
   - **Primary Brand Accent:** Blueprint Periwinkle (`#7089ba` / `--color-periwinkle`).
   - **Status Accents:** Emerald (`text-emerald-400`) for verified/active peer connections; Amber (`text-amber-400`) strictly reserved for waiting and warning states.
   - **Panels & Modals:** `bg-[#141414] border border-carbon rounded-2xl shadow-2xl`.
   - **Active Switcher Pills:** `bg-white text-black font-semibold shadow-sm`.
