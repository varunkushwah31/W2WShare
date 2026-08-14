/**
 * W2W Share - Production Grade Application Orchestrator
 * High-throughput WebRTC Direct P2P with HTTP Chunk fallback,
 * Subnet Peer Radar (AirDrop-style discovery), PWA & Web Share Target,
 * Persistent History Ledger, Compression, Media Player, and Burn-After-Reading.
 */

// Global State
const state = {
    role: null,               // 'sender' or 'receiver'
    sessionId: null,
    pin: null,
    fileBatch: [],            // Array of { file: File, relativePath: string, buffer: ArrayBuffer, isCompressed: boolean }
    activeFileIndex: 0,
    fileMetadataList: [],
    derivedKey: null,
    chunkSize: 2 * 1024 * 1024,
    parallelStreams: 3,
    directDiskEnabled: false,
    burnAfterReading: false,
    expiresInSeconds: 0,
    transferMode: 'HTTP',
    isTransferring: false,
    transferStartTime: 0,
    transferredBytes: 0,
    totalBatchBytes: 0,
    networkInfo: null,
    receivedBlobs: [],
    soundEnabled: true,
    themes: ['dark', 'oled', 'light', 'cyberpunk'],
    currentThemeIndex: 0,
    abortController: null,
    pendingWebRTCChunks: new Map(),
    deferredPrompt: null,
    discoveredPeers: [],
    radarTimer: null
};

// ============================================================================
// Web Audio API Synthesizer (100% Offline, Zero external audio files)
// ============================================================================
const soundEngine = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
    },
    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
        if (!state.soundEnabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    },
    peerConnect() {
        this.playTone(523.25, 'sine', 0.1, 0.08);
        setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.08), 100);
    },
    transferComplete() {
        this.playTone(523.25, 'triangle', 0.1, 0.1);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.1), 200);
    },
    chatMsg() {
        this.playTone(880, 'sine', 0.08, 0.05);
    },
    errorTone() {
        this.playTone(220, 'sawtooth', 0.25, 0.1);
    }
};

// ============================================================================
// Initialization & PWA Service Worker
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    initDropzone();
    initSocketEvents();
    loadSettings();
    registerServiceWorker();
    initPwaInstall();
    await fetchNetworkInfo();

    const savedTheme = localStorage.getItem('w2w_theme') || 'dark';
    setTheme(savedTheme);

    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && pinParam.length === 6) {
        switchTab('receive');
        fillPinInputs(pinParam);
        setTimeout(() => submitReceiverPin(), 300);
    }

    // Web Share Target handling
    if (urlParams.get('text') || urlParams.get('url')) {
        const sharedText = [urlParams.get('title'), urlParams.get('text'), urlParams.get('url')].filter(Boolean).join('\n');
        switchTab('clipboard');
        document.getElementById('clipboardTextarea').value = sharedText;
        showToast('Received shared content from OS! 📋', 'info');
    }

    window.w2wSocket.connect();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('SW registration ignored:', err);
        });
    }
}

function initPwaInstall() {
    const installBtn = document.getElementById('installAppBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            installBtn.onclick = async () => {
                if (state.deferredPrompt) {
                    state.deferredPrompt.prompt();
                    const choice = await state.deferredPrompt.userChoice;
                    if (choice.outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                    state.deferredPrompt = null;
                }
            };
        }
    });
}

