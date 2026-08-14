/**
 * W2W Share - Client-Side Pre-Encryption Compression
 * Uses native CompressionStream('gzip') and DecompressionStream('gzip')
 * Reduces transfer volume by up to 80% on source code, logs, and text documents.
 * 100% offline, zero external dependencies.
 */
class W2WCompressor {
    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'CompressionStream' in window && 'DecompressionStream' in window;
        this.compressibleExtensions = new Set([
            'txt', 'json', 'js', 'ts', 'html', 'htm', 'css', 'scss',
            'csv', 'xml', 'md', 'log', 'sql', 'java', 'py', 'c', 'cpp',
            'h', 'rs', 'go', 'sh', 'bat', 'yaml', 'yml', 'svg'
        ]);
    }

    shouldCompress(fileName, mimeType) {
        if (!this.isSupported) return false;
        if (mimeType && (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml'))) {
            return true;
        }
        const ext = fileName.split('.').pop().toLowerCase();
        return this.compressibleExtensions.has(ext);
    }

    async compressBuffer(arrayBuffer) {
        if (!this.isSupported) return arrayBuffer;
        try {
            const stream = new Response(arrayBuffer).body.pipeThrough(new CompressionStream('gzip'));
            return await new Response(stream).arrayBuffer();
        } catch (e) {
            console.warn('[Compressor] Compression failed, using uncompressed buffer:', e);
            return arrayBuffer;
        }
    }

    async decompressBuffer(arrayBuffer) {
        if (!this.isSupported) return arrayBuffer;
        try {
            const stream = new Response(arrayBuffer).body.pipeThrough(new DecompressionStream('gzip'));
            return await new Response(stream).arrayBuffer();
        } catch (e) {
            console.warn('[Compressor] Decompression failed:', e);
            return arrayBuffer;
        }
    }
}

window.w2wCompressor = new W2WCompressor();
