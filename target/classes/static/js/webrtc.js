/**
 * W2W Share - Offline WebRTC Direct DataChannel Peer Connection
 * Enables zero-server-disk, true browser-to-browser P2P file transfers over LAN.
 * Features backpressure flow control for multi-gigabit line speed without memory overflow.
 * 100% self-contained, zero external libraries.
 */
class W2WWebRTC {
    constructor() {
        this.pc = null;
        this.dataChannel = null;
        this.isInitiator = false;
        this.isConnected = false;
        this.onChunkCallback = null;
        this.onStateChangeCallback = null;
        this.bufferedAmountThreshold = 1024 * 1024; // 1MB backpressure buffer threshold

        // Local LAN ICE config (no public STUN needed for LAN/Hotspot transfers)
        this.rtcConfig = {
            iceServers: []
        };
    }

    init(isInitiator, onStateChange, onChunkReceived) {
        this.isInitiator = isInitiator;
        this.onStateChangeCallback = onStateChange;
        this.onChunkCallback = onChunkReceived;
        this.cleanup();

        try {
            const PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
            if (!PeerConnection) {
                console.warn('[WebRTC] RTCPeerConnection not supported in this browser.');
                if (this.onStateChangeCallback) this.onStateChangeCallback('unsupported');
                return false;
            }

            this.pc = new PeerConnection(this.rtcConfig);

            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.w2wSocket.send('WEBRTC_ICE_CANDIDATE', event.candidate);
                }
            };

            this.pc.onconnectionstatechange = () => {
                console.log('[WebRTC] Connection state:', this.pc.connectionState);
                if (this.pc.connectionState === 'connected') {
                    this.isConnected = true;
                    if (this.onStateChangeCallback) this.onStateChangeCallback('connected');
                } else if (['disconnected', 'failed', 'closed'].includes(this.pc.connectionState)) {
                    this.isConnected = false;
                    if (this.onStateChangeCallback) this.onStateChangeCallback(this.pc.connectionState);
                }
            };

            if (this.isInitiator) {
                this.setupDataChannel(this.pc.createDataChannel('w2w_p2p_channel', {
                    ordered: true
                }));
            } else {
                this.pc.ondatachannel = (event) => {
                    this.setupDataChannel(event.channel);
                };
            }

            return true;
        } catch (e) {
            console.error('[WebRTC] Initialization error:', e);
            if (this.onStateChangeCallback) this.onStateChangeCallback('error');
            return false;
        }
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        this.dataChannel.binaryType = 'arraybuffer';
        this.dataChannel.bufferedAmountLowThreshold = this.bufferedAmountThreshold;

        this.dataChannel.onopen = () => {
            console.log('[WebRTC] DataChannel OPENED! P2P direct transfer ready.');
            this.isConnected = true;
            if (this.onStateChangeCallback) this.onStateChangeCallback('datachannel_open');
        };

        this.dataChannel.onclose = () => {
            console.log('[WebRTC] DataChannel closed.');
            this.isConnected = false;
            if (this.onStateChangeCallback) this.onStateChangeCallback('datachannel_closed');
        };

        this.dataChannel.onerror = (err) => {
            console.warn('[WebRTC] DataChannel error:', err);
        };

        this.dataChannel.onmessage = (event) => {
            if (this.onChunkCallback && event.data) {
                this.onChunkCallback(event.data);
            }
        };
    }

    async createAndSendOffer() {
        if (!this.pc) return;
        try {
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            window.w2wSocket.send('WEBRTC_OFFER', offer);
        } catch (e) {
            console.warn('[WebRTC] Failed to create offer:', e);
        }
    }

    async handleIncomingOffer(offer) {
        if (!this.pc) this.init(false, this.onStateChangeCallback, this.onChunkCallback);
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            window.w2wSocket.send('WEBRTC_ANSWER', answer);
        } catch (e) {
            console.warn('[WebRTC] Failed to handle offer:', e);
        }
    }

    async handleIncomingAnswer(answer) {
        if (!this.pc) return;
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.warn('[WebRTC] Failed to set remote description:', e);
        }
    }

    async handleIncomingIceCandidate(candidate) {
        if (!this.pc) return;
        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('[WebRTC] Failed to add ICE candidate:', e);
        }
    }

    // High throughput backpressure sender
    async sendBuffer(arrayBuffer) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('DataChannel is not open');
        }

        if (this.dataChannel.bufferedAmount > this.bufferedAmountThreshold) {
            await new Promise(resolve => {
                const onLow = () => {
                    this.dataChannel.removeEventListener('bufferedamountlow', onLow);
                    resolve();
                };
                this.dataChannel.addEventListener('bufferedamountlow', onLow);
            });
        }

        this.dataChannel.send(arrayBuffer);
    }

    cleanup() {
        if (this.dataChannel) {
            try { this.dataChannel.close(); } catch (e) {}
            this.dataChannel = null;
        }
        if (this.pc) {
            try { this.pc.close(); } catch (e) {}
            this.pc = null;
        }
        this.isConnected = false;
    }
}

window.w2wWebRTC = new W2WWebRTC();