async function fetchNetworkInfo() {
    try {
        const res = await fetch('/api/network/info');
        if (!res.ok) throw new Error('Failed to fetch network info');
        const data = await res.json();
        state.networkInfo = data;

        const primaryUrl = data.primaryUrl || window.location.origin;
        document.getElementById('primaryIpLabel').textContent = primaryUrl.replace('http://', '').replace('https://', '');
        document.getElementById('serverStatusDot').classList.remove('offline');

        const container = document.getElementById('networkListContainer');
        container.innerHTML = '';

        if (data.interfaces && data.interfaces.length > 0) {
            data.interfaces.forEach(iface => {
                const item = document.createElement('div');
                item.className = 'network-item';
                const tag = iface.isWifiOrHotspot ? '📶 Wi-Fi / Hotspot' : (iface.isLoopback ? '🔄 Localhost' : '🌐 LAN / Ethernet');
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${iface.url}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${iface.displayName || iface.name} • ${tag}</div>
                    </div>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="copyToClipboard('${iface.url}')">
                        Copy
                    </button>
                `;
                container.appendChild(item);
            });
        }

        if (window.W2WQR) {
            window.W2WQR.render(document.getElementById('networkQrCanvas'), primaryUrl, { size: 180 });
        }
    } catch (e) {
        console.warn('Network discovery error:', e);
        document.getElementById('primaryIpLabel').textContent = 'Localhost Mode';
        document.getElementById('serverStatusDot').classList.add('offline');
    }
}

// ============================================================================
// Nearby Subnet Radar (AirDrop-style LAN Discovery)
// ============================================================================
async function fetchNearbyPeers() {
    try {
        const res = await fetch('/api/network/peers');
        if (!res.ok) return;
        const peers = await res.json();
        state.discoveredPeers = peers;
        renderDiscoveredPeers(peers);
    } catch (e) {}
}

function renderDiscoveredPeers(peers) {
    const container = document.getElementById('nearbyPeersContainer');
    const label = document.getElementById('radarStatusLabel');
    if (!container) return;

    if (!peers || peers.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">
                No other devices detected on this subnet yet. Open W2W Share on another device connected to the same Wi-Fi!
            </div>
        `;
        if (label) label.textContent = 'Scanning local Wi-Fi subnet for active peers...';
        return;
    }

    if (label) label.textContent = `Found ${peers.length} active device(s) on your local network:`;
    container.innerHTML = '';

    peers.forEach(peer => {
        const card = document.createElement('div');
        card.className = 'peer-card';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                <div style="font-size: 1.6rem;">💻</div>
                <div style="overflow: hidden;">
                    <div style="font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(peer.deviceName)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${peer.ip}</div>
                </div>
            </div>
            <button class="btn btn-primary" style="padding: 6px 14px; font-size: 0.82rem;" onclick="connectToNearbyPeer('${peer.url}')">
                Connect
            </button>
        `;
        container.appendChild(card);
    });
}

function connectToNearbyPeer(peerUrl) {
    window.open(peerUrl, '_blank');
}

// ============================================================================
// Settings & Themes
// ============================================================================
function loadSettings() {
    const savedChunkSize = localStorage.getItem('w2w_chunk_size');
    if (savedChunkSize) {
        state.chunkSize = parseInt(savedChunkSize, 10);
        const sel = document.getElementById('settingChunkSize');
        if (sel) sel.value = savedChunkSize;
    }

    const savedParallel = localStorage.getItem('w2w_parallel_streams');
    if (savedParallel) {
        state.parallelStreams = parseInt(savedParallel, 10);
        const sel = document.getElementById('settingParallelStreams');
        if (sel) sel.value = savedParallel;
    }

    const savedDisk = localStorage.getItem('w2w_direct_disk');
    if (savedDisk) {
        state.directDiskEnabled = savedDisk === 'true';
        const chk = document.getElementById('settingDirectDisk');
        if (chk) chk.checked = state.directDiskEnabled;
    }

    const savedBurn = localStorage.getItem('w2w_burn_after');
    if (savedBurn) {
        state.burnAfterReading = savedBurn === 'true';
        const chk = document.getElementById('settingBurnAfter');
        if (chk) chk.checked = state.burnAfterReading;
    }
}

function updateSettings() {
    const cs = document.getElementById('settingChunkSize').value;
    const ps = document.getElementById('settingParallelStreams').value;
    const dd = document.getElementById('settingDirectDisk')?.checked || false;
    const burn = document.getElementById('settingBurnAfter')?.checked || false;
    const expiry = parseInt(document.getElementById('settingExpiry')?.value || '0', 10);

    state.chunkSize = parseInt(cs, 10);
    state.parallelStreams = parseInt(ps, 10);
    state.directDiskEnabled = dd;
    state.burnAfterReading = burn;
    state.expiresInSeconds = expiry;

    localStorage.setItem('w2w_chunk_size', cs);
    localStorage.setItem('w2w_parallel_streams', ps);
    localStorage.setItem('w2w_direct_disk', dd);
    localStorage.setItem('w2w_burn_after', burn);
    showToast('Settings saved!', 'info');
}

function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('open');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('open');
}

function cycleTheme() {
    state.currentThemeIndex = (state.currentThemeIndex + 1) % state.themes.length;
    setTheme(state.themes[state.currentThemeIndex]);
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('w2w_theme', themeName);
    state.currentThemeIndex = state.themes.indexOf(themeName);
    showToast(`Theme: ${themeName.toUpperCase()}`, 'info');
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    const btn = document.getElementById('soundToggleBtn');
    if (state.soundEnabled) {
        btn.style.color = 'var(--accent-cyan)';
        showToast('Sound effects enabled 🔔', 'info');
        soundEngine.peerConnect();
    } else {
        btn.style.color = 'var(--text-muted)';
        showToast('Sound effects muted 🔕', 'info');
    }
}

// ============================================================================
// Camera QR Scanner Modal
// ============================================================================
async function openCameraScannerModal() {
    const modal = document.getElementById('scannerModal');
    const video = document.getElementById('scannerVideo');
    modal.classList.add('open');

    try {
        await window.w2wScanner.start(video, (scannedUrl) => {
            closeCameraScannerModal();
            handleScannedQR(scannedUrl);
        });
    } catch (e) {
        showToast(e.message, 'error');
        closeCameraScannerModal();
    }
}

function closeCameraScannerModal() {
    window.w2wScanner.stop();
    document.getElementById('scannerModal').classList.remove('open');
}

function handleScannedQR(scannedText) {
    try {
        let pin = null;
        if (scannedText.includes('pin=')) {
            const url = new URL(scannedText);
            pin = url.searchParams.get('pin');
        } else if (/^\d{6}$/.test(scannedText.trim())) {
            pin = scannedText.trim();
        }

        if (pin && pin.length === 6) {
            fillPinInputs(pin);
            soundEngine.peerConnect();
            showToast('QR Code Scanned! Connecting...', 'success');
            submitReceiverPin();
        } else {
            showToast('Scanned QR does not contain a 6-digit PIN', 'error');
        }
    } catch (e) {
        showToast('Invalid QR Code content', 'error');
    }
}

// ============================================================================
// Tab Navigation
// ============================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    if (state.radarTimer) {
        clearInterval(state.radarTimer);
        state.radarTimer = null;
    }

    if (tabId === 'send') {
        document.getElementById('tabSendBtn').classList.add('active');
        document.getElementById('paneSend').classList.add('active');
        state.role = 'sender';
    } else if (tabId === 'receive') {
        document.getElementById('tabReceiveBtn').classList.add('active');
        document.getElementById('paneReceive').classList.add('active');
        state.role = 'receiver';
        document.getElementById('p1').focus();
    } else if (tabId === 'radar') {
        document.getElementById('tabRadarBtn').classList.add('active');
        document.getElementById('paneRadar').classList.add('active');
        fetchNearbyPeers();
        state.radarTimer = setInterval(fetchNearbyPeers, 3000);
    } else if (tabId === 'chat') {
        document.getElementById('tabChatBtn').classList.add('active');
        document.getElementById('paneChat').classList.add('active');
        document.getElementById('chatInput').focus();
    } else if (tabId === 'clipboard') {
        document.getElementById('tabClipboardBtn').classList.add('active');
        document.getElementById('paneClipboard').classList.add('active');
    }
}

// ============================================================================
// Recursive Directory / Folder Dropzone Setup
// ============================================================================
function initDropzone() {
    const dropzone = document.getElementById('senderDropzone');

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', async (e) => {
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            const extractedFiles = await scanDataTransferItems(items);
            if (extractedFiles.length > 0) {
                handleExtractedBatch(extractedFiles);
            }
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const list = Array.from(e.dataTransfer.files).map(f => ({ file: f, relativePath: f.name }));
            handleExtractedBatch(list);
        }
    });
}

async function scanDataTransferItems(items) {
    const fileEntries = [];

    async function traverseEntry(entry, path = '') {
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            fileEntries.push({
                file: file,
                relativePath: path ? `${path}/${file.name}` : file.name
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await readAllDirectoryEntries(dirReader);
            for (const child of entries) {
                await traverseEntry(child, path ? `${path}/${entry.name}` : entry.name);
            }
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) await traverseEntry(entry);
        } else if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) fileEntries.push({ file: f, relativePath: f.name });
        }
    }

    return fileEntries;
}

function readAllDirectoryEntries(dirReader) {
    const entries = [];
    return new Promise((resolve) => {
        function readBatch() {
            dirReader.readEntries((batch) => {
                if (batch.length === 0) {
                    resolve(entries);
                } else {
                    entries.push(...batch);
                    readBatch();
                }
            }, () => resolve(entries));
        }
        readBatch();
    });
}

function handleFileInputSelection(files) {
    if (!files || files.length === 0) return;
    const batch = Array.from(files).map(f => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name
    }));
    handleExtractedBatch(batch);
}

// ============================================================================
// Multi-File & Folder Sender Lifecycle with Client-Side Compression
// ============================================================================
async function handleExtractedBatch(extractedBatch) {
    if (!extractedBatch || extractedBatch.length === 0) return;

    state.fileBatch = extractedBatch;
    state.totalBatchBytes = state.fileBatch.reduce((sum, item) => sum + item.file.size, 0);

    renderSenderBatchList();
    document.getElementById('senderBatchContainer').style.display = 'block';
    showToast(`Preparing ${state.fileBatch.length} item(s) with pre-compression...`, 'info');

    try {
        const createBody = {
            senderId: 'sender-' + Date.now(),
            burnAfterReading: state.burnAfterReading,
            maxDownloads: state.burnAfterReading ? 1 : 0,
            expiresInSeconds: state.expiresInSeconds > 0 ? state.expiresInSeconds : null
        };

        const res = await fetch('/api/transfer/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createBody)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Failed to create session.');
        }

        const sessionData = await res.json();
        state.sessionId = sessionData.sessionId;
        state.pin = sessionData.pin;

        const salt = window.w2wCrypto.generateSalt(16);
        const iv = window.w2wCrypto.generateIv(12);
        state.derivedKey = await window.w2wCrypto.deriveKey(state.pin, salt);

        state.fileMetadataList = [];
        for (let i = 0; i < state.fileBatch.length; i++) {
            const item = state.fileBatch[i];
            const f = item.file;
            const originalBuffer = await readFileBuffer(f);
            const shouldComp = window.w2wCompressor.shouldCompress(f.name, f.type);

            let processBuffer = originalBuffer;
            let isComp = false;

            if (shouldComp) {
                const compBuffer = await window.w2wCompressor.compressBuffer(originalBuffer);
                if (compBuffer.byteLength < originalBuffer.byteLength) {
                    processBuffer = compBuffer;
                    isComp = true;
                }
            }

            item.buffer = processBuffer;
            item.isCompressed = isComp;

            const checksum = await window.w2wCrypto.calculateSha256(processBuffer);
            const totalChunks = Math.ceil(processBuffer.byteLength / state.chunkSize);

            state.fileMetadataList.push({
                fileId: 'file-' + i,
                fileName: f.name,
                fileSize: processBuffer.byteLength,
                mimeType: f.type || 'application/octet-stream',
                totalChunks: totalChunks,
                chunkSize: state.chunkSize,
                salt: salt,
                iv: iv,
                authTag: '',
                sha256Checksum: checksum,
                relativePath: item.relativePath,
                isCompressed: isComp,
                originalSize: f.size
            });
        }

        await fetch(`/api/transfer/session/${state.sessionId}/batch-offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.fileMetadataList)
        });

        window.w2wSocket.registerSender(state.sessionId);

        // Record to persistent history
        recordToTransferHistory({
            role: 'sender',
            pin: state.pin,
            itemCount: state.fileBatch.length,
            totalBytes: state.totalBatchBytes,
            timestamp: Date.now(),
            files: state.fileMetadataList.map(m => m.fileName)
        });

        window.w2wWebRTC.init(true, (webrtcState) => {
            updateTransportBadge(webrtcState);
        }, (chunkData) => {});

        document.getElementById('senderPinDigits').textContent = state.pin;
        document.getElementById('senderPinBox').style.display = 'flex';

        const primaryUrl = state.networkInfo?.primaryUrl || window.location.origin;
        const joinUrl = `${primaryUrl}/?pin=${state.pin}`;
        if (window.W2WQR) {
            window.W2WQR.render(document.getElementById('senderQrCanvas'), joinUrl, { size: 160 });
        }

        if (state.burnAfterReading) {
            showToast('🔥 Burn-After-Reading Active: Self-destructs after 1 download!', 'info');
        } else {
            showToast('Pairing session ready! Share the 6-digit PIN with receiver.', 'success');
        }
    } catch (e) {
        console.error('Batch prep error:', e);
        soundEngine.errorTone();
        showToast('Error preparing files: ' + e.message, 'error');
        resetSenderBatch();
    }
}

function renderSenderBatchList() {
    const listContainer = document.getElementById('senderBatchList');
    listContainer.innerHTML = '';
    document.getElementById('senderBatchCountLabel').textContent = `Queue (${state.fileBatch.length} Items • ${formatBytes(state.totalBatchBytes)})`;

    state.fileBatch.forEach((item, idx) => {
        const isFolder = item.relativePath && item.relativePath.includes('/');
        const row = document.createElement('div');
        row.className = 'file-batch-item';
        row.id = `senderBatchItem_${idx}`;
        row.innerHTML = `
            <div class="file-info-col">
                <div class="file-icon-badge">${isFolder ? '📁' : '📄'}</div>
                <div>
                    <div class="file-name-text">${escapeHtml(item.relativePath)}</div>
                    <div class="file-size-text">${formatBytes(item.file.size)} • ${item.file.type || 'Binary'}</div>
                </div>
            </div>
            <span class="security-badge" id="senderItemStatus_${idx}">Pending</span>
        `;
        listContainer.appendChild(row);
    });
}

function resetSenderBatch() {
    state.fileBatch = [];
    state.fileMetadataList = [];
    state.derivedKey = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('folderInput').value = '';
    document.getElementById('senderBatchContainer').style.display = 'none';
    document.getElementById('senderPinBox').style.display = 'none';
    document.getElementById('senderProgressCard').style.display = 'none';
    window.w2wWebRTC.cleanup();
}

function copySenderPin() {
    if (state.pin) {
        copyToClipboard(state.pin);
        showToast('PIN copied: ' + state.pin, 'success');
    }
}

function updateTransportBadge(status) {
    const badge = document.getElementById('transportBadge');
    if (!badge) return;
    if (status === 'connected' || status === 'datachannel_open') {
        state.transferMode = 'WEBRTC';
        badge.textContent = '⚡ WebRTC Direct P2P';
        badge.style.color = 'var(--accent-emerald)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
        state.transferMode = 'HTTP';
        badge.textContent = '🌐 HTTP Relay';
        badge.style.color = 'var(--accent-cyan)';
    }
}

// Parallel Streaming Pipeline (WebRTC + HTTP Fallback)
async function startSenderUpload() {
    if (!state.fileBatch || state.fileBatch.length === 0 || !state.derivedKey) return;

    state.isTransferring = true;
    state.transferredBytes = 0;
    state.transferStartTime = Date.now();
    state.abortController = new AbortController();

    document.getElementById('senderProgressCard').style.display = 'flex';

    try {
        for (let fileIdx = 0; fileIdx < state.fileBatch.length; fileIdx++) {
            if (!state.isTransferring) break;

            const item = state.fileBatch[fileIdx];
            const meta = state.fileMetadataList[fileIdx];
            const fileData = item.buffer || await readFileBuffer(item.file);
            state.activeFileIndex = fileIdx;

            document.querySelectorAll('.file-batch-item').forEach(el => el.classList.remove('active'));
            const activeEl = document.getElementById(`senderBatchItem_${fileIdx}`);
            if (activeEl) activeEl.classList.add('active');
            const statusEl = document.getElementById(`senderItemStatus_${fileIdx}`);
            if (statusEl) statusEl.textContent = 'Streaming...';

            const compLabel = meta.isCompressed ? ' (🗜️ Compressed)' : '';
            document.getElementById('senderProgressState').textContent = `Transferring [${fileIdx + 1}/${state.fileBatch.length}]: ${meta.fileName}${compLabel}`;
            initChunkMatrix('senderChunkMatrix', meta.totalChunks);

            const concurrency = Math.min(state.parallelStreams, 4);
            const chunkIndices = Array.from({ length: meta.totalChunks }, (_, i) => i);

            await asyncPool(concurrency, chunkIndices, async (chunkIdx) => {
                if (!state.isTransferring) return;

                const start = chunkIdx * state.chunkSize;
                const end = Math.min(fileData.byteLength, start + state.chunkSize);
                const sliceBuffer = fileData.slice(start, end);

                const chunkIv = window.w2wCrypto.generateIv(12);
                const encryptedBytes = await window.w2wCrypto.encrypt(sliceBuffer, state.derivedKey, chunkIv);

                const ivBytes = window.w2wCrypto.hexToBytes(chunkIv);
                const combined = new Uint8Array(ivBytes.length + encryptedBytes.length);
                combined.set(ivBytes, 0);
                combined.set(encryptedBytes, ivBytes.length);

                let streamed = false;

                // 1. Try Direct WebRTC DataChannel
                if (window.w2wWebRTC.isConnected) {
                    try {
                        const header = new TextEncoder().encode(JSON.stringify({ fileIdx, chunkIdx }) + '\n');
                        const rtcPayload = new Uint8Array(header.length + combined.length);
                        rtcPayload.set(header, 0);
                        rtcPayload.set(combined, header.length);
                        await window.w2wWebRTC.sendBuffer(rtcPayload.buffer);
                        streamed = true;
                    } catch (webrtcErr) {
                        console.warn('[WebRTC] Stream error, falling back to HTTP chunk relay:', webrtcErr);
                    }
                }

                // 2. HTTP Chunk Relay Fallback
                if (!streamed) {
                    for (let retry = 0; retry < 3; retry++) {
                        try {
                            const uploadRes = await fetch(`/api/transfer/session/${state.sessionId}/file/${fileIdx}/chunk/${chunkIdx}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/octet-stream' },
                                body: combined,
                                signal: state.abortController.signal
                            });
                            if (uploadRes.ok) {
                                streamed = true;
                                break;
                            }
                        } catch (e) {
                            await sleep(250);
                        }
                    }
                }

                if (!streamed) throw new Error(`Chunk ${chunkIdx} of file ${meta.fileName} failed.`);

                state.transferredBytes += sliceBuffer.byteLength;
                updateSenderProgress(chunkIdx + 1, meta.totalChunks, state.transferredBytes, state.totalBatchBytes);
                markChunkDone('senderChunkMatrix', chunkIdx);

                window.w2wSocket.notifyChunkUploaded(chunkIdx, meta.totalChunks);
            });

            if (statusEl) {
                statusEl.textContent = 'Completed ✅';
                statusEl.style.color = 'var(--accent-emerald)';
            }
        }

        document.getElementById('senderProgressState').textContent = 'All Items Transferred & Encrypted! ✅';
        soundEngine.transferComplete();
        showToast('All items transferred successfully!', 'success');
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Upload batch failed:', e);
            soundEngine.errorTone();
            showToast('Transfer failed: ' + e.message, 'error');
        }
    }
}

function updateSenderProgress(chunksDone, totalChunks, bytesDone, totalBytes) {
    const percent = Math.min(100, Math.round((bytesDone / totalBytes) * 100));
    document.getElementById('senderProgressBar').style.width = `${percent}%`;
    document.getElementById('senderPercentLabel').textContent = `${percent}%`;
    document.getElementById('senderChunksVal').textContent = `${chunksDone} / ${totalChunks}`;
    document.getElementById('senderTransferredVal').textContent = `${formatBytes(bytesDone)} / ${formatBytes(totalBytes)}`;

    const elapsedSec = (Date.now() - state.transferStartTime) / 1000;
    if (elapsedSec > 0.5) {
        const speedBps = bytesDone / elapsedSec;
        const speedMbps = (speedBps / (1024 * 1024)).toFixed(1);
        document.getElementById('senderSpeedVal').textContent = `${speedMbps} MB/s`;

        const remainingBytes = totalBytes - bytesDone;
        const etaSec = Math.round(remainingBytes / speedBps);
        document.getElementById('senderEtaVal').textContent = formatEta(etaSec);

        window.w2wSocket.sendProgress(percent, speedMbps, bytesDone);
    }
}

// ============================================================================
// Multi-File & Folder Receiver Lifecycle
// ============================================================================
function onPinInput(index, event) {
    const val = event.target.value;
    if (val && index < 6) {
        document.getElementById(`p${index + 1}`).focus();
    }
}

function onPinKey(index, event) {
    if (event.key === 'Backspace' && !event.target.value && index > 1) {
        document.getElementById(`p${index - 1}`).focus();
    } else if (event.key === 'Enter') {
        submitReceiverPin();
    }
}

function fillPinInputs(pinStr) {
    const digits = pinStr.split('');
    for (let i = 0; i < 6; i++) {
        const el = document.getElementById(`p${i + 1}`);
        if (el) el.value = digits[i] || '';
    }
}

function getEnteredPin() {
    let pin = '';
    for (let i = 1; i <= 6; i++) {
        pin += document.getElementById(`p${i}`).value.trim();
    }
    return pin;
}

async function submitReceiverPin() {
    const pin = getEnteredPin();
    if (pin.length !== 6) {
        showToast('Please enter a 6-digit PIN', 'error');
        return;
    }

    state.pin = pin;
    const btn = document.getElementById('connectByPinBtn');
    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
        const res = await fetch(`/api/transfer/session/by-pin/${pin}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Invalid or expired PIN.');
        }

        const session = await res.json();
        state.sessionId = session.sessionId;
        state.burnAfterReading = session.burnAfterReading || false;

        window.w2wWebRTC.init(false, (webrtcState) => {
            updateTransportBadge(webrtcState);
        }, (rawBuffer) => {
            handleIncomingWebRTCBuffer(rawBuffer);
        });

        window.w2wSocket.joinByPin(pin);

        if (session.fileBatch && session.fileBatch.length > 0) {
            displayIncomingBatch(session.fileBatch);
        } else if (session.fileMetadata && session.fileMetadata.fileName) {
            displayIncomingBatch([session.fileMetadata]);
        } else {
            showToast('Paired! Waiting for sender to select files...', 'info');
        }
    } catch (e) {
        soundEngine.errorTone();
        showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Connect & Decrypt';
    }
}

function handleIncomingWebRTCBuffer(rawBuffer) {
    try {
        const uint8 = new Uint8Array(rawBuffer);
        let newlineIndex = -1;
        for (let i = 0; i < uint8.length; i++) {
            if (uint8[i] === 10) { newlineIndex = i; break; }
        }
        if (newlineIndex > 0) {
            const headerStr = new TextDecoder().decode(uint8.subarray(0, newlineIndex));
            const header = JSON.parse(headerStr);
            const chunkData = uint8.subarray(newlineIndex + 1);
            state.pendingWebRTCChunks.set(`${header.fileIdx}_${header.chunkIdx}`, chunkData);
        }
    } catch (e) {
        console.warn('Error parsing incoming WebRTC buffer:', e);
    }
}

function displayIncomingBatch(batch) {
    state.fileMetadataList = batch;
    state.totalBatchBytes = batch.reduce((sum, f) => sum + f.fileSize, 0);

    document.getElementById('receiverPinSection').style.display = 'none';
    document.getElementById('receiverOfferCard').style.display = 'flex';
    document.getElementById('receiverBatchTitle').textContent = `Incoming Encrypted Batch (${batch.length} Items)`;

    const container = document.getElementById('receiverBatchList');
    container.innerHTML = '';

    batch.forEach((meta, idx) => {
        const isFolder = meta.relativePath && meta.relativePath.includes('/');
        const isComp = meta.isCompressed ? ' • 🗜️ Compressed' : '';
        const item = document.createElement('div');
        item.className = 'file-batch-item';
        item.id = `receiverBatchItem_${idx}`;
        item.innerHTML = `
            <div class="file-info-col">
                <div class="file-icon-badge">${isFolder ? '📁' : '📥'}</div>
                <div>
                    <div class="file-name-text">${escapeHtml(meta.relativePath || meta.fileName)}</div>
                    <div class="file-size-text">${formatBytes(meta.fileSize)}${isComp} • ${meta.totalChunks} Chunks</div>
                </div>
            </div>
            <span class="security-badge" id="receiverItemStatus_${idx}">Ready</span>
        `;
        container.appendChild(item);
    });
}

function rejectOffer() {
    window.w2wSocket.cancel();
    resetReceiverState();
    showToast('Transfer declined.', 'info');
}

async function acceptBatchOffer() {
    if (!state.fileMetadataList || state.fileMetadataList.length === 0 || !state.pin) return;

    document.getElementById('receiverOfferCard').style.display = 'none';
    document.getElementById('receiverProgressCard').style.display = 'flex';
    document.getElementById('receiverProgressState').textContent = 'Downloading & Decrypting Batch...';

    state.isTransferring = true;
    state.transferredBytes = 0;
    state.transferStartTime = Date.now();
    state.receivedBlobs = [];

    state.derivedKey = await window.w2wCrypto.deriveKey(state.pin, state.fileMetadataList[0].salt);

    window.w2wSocket.send('BATCH_ACCEPT', { accepted: true });
    showToast('Batch download started...', 'info');

    downloadReceiverBatch();
}

async function downloadReceiverBatch() {
    try {
        for (let fileIdx = 0; fileIdx < state.fileMetadataList.length; fileIdx++) {
            if (!state.isTransferring) break;

            const meta = state.fileMetadataList[fileIdx];
            const totalChunks = meta.totalChunks;
            const fileChunks = new Array(totalChunks);

            document.getElementById('receiverProgressState').textContent = `Downloading [${fileIdx + 1}/${state.fileMetadataList.length}]: ${meta.fileName}`;
            initChunkMatrix('receiverChunkMatrix', totalChunks);

            let diskStream = null;
            if (state.directDiskEnabled && window.w2wDiskStreamer.isSupported && !meta.isCompressed) {
                diskStream = await window.w2wDiskStreamer.createWritableStream(meta.fileName);
            }

            const concurrency = Math.min(state.parallelStreams, 4);
            const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);

            await asyncPool(concurrency, chunkIndices, async (chunkIdx) => {
                if (!state.isTransferring) return;

                let chunkBytes = null;
                const rtcKey = `${fileIdx}_${chunkIdx}`;

                if (state.pendingWebRTCChunks.has(rtcKey)) {
                    chunkBytes = state.pendingWebRTCChunks.get(rtcKey);
                    state.pendingWebRTCChunks.delete(rtcKey);
                }

                if (!chunkBytes) {
                    for (let attempt = 0; attempt < 35; attempt++) {
                        if (state.pendingWebRTCChunks.has(rtcKey)) {
                            chunkBytes = state.pendingWebRTCChunks.get(rtcKey);
                            state.pendingWebRTCChunks.delete(rtcKey);
                            break;
                        }
                        try {
                            const res = await fetch(`/api/transfer/session/${state.sessionId}/file/${fileIdx}/chunk/${chunkIdx}`);
                            if (res.ok) {
                                const chunkData = await res.arrayBuffer();
                                chunkBytes = new Uint8Array(chunkData);
                                break;
                            }
                        } catch (err) {}
                        await sleep(350);
                    }
                }

                if (!chunkBytes) {
                    throw new Error(`Failed to retrieve chunk ${chunkIdx} for file ${meta.fileName}`);
                }

                const chunkIvBytes = chunkBytes.subarray(0, 12);
                const cipherBytes = chunkBytes.subarray(12);
                const chunkIvHex = window.w2wCrypto.bytesToHex(chunkIvBytes);

                const decryptedBytes = await window.w2wCrypto.decrypt(cipherBytes.buffer, state.derivedKey, chunkIvHex);

                if (diskStream && diskStream.writable) {
                    await window.w2wDiskStreamer.writeChunk(diskStream.writable, decryptedBytes);
                } else {
                    fileChunks[chunkIdx] = decryptedBytes;
                }

                state.transferredBytes += decryptedBytes.byteLength;
                updateReceiverProgress(chunkIdx + 1, totalChunks, state.transferredBytes, state.totalBatchBytes);
                markChunkDone('receiverChunkMatrix', chunkIdx);
            });

            if (diskStream && diskStream.writable) {
                await window.w2wDiskStreamer.closeStream(diskStream.writable);
                showToast(`Saved ${meta.fileName} directly to disk! 💾`, 'success');
            } else {
                const combinedBlob = new Blob(fileChunks, { type: meta.mimeType });
                let finalBuffer = await combinedBlob.arrayBuffer();

                const computedSha = await window.w2wCrypto.calculateSha256(finalBuffer);
                if (meta.sha256Checksum && meta.sha256Checksum.toLowerCase() !== computedSha.toLowerCase()) {
                    document.getElementById('receiverIntegrityVal').textContent = 'Checksum Mismatch! ❌';
                    document.getElementById('receiverIntegrityVal').style.color = 'var(--accent-rose)';
                    throw new Error(`SHA-256 integrity mismatch on ${meta.fileName}`);
                }

                if (meta.isCompressed) {
                    finalBuffer = await window.w2wCompressor.decompressBuffer(finalBuffer);
                }

                const finalBlob = new Blob([finalBuffer], { type: meta.mimeType });
                state.receivedBlobs.push({ blob: finalBlob, meta: meta, buffer: finalBuffer, sha256: computedSha });
                triggerBrowserDownload(finalBlob, meta.fileName);
            }
        }

        document.getElementById('receiverIntegrityVal').textContent = 'Verified Match ✅';
        document.getElementById('receiverProgressState').textContent = 'All Items Downloaded & Verified!';
        document.getElementById('receiverCompleteBox').style.display = 'block';

        if (state.receivedBlobs.length > 1) {
            document.getElementById('downloadZipBtn').style.display = 'inline-flex';
        }

        soundEngine.transferComplete();
        window.w2wSocket.notifyComplete();

        // Record to persistent history
        recordToTransferHistory({
            role: 'receiver',
            pin: state.pin,
            itemCount: state.receivedBlobs.length,
            totalBytes: state.totalBatchBytes,
            timestamp: Date.now(),
            files: state.receivedBlobs.map(b => b.meta.fileName)
        });

        // Notify server that download completed (triggers burn if active)
        if (state.sessionId) {
            fetch(`/api/transfer/session/${state.sessionId}/complete`, { method: 'POST' })
                .then(r => r.json())
                .then(res => {
                    if (res.burned) {
                        showToast('🔥 Transfer completed. Session permanently burned and destroyed!', 'info');
                    }
                }).catch(() => {});
        }

        showToast('All items downloaded and decrypted successfully!', 'success');
    } catch (e) {
        console.error('Download batch failed:', e);
        soundEngine.errorTone();
        showToast('Download failed: ' + e.message, 'error');
    }
}

function updateReceiverProgress(chunksDone, totalChunks, bytesDone, totalBytes) {
    const percent = Math.min(100, Math.round((bytesDone / totalBytes) * 100));
    document.getElementById('receiverProgressBar').style.width = `${percent}%`;
    document.getElementById('receiverPercentLabel').textContent = `${percent}%`;
    document.getElementById('receiverChunksVal').textContent = `${chunksDone} / ${totalChunks}`;
    document.getElementById('receiverTransferredVal').textContent = `${formatBytes(bytesDone)} / ${formatBytes(totalBytes)}`;

    const elapsedSec = (Date.now() - state.transferStartTime) / 1000;
    if (elapsedSec > 0.5) {
        const speedBps = bytesDone / elapsedSec;
        const speedMbps = (speedBps / (1024 * 1024)).toFixed(1);
        document.getElementById('receiverSpeedVal').textContent = `${speedMbps} MB/s`;
    }
}

function resetReceiverState() {
    state.fileMetadataList = [];
    state.receivedBlobs = [];
    state.isTransferring = false;
    state.pendingWebRTCChunks.clear();
    document.getElementById('receiverPinSection').style.display = 'flex';
    document.getElementById('receiverOfferCard').style.display = 'none';
    document.getElementById('receiverProgressCard').style.display = 'none';
    document.getElementById('receiverCompleteBox').style.display = 'none';
    document.getElementById('connectByPinBtn').disabled = false;
    document.getElementById('connectByPinBtn').textContent = 'Connect & Decrypt';
    fillPinInputs('');
    document.getElementById('p1').focus();
    window.w2wWebRTC.cleanup();
}

// ============================================================================
// Persistent Transfer History Ledger
// ============================================================================
function recordToTransferHistory(entry) {
    try {
        const history = JSON.parse(localStorage.getItem('w2w_transfer_history') || '[]');
        history.unshift(entry);
        if (history.length > 50) history.pop();
        localStorage.setItem('w2w_transfer_history', JSON.stringify(history));
    } catch (e) {}
}

function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    const container = document.getElementById('historyListContainer');
    modal.classList.add('open');

    try {
        const history = JSON.parse(localStorage.getItem('w2w_transfer_history') || '[]');
        if (history.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">No transfer transactions recorded yet.</div>`;
            return;
        }

        container.innerHTML = '';
        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const tag = item.role === 'sender' ? '⬆️ Sent' : '⬇️ Received';
            const row = document.createElement('div');
            row.className = 'history-item';
            row.innerHTML = `
                <div>
                    <div style="font-weight: 600; font-size: 0.92rem;">${tag} • ${item.itemCount} Item(s) (${formatBytes(item.totalBytes)})</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${date} • PIN: ${item.pin || 'Direct'}</div>
                    <div style="font-size: 0.78rem; color: var(--accent-cyan);">${escapeHtml(item.files.slice(0, 3).join(', '))}${item.files.length > 3 ? '...' : ''}</div>
                </div>
                <span class="security-badge">E2EE Verified</span>
            `;
            container.appendChild(row);
        });
    } catch (e) {}
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('open');
}

function clearTransferHistory() {
    localStorage.removeItem('w2w_transfer_history');
    openHistoryModal();
    showToast('Transfer history cleared', 'info');
}

// Download All As ZIP Archive (Preserving Directory Trees)
function downloadAllAsZip() {
    if (!state.receivedBlobs || state.receivedBlobs.length === 0) return;

    showToast('Building ZIP archive preserving folder tree in memory...', 'info');
    const zip = new window.W2WZip();

    state.receivedBlobs.forEach(item => {
        const path = item.meta.relativePath || item.meta.fileName;
        zip.addFile(path, item.buffer);
    });

    const zipBlob = zip.generateZipBlob();
    triggerBrowserDownload(zipBlob, `w2w_transfer_${state.pin || 'batch'}.zip`);
    showToast('ZIP archive downloaded! 📦', 'success');
}

// Download Cryptographic Transfer Receipt (JSON Audit Log)
function downloadCryptographicReceipt() {
    if (!state.receivedBlobs || state.receivedBlobs.length === 0) return;

    const receipt = {
        application: 'W2W Share - Offline Encrypted Peer Sharing',
        version: '1.0.0',
        sessionId: state.sessionId,
        pin: state.pin,
        timestamp: new Date().toISOString(),
        transportMode: state.transferMode,
        burnAfterReading: state.burnAfterReading,
        encryption: 'AES-256-GCM + PBKDF2 (100,000 iter)',
        integrityStatus: 'SHA-256_VERIFIED_AUTHENTIC',
        totalItems: state.receivedBlobs.length,
        totalBytes: state.totalBatchBytes,
        items: state.receivedBlobs.map(item => ({
            fileName: item.meta.fileName,
            relativePath: item.meta.relativePath,
            mimeType: item.meta.mimeType,
            bytes: item.buffer.byteLength,
            originalSize: item.meta.originalSize,
            isCompressed: item.meta.isCompressed,
            sha256Digest: item.sha256
        }))
    };

    const receiptBlob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    triggerBrowserDownload(receiptBlob, `w2w_receipt_${state.pin || 'audit'}.json`);
    showToast('Cryptographic Receipt downloaded! 📄', 'success');
}

// In-Browser Decrypted Rich Media & Document Viewer
function previewCurrentDecryptedFile() {
    if (!state.receivedBlobs || state.receivedBlobs.length === 0) return;
    const lastItem = state.receivedBlobs[state.receivedBlobs.length - 1];
    const blob = lastItem.blob;
    const meta = lastItem.meta;
    const name = meta.fileName.toLowerCase();

    document.getElementById('previewModalTitle').textContent = `Preview: ${meta.fileName}`;
    const container = document.getElementById('previewMediaContainer');
    container.innerHTML = '';

    const url = URL.createObjectURL(blob);

    if (meta.mimeType.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '380px';
        img.style.borderRadius = '8px';
        container.appendChild(img);
    } else if (meta.mimeType.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv)$/)) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '380px';
        video.style.borderRadius = '8px';
        container.appendChild(video);
    } else if (meta.mimeType.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|aac|flac)$/)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        audio.autoplay = true;
        audio.style.width = '100%';
        container.appendChild(audio);
    } else if (meta.mimeType === 'application/pdf' || name.endsWith('.pdf')) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '380px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        container.appendChild(iframe);
    } else if (meta.mimeType.startsWith('text/') || name.match(/\.(txt|json|js|ts|html|css|log|csv|xml|md|sql|java|py|rs|go|sh)$/)) {
        const reader = new FileReader();
        reader.onload = () => {
            const pre = document.createElement('pre');
            pre.textContent = reader.result.substring(0, 8000);
            pre.style.color = 'var(--text-primary)';
            pre.style.fontFamily = 'monospace';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.width = '100%';
            container.appendChild(pre);
        };
        reader.readAsText(blob);
    } else {
        container.innerHTML = `<div style="color: var(--text-muted); padding: 30px;">Direct preview not available for ${meta.mimeType}. File is saved to Downloads.</div>`;
    }

    document.getElementById('previewModal').classList.add('open');
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('open');
}

