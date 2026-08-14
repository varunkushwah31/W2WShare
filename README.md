# ⚡ W2W Share — Enterprise Offline Encrypted Peer Sharing Software

> **100% Offline • Zero Internet Required • SOLID Architecture • Low-Level & High-Level Design • Subnet Peer Radar • WebRTC Direct P2P • AES-256-GCM End-to-End Encryption • PWA & Web Share Target • Gzip Pre-Compression • Nested Folders • Direct-to-Disk Streaming • Burn-After-Reading • In-Browser Media Player • Spring Boot 4.1.0 (Java 25) • Docker & Prometheus Ready**

---

## 🌟 Architecture & Design Highlights

### 🏛️ High-Level Design (HLD)
- **Layered Clean Architecture:** Presentation (Controllers) $\to$ Contracts (DTOs) $\to$ Service Interfaces $\to$ Service Implementations $\to$ Domain Entities $\to$ Ephemeral Storage.

### 📐 Low-Level Design (LLD) & SOLID Principles
- **Single Responsibility Principle (SRP):** Distinct DTO request/response records with Jakarta Validation (`@NotBlank`, `@Pattern`), decoupled from domain entities and persistence layers.
- **Open/Closed (OCP) & Dependency Inversion (DIP):** Every controller and cross-service dependency is injected through explicit interfaces:
  - [`ISessionService`](file:///d:/W2WShare/src/main/java/com/w2w/share/service/ISessionService.java)
  - [`IStorageService`](file:///d:/W2WShare/src/main/java/com/w2w/share/service/IStorageService.java)
  - [`INetworkDiscoveryService`](file:///d:/W2WShare/src/main/java/com/w2w/share/service/INetworkDiscoveryService.java)
  - [`IPeerDiscoveryService`](file:///d:/W2WShare/src/main/java/com/w2w/share/service/IPeerDiscoveryService.java)
  - [`IRateLimiterService`](file:///d:/W2WShare/src/main/java/com/w2w/share/service/IRateLimiterService.java)
  - [`ITransferMetricsService`](file:///d:/W2WShare/src/main/java/com/w2w/share/metrics/ITransferMetricsService.java)
- **Interface Segregation (ISP):** Fine-grained, focused interface contracts with clean responsibilities.
- **Modern Java 25 Constructs:** Immutable data records, pattern matching, compact constructors, and constructor dependency injection.

---

## 🚀 Complete Feature Highlights

| Feature | Description |
|---|---|
| 📡 **Subnet Peer Radar** | Automatic UDP beacon discovery (`java.net.DatagramSocket`) on port `8888`. Displays nearby active devices on local Wi-Fi with 1-click connect. |
| ⚡ **WebRTC Direct P2P** | Direct browser-to-browser data streaming over local IPs with flow control; automatic HTTP chunk relay fallback. |
| 📲 **PWA & Share Target** | Standalone installation on Windows, macOS, Android, and iOS. Includes OS native "Share to W2W Share" menu integration. |
| 🗜️ **Gzip Pre-Compression** | Browser-native `CompressionStream('gzip')` reduces code, logs, text, and JSON transfer payloads by up to 80%. |
| 👁️ **Rich Media Player** | Inline preview for Audio (`.mp3`, `.wav`, `.ogg`, `.flac`), Video (`.mp4`, `.webm`), PDF, and formatted Code. |
| 🔥 **Burn-After-Reading** | Ephemeral storage and session auto-destruct upon 1st completed download. |
| 📜 **Audit History Ledger** | Local transaction log with downloadable signed JSON cryptographic audit receipts. |
| 📁 **Folder Drag & Drop** | Recursive directory scanner preserving full folder hierarchy; one-click ZIP download. |
| 💾 **Direct-to-Disk Stream** | File System Access API writing chunks directly to disk for 10GB+ transfers with zero RAM bloat. |
| 🔒 **Enterprise E2EE** | AES-256-GCM authenticated cipher with PBKDF2 key derivation (100,000 iterations). |
| 📊 **Observability & Docker** | Spring Boot 4.x Actuator health contributors, Micrometer Prometheus metrics, and ready-to-import Grafana dashboard. |

---

## 🛠️ Requirements & Tech Stack

- **JDK Version:** Java 25 (`java -version`)
- **Backend Framework:** Spring Boot 4.1.0
- **Security:** Spring Security 7.x, WebCrypto API, PBKDF2, AES-256-GCM
- **Build System:** Apache Maven 3.9+
- **Frontend Architecture:** Vanilla HTML5, CSS3, Pure ES6+ JavaScript, Web Audio API, WebRTC DataChannel, CompressionStream, Service Workers

---

## 📦 Quick Start

### 1. Build & Run Standalone JAR
```bash
# Run unit, integration, and E2E test suite (18 tests)
mvn clean test

# Build executable production JAR
mvn package -DskipTests

# Launch the software
java -jar target/w2w-share-1.0.0.jar
```
Access the application at `http://localhost:8080` or via your device's LAN IP.

### 2. Run with Docker Compose
```bash
# Build and start containerized W2W Share
docker compose up -d

# Check live logs
docker compose logs -f
```
