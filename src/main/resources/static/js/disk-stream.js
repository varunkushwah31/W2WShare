/**
 * W2W Share - Direct-to-Disk File Streaming
 * Streams decrypted chunks directly to local storage using the File System Access API.
 * Enables zero-RAM overhead transfers for multi-gigabyte files (10GB+).
 */
class W2WDiskStreamer {
    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
        this.activeHandles = new Map(); // fileIndex -> { fileHandle, writableStream }
    }

    async createWritableStream(suggestedName) {
        if (!this.isSupported) return null;

        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName
            });
            const writable = await handle.createWritable();
            return { handle, writable };
        } catch (e) {
            console.warn('[DiskStream] User cancelled or disk stream error:', e);
            return null;
        }
    }

    async writeChunk(writable, chunkArrayBuffer) {
        if (!writable) return;
        await writable.write(chunkArrayBuffer);
    }

    async closeStream(writable) {
        if (!writable) return;
        try {
            await writable.close();
        } catch (e) {
            console.warn('[DiskStream] Error closing writable stream:', e);
        }
    }
}

window.w2wDiskStreamer = new W2WDiskStreamer();
