/**
 * W2W Share - Offline WebSocket Signaling Client
 */
class W2WSocket {
    constructor() {
        this.ws = null;
        this.sessionId = null;
        this.pin = null;
        this.role = null; // 'sender' or 'receiver'
        this.handlers = {};
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.isExplicitlyClosed = false;
    }

    on(event, callback) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(callback);
    }

    emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`[W2WSocket] Error in handler for event '${event}':`, e);
                }
            });
        }
    }

    connect() {
        this.isExplicitlyClosed = false;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/signal`;

        console.log(`[W2WSocket] Connecting to ${wsUrl}...`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[W2WSocket] Connected.');
            this.reconnectAttempts = 0;
            this.emit('open');

            // Re-register session if resuming
            if (this.role === 'sender' && this.sessionId) {
                this.registerSender(this.sessionId);
            } else if (this.role === 'receiver' && this.pin) {
                this.joinByPin(this.pin);
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const signal = JSON.parse(event.data);
                this.handleSignal(signal);
            } catch (e) {
                console.error('[W2WSocket] Failed to parse message:', event.data, e);
            }
        };

        this.ws.onclose = (event) => {
            console.warn('[W2WSocket] Connection closed:', event.code, event.reason);
            this.emit('close', event);
            if (!this.isExplicitlyClosed) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (err) => {
            console.error('[W2WSocket] Error:', err);
            this.emit('error', err);
        };
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
        this.reconnectAttempts++;
        console.log(`[W2WSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    send(type, payload = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[W2WSocket] WebSocket is not open. Message queued or dropped:', type);
            return false;
        }

        const msg = {
            type,
            sessionId: this.sessionId,
            pin: this.pin,
            senderId: this.role || 'client',
            payload,
            timestamp: Date.now()
        };

        this.ws.send(JSON.stringify(msg));
        return true;
    }

    registerSender(sessionId) {
        this.role = 'sender';
        this.sessionId = sessionId;
        this.send('REGISTER_SENDER', { sessionId });
    }

    joinByPin(pin) {
        this.role = 'receiver';
        this.pin = pin.trim();
        this.send('JOIN_BY_PIN', { pin: this.pin });
    }

    offerFile(metadata) {
        this.send('FILE_OFFER', metadata);
    }

    acceptFile() {
        this.send('FILE_ACCEPT', { accepted: true });
    }

    notifyChunkUploaded(chunkIndex, totalChunks) {
        this.send('CHUNK_UPLOADED', { chunkIndex, totalChunks });
    }

    sendProgress(percent, speedMbps, bytesTransferred) {
        this.send('PROGRESS', { percent, speedMbps, bytesTransferred });
    }

    sendTextMessage(encryptedText) {
        this.send('TEXT_MESSAGE', encryptedText);
    }

    notifyComplete() {
        this.send('TRANSFER_COMPLETE', { complete: true });
    }

    cancel() {
        this.send('CANCEL', {});
    }

    close() {
        this.isExplicitlyClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    handleSignal(signal) {
        const type = signal.type;
        this.emit('signal', signal);

        switch (type) {
            case 'REGISTERED':
                this.emit('registered', signal);
                break;
            case 'JOINED':
                this.sessionId = signal.sessionId;
                this.emit('joined', signal);
                break;
            case 'PEER_CONNECTED':
                this.emit('peerConnected', signal);
                break;
            case 'PEER_DISCONNECTED':
                this.emit('peerDisconnected', signal);
                break;
            case 'FILE_OFFER':
                this.emit('fileOffer', signal.payload);
                break;
            case 'FILE_ACCEPT':
                this.emit('fileAccept', signal.payload);
                break;
            case 'CHUNK_READY':
                this.emit('chunkReady', signal.payload);
                break;
            case 'PROGRESS':
                this.emit('progress', signal.payload);
                break;
            case 'TEXT_MESSAGE':
                this.emit('textMessage', signal.payload);
                break;
            case 'TRANSFER_COMPLETE':
                this.emit('complete', signal.payload);
                break;
            case 'CANCEL':
                this.emit('cancelled', signal.payload);
                break;
            case 'ERROR':
                this.emit('errorMessage', signal.payload);
                break;
            default:
                console.log('[W2WSocket] Signal received:', type, signal);
        }
    }
}

window.w2wSocket = new W2WSocket();