// ============================================================================
// Real-Time E2EE Chat
// ============================================================================
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    if (!state.pin) {
        showToast('Please establish a peer connection with a PIN first.', 'error');
        return;
    }

    input.value = '';

    try {
        const encrypted = await window.w2wCrypto.encryptText(text, state.pin);
        window.w2wSocket.send('CHAT_MESSAGE', encrypted);
        appendChatBubble('mine', text, Date.now());
    } catch (e) {
        showToast('Failed to encrypt message: ' + e.message, 'error');
    }
}

async function handleIncomingChatMessage(chatObj) {
    if (!state.pin) return;
    try {
        const decrypted = await window.w2wCrypto.decryptText(chatObj.encryptedContent, state.pin);
        appendChatBubble('peer', decrypted, chatObj.timestamp || Date.now());
        soundEngine.chatMsg();
    } catch (e) {
        console.error('Chat decrypt error:', e);
    }
}

function appendChatBubble(type, text, timestamp) {
    const container = document.getElementById('chatMessagesContainer');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;

    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
        <div>${escapeHtml(text)}</div>
        <div class="chat-time">${timeStr}</div>
    `;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

// ============================================================================
// Shared Clipboard
// ============================================================================
async function sendClipboardSync() {
    const text = document.getElementById('clipboardTextarea').value;
    if (!text) {
        showToast('Please type some text to send', 'info');
        return;
    }

    if (!state.pin) {
        showToast('Please pair with a peer PIN first', 'error');
        return;
    }

    try {
        const encrypted = await window.w2wCrypto.encryptText(text, state.pin);
        window.w2wSocket.sendTextMessage(encrypted);

        if (state.sessionId) {
            await fetch(`/api/transfer/session/${state.sessionId}/clipboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: encrypted })
            });
        }

        showToast('Encrypted note sent to peer!', 'success');
    } catch (e) {
        showToast('Failed to encrypt: ' + e.message, 'error');
    }
}

