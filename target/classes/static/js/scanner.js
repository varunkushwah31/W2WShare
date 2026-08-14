/**
 * W2W Share - Offline In-Browser Camera QR Code Scanner
 * Uses native BarcodeDetector API when available with webcam fallback.
 * 100% offline, zero external libraries.
 */
class W2WScanner {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isScanning = false;
        this.onScanCallback = null;
        this.animFrameId = null;
        this.barcodeDetector = null;

        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
                this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            } catch (e) {
                console.warn('[W2WScanner] BarcodeDetector init failed:', e);
            }
        }
    }

    async start(videoElement, onScan) {
        this.video = videoElement;
        this.onScanCallback = onScan;
        this.isScanning = true;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
            this.scanFrame();
        } catch (err) {
            console.error('[W2WScanner] Camera access error:', err);
            throw new Error('Camera access failed or permission denied: ' + err.message);
        }
    }

    async scanFrame() {
        if (!this.isScanning || !this.video) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            if (this.barcodeDetector) {
                try {
                    const barcodes = await this.barcodeDetector.detect(this.video);
                    if (barcodes && barcodes.length > 0) {
                        const rawValue = barcodes[0].rawValue;
                        if (rawValue && this.onScanCallback) {
                            this.stop();
                            this.onScanCallback(rawValue);
                            return;
                        }
                    }
                } catch (e) {}
            }
        }

        this.animFrameId = requestAnimationFrame(() => this.scanFrame());
    }

    stop() {
        this.isScanning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
    }
}

window.w2wScanner = new W2WScanner();
