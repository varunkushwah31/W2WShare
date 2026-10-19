# 📖 W2W Share — Comprehensive User Guide & Feature Manual

> **Zero-Knowledge • 100% Offline • Zero Internet Required • WebRTC Direct P2P • Client-Side AES-256-GCM • Subnet UDP Radar • Mobile PWA Companion**

---

## 📑 Table of Contents

1. [Introduction & Philosophy](#1-introduction--philosophy)
2. [Quick Start & Setup](#2-quick-start--setup)
   - [Prerequisites](#prerequisites)
   - [Running with Maven & Java 25](#running-with-maven--java-25)
   - [Running the Frontend Dev Server](#running-the-frontend-dev-server)
   - [Running with Docker Compose](#running-with-docker-compose)
3. [Step-by-Step Usage Instructions](#3-step-by-step-usage-instructions)
   - [How to Send Files & Folders](#how-to-send-files--folders)
   - [How to Receive Files & Claim by PIN](#how-to-receive-files--claim-by-pin)
   - [How to Connect Mobile Devices (PWA & QR Scanner)](#how-to-connect-mobile-devices-pwa--qr-scanner)
   - [How to Transfer 100% Offline (Hotspot Mode)](#how-to-transfer-100-offline-hotspot-mode)
   - [How to Use Zero-Knowledge Clipboard & Peer Chat](#how-to-use-zero-knowledge-clipboard--peer-chat)
   - [How to Use Subnet Peer Radar](#how-to-use-subnet-peer-radar)
   - [How to View Audit Records & Download Signed Receipts](#how-to-view-audit-records--download-signed-receipts)
   - [How to Preview Media in Browser](#how-to-preview-media-in-browser)
4. [Deep Dive: Feature Architecture](#4-deep-dive-feature-architecture)
   - [Client-Side Cryptography (AES-256-GCM + PBKDF2)](#client-side-cryptography-aes-256-gcm--pbkdf2)
   - [WebRTC Direct P2P Tunnel vs. Local Relay](#webrtc-direct-p2p-tunnel-vs-local-relay)
   - [Subnet Peer Radar (UDP Port 8888)](#subnet-peer-radar-udp-port-8888)
   - [Burn-After-Reading Auto-Destruction](#burn-after-reading-auto-destruction)
   - [Hardware-Accelerated Gzip Pre-Compression](#hardware-accelerated-gzip-pre-compression)
   - [Direct-to-Disk Streamer (File System Access API)](#direct-to-disk-streamer-file-system-access-api)
   - [Live Presence, Speedometer & Dynamic ETA](#live-presence-speedometer--dynamic-eta)
5. [Practical Scenarios & Workflows](#5-practical-scenarios--workflows)
6. [Network Configuration & Troubleshooting](#6-network-configuration--troubleshooting)
   - [Port Requirements](#port-requirements)
   - [AP Isolation / Campus Wi-Fi Bypass](#ap-isolation--campus-wi-fi-bypass)
   - [Browser Security & WebCrypto Requirements](#browser-security--webcrypto-requirements)
7. [API & Signaling Protocol Specification](#7-api--signaling-protocol-specification)

---

## 1. Introduction & Philosophy

**W2W Share** is a secure, high-throughput, zero-knowledge offline sharing system. Unlike cloud file services (Google Drive, Dropbox, WeTransfer), W2W Share **never uploads your files to third-party servers or the public internet**.

### Core Guarantees:
- **100% Offline:** Operates smoothly on air-gapped subnets, local Wi-Fi networks, or ad-hoc smartphone hotspots with **zero cellular data consumed**.
- **Zero-Knowledge Privacy:** Files are encrypted with **AES-256-GCM** directly in the sender's browser memory using keys derived from a 6-digit PIN via **PBKDF2 (100,000 rounds)**. The host server and network intermediaries only ever see encrypted binary slices.
- **Maximum Local Throughput:** Speeds range between **40 MB/s and 100+ MB/s** depending on your local Wi-Fi / 5GHz Hotspot adapter capabilities.
- **Zero Installation Needed for Peers:** Any peer with a modern web browser (Chrome, Edge, Safari, Firefox) can receive or send files immediately without installing desktop software.

---

## 2. Quick Start & Setup

### Prerequisites
- **Java Development Kit (JDK):** Version 21 or 25 (`java -version`)
- **Apache Maven:** Version 3.9+ (`mvn -version`)
- **Node.js:** Version 20+ and npm (`node -v`, `npm -v`)
- **Web Browser:** Any modern browser supporting WebCrypto and WebRTC (Chrome 90+, Edge 90+, Safari 15+, Firefox 90+).

---

### Running with Maven & Java 25

1. **Navigate to the Project Root:**
   ```bash
   cd d:\W2WShare
   ```

2. **Run Test Suite:**
   ```bash
   mvn test
   ```
   *(All 65 unit, integration, and Spring Boot application tests will execute).*

3. **Compile and Launch Spring Boot Backend:**
   ```bash
   mvn spring-boot:run
   ```
   *The server starts on `http://localhost:8080` (or your LAN IP, e.g. `http://192.168.1.50:8080`).*

4. **Build Executable Fat JAR for Production:**
   ```bash
   mvn clean package -DskipTests
   java -jar target/w2w-share-1.0.0.jar
   ```

---

### Running the Frontend Dev Server

For active frontend development with Hot Module Replacement (HMR):

1. **Navigate to the frontend folder:**
   ```bash
   cd d:\W2WShare\frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Vite Development Server:**
   ```bash
   npm run dev
   ```
   *Access the React studio at `http://localhost:5173`.*

4. **Compile Production Frontend Build:**
   ```bash
   npm run build
   ```
   *Builds optimized client assets to `frontend/dist` in ~1.2 seconds.*

---

### Running with Docker Compose

To deploy W2W Share in an isolated container environment:

```bash
docker compose up -d
```

Check running container logs:
```bash
docker compose logs -f
```

---

## 3. Step-by-Step Usage Instructions

### How to Send Files & Folders

1. **Open the Studio:**
   Navigate to `http://localhost:8080` (or `http://<YOUR-IP>:8080`) and ensure the **Send Payload** tab is active in the Transfer Studio.

2. **Select Files or Folders:**
   - **Option A (Drag & Drop):** Drag single files, batches of files, or entire folders into the central dashed drop zone.
   - **Option B (File Selector):** Click the **"Select Files"** button.
   - **Option C (Folder Selector):** Click the **"Select Folder"** button to upload directory structures recursively.

3. **Review Staged Files & Media Thumbnails:**
   - Image files automatically render live thumbnail previews.
   - Category tags (`[IMAGE]`, `[VIDEO]`, `[AUDIO]`, `[ARCHIVE]`, `[CODE]`, `[DOCUMENT]`) and file sizes are displayed.
   - Individual files can be removed using the trash can icon, or you can clear the entire queue with **"Clear All"**.

4. **Configure Transfer Security Options:**
   - 🔥 **Burn After Reading (Checked by default):** The transfer vault and all stored slices auto-destruct immediately after the first successful download.
   - 🗜️ **Gzip Pre-Compression:** Compresses text, logs, source code, and JSON payloads in browser memory before encryption.
   - ⏱️ **Expires:** Choose expiration lifespan (5 minutes, 15 minutes, 1 hour, or 24 hours).

5. **Generate Encrypted Transfer Vault:**
   Click **"Generate Encrypted Transfer Vault"**.
   - W2W Share encrypts each file in 2MB sliding chunks using AES-256-GCM with a freshly generated random PBKDF2 salt.
   - A **6-digit Room Code / Claim PIN** is generated (e.g. `834921`).

6. **Share the Vault with the Receiver:**
   - **Share PIN:** Tell or message the 6-digit PIN to the receiver.
   - **Copy Link:** Click **"Copy Link"** to copy a deep-link URL (e.g. `http://192.168.1.50:8080/?code=834921&mode=receiver`).
   - **Show QR Code:** Click the QR code button to display a high-resolution QR code for camera scanning.

7. **Monitor Real-Time Presence & Telemetry:**
   - Watch the **Peer Presence Banner**:
     - 🟡 `WAITING FOR RECEIVER TO JOIN...` (Radar pinging on local subnet)
     - 🟢 `RECEIVER CONNECTED` (Peer handshake completed)
   - Watch the live **Speedometer** (MB/s), **Chunk Counter** (e.g. `Chunk 14 / 32`), and **ETA Telemetry** (e.g. `ETA: ~12s`).

---

### How to Receive Files & Claim by PIN

1. **Access the Receiver Vault:**
   Navigate to W2W Share on the receiving device and click the **Receive Vault** tab.

2. **Enter the 6-Digit PIN:**
   - **Interactive 6-Cell Split PIN:** Type each digit of the 6-digit PIN into the cells. The cursor automatically advances to the next cell. Pressing backspace navigates to the preceding cell.
   - **Paste from Clipboard:** Click **"Paste Code from Clipboard"** (or press `Ctrl+V` / `Cmd+V`). If you copy a 6-digit code or a URL containing `?pin=...`, W2W Share parses the code, populates all 6 boxes, and initiates the lookup automatically.
   - **Deep Link Auto-Claim:** If you opened a link sent by the sender (e.g. `http://<IP>:8080/?code=834921&mode=receiver`), W2W Share automatically navigates to the Receive Vault, populates the PIN, and starts locating the vault with zero clicks!

3. **Inspect the Payload Manifest:**
   - W2W Share retrieves the encrypted manifest and verifies metadata.
   - Review file names, file sizes, chunk count, and file category badges (`[ARCHIVE]`, `[IMAGE]`, etc.).

4. **Decrypt & Download:**
   - Click **"Start Decryption & Download"**.
   - Chunks are fetched over direct WebRTC DataChannel (or local HTTP relay) and decrypted directly in browser memory using hardware AES-256-GCM.
   - **Download Individually:** Click **"Download"** next to any decrypted file.
   - **Download All as .ZIP:** If multiple files were transferred, click **"Download All as .ZIP"** to stream all decrypted files into a single compressed `.zip` archive.
   - **Inline Preview:** Click **"Preview"** to open images, audio, video, or code in the browser without saving to disk first.

---

### How to Connect Mobile Devices (PWA & QR Scanner)

W2W Share features a companion mobile experience inspired by native mobile utilities:

1. **Open Mobile Portal:**
   Click the **"📱 Mobile Client"** button in the header navigation or the top of the Transfer Studio.

2. **Scan Dynamic QR Code:**
   - Open the native Camera app on your iPhone or Android phone.
   - Point the camera at the on-screen QR code and tap the detected link badge.
   - W2W Share loads instantly in Safari or Chrome on your mobile phone over local Wi-Fi.

3. **Install as a PWA (Progressive Web App):**
   - **On iOS (Safari):** Tap the **Share** button $\to$ tap **"Add to Home Screen"**.
   - **On Android (Chrome):** Tap the 3-dots menu $\to$ tap **"Add to Home screen"** or **"Install App"**.
   - W2W Share now launches full-screen like a native app, with offline caching and hardware encryption enabled.

4. **Mobile Native Share Sheet Integration:**
   - Once installed as a PWA, W2W Share registers with the mobile OS as a **Web Share Target**.
   - In Photos, Files, or YouTube, tap **Share** $\to$ select **W2W Share** to immediately stage media into the transfer queue.

---

### How to Transfer 100% Offline: Method 1 vs. Method 2

W2W Share operates completely offline with zero WAN/cellular internet required. Depending on your environment, you can use either Method 1 or Method 2:

#### ⚡ Method 1: Smartphone Personal Hotspot (Recommended & Most Portable)
Best for: Trains, outdoor fields, classrooms, flights, auditoriums, or networks where router client isolation is enabled.

1. **Turn on Mobile Hotspot:**
   - On your smartphone (Android or iPhone), turn on **Personal Hotspot** (Wi-Fi Tethering).
   - *(Pro-Tip: Cellular / Mobile Data can be toggled completely OFF to ensure zero data consumption!)*
2. **Connect Devices to Hotspot:**
   - Connect your laptop, tablet, or another phone to the smartphone's Wi-Fi hotspot network.
3. **Open Offline Sharing Hub in W2W Share:**
   - In W2W Share, open the **Offline Sharing Hub** modal (gear icon in the header).
   - Select **Method 1: Personal Hotspot**.
   - Input your Hotspot SSID and password to display an **Auto-Join Wi-Fi QR Code**. Peers can scan this QR code to join your Wi-Fi network without typing.
   - Show the **W2W Share Link QR Code** for peers to open `http://<HOTSPOT-IP>:8080` in their browser.
4. **Transfer at Full 5GHz Speeds:**
   - Local hotspot transfers bypass routers entirely, delivering raw transfer speeds between **50 MB/s and 100+ MB/s**.

#### 🏠 Method 2: Standard Wi-Fi Router or Office/Home LAN
Best for: Home, office, dormitory, or computer labs with an existing Wi-Fi router or wired Ethernet switch.

1. **Connect Devices to the Same Router / LAN:**
   - Connect your sender and receiver devices to the same local Wi-Fi router or plug them into the same Ethernet network switch.
   - **No Internet / Broadband Required:** The router can have its WAN/modem cable disconnected; it will still assign private LAN IP addresses (`192.168.x.x` or `10.x.x.x`) and route local data packets at high speed.
2. **Open W2W Share on Primary Machine:**
   - Launch W2W Share on your primary machine. It will bind to your local LAN IP (e.g. `http://192.168.1.50:8080`).
3. **Share Link or Scan QR Code:**
   - On peer devices on the same Wi-Fi, open `http://<LAN-IP>:8080` or scan the QR code from the **Offline Sharing Hub (Method 2)**.
4. **Subnet Peer Radar & AP Isolation Check:**
   - W2W Share automatically broadcasts UDP discovery beacons on port `8888`. Devices on the same LAN discover each other automatically in the Subnet Radar.
   - If the router enforces **AP Isolation** (common in hotels or university dorms) and blocks peer packets, simply switch to **Method 1 (Smartphone Personal Hotspot)**.

---

### How to Use Zero-Knowledge Clipboard & Peer Chat

For exchanging sensitive passwords, 2FA backup codes, API tokens, SSH private keys, or short notes across devices:

1. **Navigate to the "Clipboard & Chat" Tab:**
   Click **"Clipboard & Chat"** in the workspace navigation pill bar.

2. **Pair with a Peer:**
   - Enter the active 6-digit PIN of a session, or click **"Create Channel"** to spawn a fresh session.
   - Live WebSocket connection status is shown via the green **"LIVE WS"** beacon.

3. **Zero-Knowledge Clipboard:**
   - Paste or type text into the left text box.
   - Click **"Push to Local Network"**.
   - The encrypted text is broadcast to connected peers. On the peer device, click **"Copy"** to copy the content to the operating system clipboard.

4. **Ephemeral Peer Chat:**
   - On the right panel, select your role (**Sender** or **Receiver**).
   - Type messages in the input bar and press Enter.
   - Messages stream instantaneously across the local WebSocket channel with distinctive audio tones.
   - Click the copy icon next to any message to copy its text.

---

### How to Use Subnet Peer Radar

The Subnet Peer Radar eliminates the need to look up IP addresses manually:

1. **Navigate to the "Subnet Radar" Tab:**
   Click **"Subnet Radar"** in the workspace navigation pill bar.

2. **Automatic UDP Discovery:**
   - W2W Share broadcasts UDP beacon packets across port `8888` on all local network adapters.
   - Active W2W Share nodes on your subnet appear on the radar display in real time.

3. **Inspect Discovered Peers:**
   - See peer device names, operating systems, local IP addresses, and signal latency.
   - Click **"Direct Transfer"** on any discovered peer card to immediately open a pre-addressed transfer vault.

---

### How to View Audit Records & Download Signed Receipts

For compliance, enterprise auditing, or personal integrity verification:

1. **Navigate to the "Audit Ledger" Tab:**
   Click **"Audit Ledger"** in the workspace navigation pill bar.

2. **Search & Filter Transactions:**
   - Filter by **All**, **Sent**, or **Received**.
   - Search by Transaction ID (TX ID), file name, or SHA-256 hash.

3. **Download Signed JSON Audit Receipts:**
   - Click **"Receipt"** next to any completed transaction.
   - W2W Share exports an immutable cryptographic receipt containing:
     - Transaction ID and ISO 8601 timestamp.
     - Payload file name, byte size, and chunk breakdown.
     - Mathematical SHA-256 integrity hash.
     - Cipher specification (`AES-256-GCM / PBKDF2 (100k)`).
     - Local device keystore signature verification tag.

4. **Enable 7-Day Persistent Database Vault:**
   - Log in via **Node Auth** using your local device keystore credentials.
   - Logged-in nodes retain shared files securely in local database storage for 7 days before automated cleanup.

---

### How to Preview Media in Browser

W2W Share includes an in-browser media suite that lets receivers inspect content without saving files to disk:

- **Images:** High-resolution zoomable viewer for PNG, JPG, WebP, GIF, and SVG.
- **Audio:** HTML5 Web Audio streaming player with scrubber, volume control, and duration for MP3, WAV, OGG, and FLAC.
- **Video:** Hardware-accelerated MP4 and WebM video player with full-screen playback.
- **Documents & Code:** Clean monospace syntax viewer for JSON, Markdown, JavaScript, TypeScript, Python, Java, CSS, and plain text.

---

## 4. Deep Dive: Feature Architecture

### Client-Side Cryptography (AES-256-GCM + PBKDF2)

W2W Share utilizes the native **Web Cryptography API** (`window.crypto.subtle`) available in modern browsers:

```
[Sender Plaintext Chunk] 
       │
       ▼
[PBKDF2 Derivation: PIN + Salt16 (100,000 iterations)] ──► 256-bit AES Key
       │
       ▼
[AES-256-GCM Encryption (12-byte IV + 128-bit Auth Tag)]
       │
       ▼
[Encrypted Binary Chunk + IV + Tag] ──► [Local Network Transport]
```

- **Authentication Tag:** Galois/Counter Mode (GCM) produces an authentication tag for every 2MB slice, guaranteeing that any transmission corruption or MITM tampering causes immediate decryption failure before data is saved.
- **Zero Server Exposure:** The Spring Boot server handles raw binary byte buffers and never receives the PIN or derived key.

---

### WebRTC Direct P2P Tunnel vs. Local Relay

W2W Share implements an intelligent two-tier transport engine:

1. **Primary: WebRTC `RTCDataChannel` (Direct P2P)**
   - The sender and receiver exchange SDP offers and ICE candidates over the Spring Boot WebSocket signaling channel (`/ws/signaling`).
   - Once connected, binary chunks stream directly from device to device over your local Wi-Fi router without touching the server CPU or RAM.

2. **Automatic Fallback: Local HTTP Ephemeral Chunk Relay**
   - If symmetric NAT, strict corporate firewalls, or AP Isolation prevent WebRTC data channel establishment, W2W Share automatically falls back to local HTTP chunk streaming (`/api/transfers/sessions/{id}/chunks/{index}`).
   - End-to-end encryption remains 100% active during fallback.

---

### Subnet Peer Radar (UDP Port 8888)

- **Protocol:** UDP Datagram socket broadcast on `255.255.255.255:8888`.
- **Payload:** Compact JSON beacon containing device hostname, local IP, active transfer status, and timestamp.
- **Background Worker:** Runs on a dedicated virtual thread, scanning all non-loopback network interfaces every 4 seconds.

---

### Burn-After-Reading Auto-Destruction

When Burn-After-Reading is enabled:
1. The receiver completes downloading the final chunk of the payload.
2. The receiver sends an authenticated completion signal to the backend.
3. The server immediately frees memory buffers, purges temporary chunk caches from disk, and invalidates the session token.
4. Subsequent attempts to query or download with the same PIN receive an immediate `404 Session Expired / Burned` response.

---

### Hardware-Accelerated Gzip Pre-Compression

- Uses the browser's native `CompressionStream('gzip')` and `DecompressionStream('gzip')`.
- Compresses compressible data (source code, logs, CSVs, text documents, JSON) before chunking and encryption.
- Reduces byte transmission size by **60% to 85%**, cutting transfer times significantly.

---

### Direct-to-Disk Streamer (File System Access API)

- For multi-gigabyte transfers (e.g. 10GB ISO files or 4K raw video footage), holding decrypted chunks in JavaScript heap memory could crash the browser tab.
- On supported Chromium browsers (Chrome, Edge), W2W Share uses `showSaveFilePicker()` and `FileSystemWritableFileStream` to write decrypted 2MB slices **directly to physical storage as they arrive**, maintaining steady RAM utilization below 150MB.

---

### Live Presence, Speedometer & Dynamic ETA

The telemetry engine calculates throughput dynamically:
- Records byte intervals over a rolling 1.5-second sampling window.
- Calculates instantaneous speed in MB/s:
  $$\text{Speed (MB/s)} = \frac{\Delta \text{Bytes}}{\Delta t \times 1,048,576}$$
- Projects Remaining Time (ETA):
  $$\text{ETA (seconds)} = \frac{\text{Total Bytes} - \text{Transferred Bytes}}{\text{Instantaneous Bytes Per Second}}$$
- Automatically formats ETA into human-readable minutes and seconds (`~01m 24s`).

---

## 5. Practical Scenarios & Workflows

### Scenario A: Large File Share Between Two Laptops on Home Wi-Fi
1. Laptop A opens `http://<LAPTOP-A-IP>:8080`.
2. Laptop A drags a 4GB `.zip` archive into the Send panel and clicks **Generate Encrypted Transfer Vault**.
3. Laptop A tells Laptop B the 6-digit PIN: `419082`.
4. Laptop B opens `http://<LAPTOP-A-IP>:8080`, types `419082` into the 6-box input, and clicks **Claim & Decrypt Files**.
5. Both laptops stream data directly over local Wi-Fi at 60–80 MB/s. Transfer completes in under a minute with zero cloud uploads.

---

### Scenario B: Transfer Photos from iPhone to PC Without Wi-Fi Router
1. On iPhone, open **Settings** $\to$ **Personal Hotspot** $\to$ turn on **Allow Others to Join**.
2. On PC, connect Wi-Fi to iPhone's hotspot.
3. On PC, open W2W Share and click **Hotspot & Campus Config**.
4. PC displays the QR code. iPhone scans the QR code with its camera to open W2W Share.
5. iPhone selects 4K video clips, clicks Send, and shares the 6-digit PIN with PC.
6. PC claims the PIN and downloads the videos directly over the 5GHz local hotspot connection with 0 MB of cellular data consumed.

---

### Scenario C: Sharing Confidential Passwords via E2EE Clipboard
1. Open the **Clipboard & Chat** tab on your workstation.
2. Click **Create Channel** to generate a session PIN.
3. Open the same tab on your secondary device and enter the PIN.
4. Paste confidential server credentials or private keys into the clipboard text box and click **Push to Local Network**.
5. Secondary device instantly displays the text and copies it with 1 click.

---

## 6. Network Configuration & Troubleshooting

### Port Requirements

Ensure your host firewall permits traffic on these ports:

| Port        | Protocol    | Purpose                                                              |
|-------------|-------------|----------------------------------------------------------------------|
| **8080**    | TCP         | HTTP REST API, Static Web App, WebSocket Signaling (`/ws/signaling`) |
| **8888**    | UDP         | Subnet Peer Radar discovery beacons                                  |
| **Dynamic** | UDP (Local) | WebRTC P2P direct data channels between local peer IPs               |

---

### AP Isolation / Campus Wi-Fi Bypass

**Problem:** On university campus Wi-Fi or hotel networks, routers often enable **Access Point (AP) Isolation** / Client Isolation, preventing devices on the same Wi-Fi from talking to each other.

**Solutions:**
1. **Use Smartphone Personal Hotspot:** Connect both devices to one smartphone hotspot. Hotspots never enforce AP isolation.
2. **Local HTTP Ephemeral Relay:** W2W Share automatically routes encrypted chunks through the host machine running Spring Boot if direct peer-to-peer packets are blocked.
3. **USB Ethernet / Ad-Hoc Wi-Fi:** Connect both machines via an Ethernet cable or direct ad-hoc Wi-Fi connection.

---

### Browser Security & WebCrypto Requirements

- **HTTPS / Localhost Requirement:** Modern browsers restrict the `window.crypto.subtle` API and Camera access to **Secure Contexts** (`localhost`, `127.0.0.1`, or `https://`).
- When accessing W2W Share from other devices over LAN IP (e.g. `http://192.168.x.x:8080`), you can:
  - Access via `http://localhost:8080` on the host machine.
  - In Chrome on mobile/client, navigate to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add your host IP (e.g. `http://192.168.1.50:8080`), and enable it.
  - Or place W2W Share behind a reverse proxy (Caddy/Nginx) with local self-signed TLS certificates.

---

### Clean Logging & Operations

W2W Share features high-readability, noise-filtered logging:
- **Compact Console Output:** Timestamps are truncated to `HH:mm:ss.SSS`, PID and thread noise are omitted, and logger names are aligned to a fixed 28-character column with ANSI colors.
- **HTTP Request Summaries:** `HttpTrafficLoggingFilter` logs concise single-line API requests:
  ```text
  19:24:01.120  INFO c.w.s.c.HttpTrafficLoggingFilter : HTTP POST   /api/transfer/session/create -> 200 (14ms)
  19:24:02.340  INFO c.w.s.c.HttpTrafficLoggingFilter : HTTP GET    /api/transfer/session/room/482019/status -> 200 (3ms)
  19:24:03.560  WARN c.w.s.c.HttpTrafficLoggingFilter : HTTP GET    /api/transfer/session/by-pin/000000 -> 400 (2ms)
  ```
- **Noise Suppression:** Verbose internal Hibernate database dialect dumps, Hikari connection pool messages, and Tomcat internal notices are silenced to `WARN`.
- **Rotating Disk Logs:** Comprehensive logs with timestamps, threads, and stack traces are archived to `logs/w2w-share.log` (10MB max size, 14-day gzip retention).
- **Log Level Override:** Change log level dynamically via environment variable `LOG_LEVEL_W2W=DEBUG` or in `application.properties`.

---

## 7. API & Signaling Protocol Specification

### REST Endpoints

| Method   | Endpoint                                           | Description                                                                         |
|----------|----------------------------------------------------|-------------------------------------------------------------------------------------|
| `POST`   | `/api/transfer/session/create`                     | Creates an ephemeral transfer session. Returns `sessionId`, `pin`, and `joinUrl`.   |
| `GET`    | `/api/transfer/session/{sessionId}`                | Resolves transfer session metadata, status, and file offers.                        |
| `GET`    | `/api/transfer/session/by-pin/{pin}`               | Resolves a 6-digit PIN to session metadata.                                         |
| `GET`    | `/api/transfer/session/room/{pin}/status`          | Returns real-time room mesh presence (active peers, sender/receiver status by PIN). |
| `GET`    | `/api/transfer/session/{sessionId}/room`           | Returns real-time room mesh presence by session ID.                                 |
| `GET`    | `/api/transfer/session/{sessionId}/status`         | Returns chunk resumption bitmap for all files in session.                           |
| `POST`   | `/api/transfer/session/{id}/file/{fIdx}/chunk/{c}` | Uploads an encrypted binary chunk.                                                  |
| `GET`    | `/api/transfer/session/{id}/file/{fIdx}/chunk/{c}` | Downloads an encrypted binary chunk.                                                |
| `POST`   | `/api/transfer/session/{id}/file/{fIdx}/complete`  | Marks file transfer complete; triggers Burn-After-Reading if enabled.               |
| `DELETE` | `/api/transfer/session/{id}`                       | Terminates and purges a session immediately.                                        |
| `GET`    | `/api/network/info`                                | Returns host LAN IPs, interface topology, and server uptime.                        |
| `GET`    | `/api/network/peers`                               | Returns nearby discovered peers from UDP radar.                                     |
| `GET`    | `/api/network/diagnostics`                         | Returns UDP discovery status and subnet mode.                                       |
| `GET`    | `/api/audit/ledger`                                | Returns transaction log records.                                                    |
| `GET`    | `/api/audit/receipt/{id}`                          | Returns a signed cryptographic JSON transaction receipt.                            |

---

### WebSocket Signaling & In-Memory Streaming Protocol (`/ws/signal`, `/ws/signaling`, `/ws/transfer`)

The WebSocket handler extends `AbstractWebSocketHandler` supporting both UTF-8 text signals and raw binary frames (`BinaryMessage`) for zero-storage piped streaming inspired by MangoShare:

```json
// 1. Sender Registration & Receiver Join
{ "type": "REGISTER_SENDER", "payload": "<sessionId>" }
{ "type": "JOIN_BY_PIN", "payload": "834921" }

// 2. Real-Time RTT Latency Heartbeat (Ping/Pong)
{ "type": "PING", "payload": { "clientTime": 1725540000123 } }
// Server responds directly:
{ "type": "PONG", "payload": { "clientTime": 1725540000123, "serverTime": 1725540000128 } }

// 3. Room Mesh & Peer Telemetry Inspection
{ "type": "GET_ROOM_STATUS" }
// Server returns live room mesh:
{
  "type": "ROOM_STATUS",
  "payload": {
    "sessionId": "4a18-912c",
    "connectedPeerCount": 2,
    "senderOnline": true,
    "receiverCount": 1,
    "serverTime": 1725540000130
  }
}

// 4. Zero-Storage In-Memory Chunk Relay (MangoShare-Style)
{
  "type": "STREAM_CHUNK",
  "payload": {
    "fileIndex": 0,
    "chunkIndex": 14,
    "totalChunks": 64,
    "chunkData": "<base64_payload>",
    "byteLength": 262144
  }
}
// Receiver acknowledges for flow control:
{ "type": "CHUNK_ACK", "payload": { "fileIndex": 0, "chunkIndex": 14, "status": "OK" } }

// 5. Real-Time Transfer Telemetry Synchronization
{
  "type": "TRANSFER_TELEMETRY",
  "payload": {
    "speedBytesPerSec": 32500000,
    "currentChunk": 14,
    "totalChunks": 64,
    "etaSeconds": 3,
    "progressPercent": 21.8
  }
}

// 6. WebRTC SDP Signaling
{ "type": "WEBRTC_OFFER", "payload": { "type": "offer", "sdp": "..." } }
{ "type": "WEBRTC_ANSWER", "payload": { "type": "answer", "sdp": "..." } }
{ "type": "WEBRTC_ICE_CANDIDATE", "payload": { "candidate": "...", "sdpMid": "0" } }

// 7. Ephemeral Chat & Text Sharing
{ "type": "CHAT_MESSAGE", "payload": { "senderRole": "sender", "content": "Encrypted message" } }
{ "type": "TEXT_MESSAGE", "payload": "Secret clipboard text" }
```

> [!TIP]
> **Raw Binary Streaming:** In addition to JSON signals, clients can transmit raw binary `ArrayBuffer` frames directly over the WebSocket connection. The backend relays binary frames to paired room peers with zero disk I/O, matching MangoShare's peak network streaming efficiency.

---

*W2W Share — Engineered for complete sovereignty, zero data leaks, and ultra-fast local network performance.*