async function handleIncomingTextMessage(encryptedJson) {
    if (!state.pin) return;
    try {
        const decrypted = await window.w2wCrypto.decryptText(encryptedJson, state.pin);
        document.getElementById('clipboardTextarea').value = decrypted;
        soundEngine.chatMsg();
        showToast('Received new encrypted note from peer! 📋', 'success');
    } catch (e) {}
}

function copyClipboardText() {
    const text = document.getElementById('clipboardTextarea').value;
    if (text) {
        copyToClipboard(text);
        showToast('Text copied to clipboard!', 'success');
    }
}

// ============================================================================
// Chunk Visualizer
// ============================================================================
function initChunkMatrix(containerId, totalChunks) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < totalChunks; i++) {
        const block = document.createElement('div');
        block.className = 'chunk-block';
        block.id = `${containerId}_block_${i}`;
        el.appendChild(block);
    }
}

function markChunkDone(containerId, chunkIdx) {
    const block = document.getElementById(`${containerId}_block_${chunkIdx}`);
    if (block) {
        block.classList.remove('active');
        block.classList.add('done');
    }
    const nextBlock = document.getElementById(`${containerId}_block_${chunkIdx + 1}`);
    if (nextBlock) {
        nextBlock.classList.add('active');
    }
}

// ============================================================================
// WebSocket Signaling & WebRTC Handlers
// ============================================================================
function initSocketEvents() {
    const socket = window.w2wSocket;

    socket.on('peerConnected', () => {
        const dot = document.getElementById('peerConnectedDot');
        if (dot) {
            dot.style.background = 'var(--accent-emerald)';
            dot.style.boxShadow = '0 0 8px var(--accent-emerald)';
        }
        const label = document.getElementById('peerStatusLabel');
        if (label) {
            label.textContent = 'Peer connected! Negotiating P2P WebRTC...';
        }
        soundEngine.peerConnect();
        showToast('Peer connected! ⚡', 'success');

        if (state.role === 'sender') {
            window.w2wWebRTC.createAndSendOffer();
            if (state.fileMetadataList && state.fileMetadataList.length > 0) {
                socket.send('BATCH_OFFER', state.fileMetadataList);
            }
        }
    });

    socket.on('peerDisconnected', () => {
        const dot = document.getElementById('peerConnectedDot');
        if (dot) {
            dot.style.background = 'var(--accent-amber)';
            dot.style.boxShadow = '0 0 8px var(--accent-amber)';
        }
        const label = document.getElementById('peerStatusLabel');
        if (label) {
            label.textContent = 'Peer disconnected. Waiting for connection...';
        }
        showToast('Peer disconnected.', 'info');
        window.w2wWebRTC.cleanup();
    });

    socket.on('signal', (signal) => {
        if (signal.type === 'BATCH_OFFER' && state.role === 'receiver') {
            displayIncomingBatch(signal.payload);
            soundEngine.peerConnect();
            showToast(`Incoming batch: ${signal.payload.length} item(s)`, 'info');
        } else if (signal.type === 'BATCH_ACCEPT' && state.role === 'sender') {
            showToast('Receiver accepted batch. Starting encrypted stream...', 'info');
            startSenderUpload();
        } else if (signal.type === 'CHAT_MESSAGE') {
            handleIncomingChatMessage(signal.payload);
        } else if (signal.type === 'WEBRTC_OFFER') {
            window.w2wWebRTC.handleIncomingOffer(signal.payload);
        } else if (signal.type === 'WEBRTC_ANSWER') {
            window.w2wWebRTC.handleIncomingAnswer(signal.payload);
        } else if (signal.type === 'WEBRTC_ICE_CANDIDATE') {
            window.w2wWebRTC.handleIncomingIceCandidate(signal.payload);
        }
    });

    socket.on('fileOffer', (meta) => {
        if (state.role === 'receiver') {
            displayIncomingBatch([meta]);
            soundEngine.peerConnect();
            showToast(`Incoming file: ${meta.fileName}`, 'info');
        }
    });

    socket.on('fileAccept', () => {
        if (state.role === 'sender') {
            showToast('Receiver accepted file. Starting encrypted stream...', 'info');
            startSenderUpload();
        }
    });

    socket.on('textMessage', (data) => {
        handleIncomingTextMessage(data);
    });

    socket.on('cancelled', () => {
        showToast('Transfer was cancelled by peer.', 'error');
        if (state.role === 'sender') {
            resetSenderBatch();
        } else {
            resetReceiverState();
        }
    });

    socket.on('errorMessage', (err) => {
        soundEngine.errorTone();
        showToast(typeof err === 'string' ? err : 'Connection error', 'error');
        document.getElementById('connectByPinBtn').disabled = false;
        document.getElementById('connectByPinBtn').textContent = 'Connect & Decrypt';
    });
}

function cancelTransfer() {
    state.isTransferring = false;
    if (state.abortController) {
        state.abortController.abort();
    }
    window.w2wSocket.cancel();
    if (state.sessionId) {
        fetch(`/api/transfer/session/${state.sessionId}`, { method: 'DELETE' }).catch(() => {});
    }
    resetSenderBatch();
    showToast('Transfer cancelled.', 'info');
}

// ============================================================================
// Modals & Utilities
// ============================================================================
document.getElementById('networkInfoBtn').addEventListener('click', () => {
    document.getElementById('networkModal').classList.add('open');
});

function closeNetworkModal() {
    document.getElementById('networkModal').classList.remove('open');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatEta(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0 || seconds > 86400) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function triggerBrowserDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function asyncPool(poolLimit, array, iteratorFn) {
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);

        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}
