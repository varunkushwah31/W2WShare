/**
 * W2W Share - Client-Side Pre-Encryption Compression
 * CompressionStream('gzip') / DecompressionStream('gzip')
 */

export class W2WCompressor {
  private isSupported: boolean
  private compressibleExtensions: Set<string>

  constructor() {
    this.isSupported =
      typeof window !== 'undefined' &&
      'CompressionStream' in window &&
      'DecompressionStream' in window

    this.compressibleExtensions = new Set([
      'txt', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'htm', 'css', 'scss',
      'csv', 'xml', 'md', 'log', 'sql', 'java', 'py', 'c', 'cpp',
      'h', 'rs', 'go', 'sh', 'bat', 'yaml', 'yml', 'svg'
    ])
  }

  shouldCompress(fileName: string, mimeType?: string): boolean {
    if (!this.isSupported) return false
    if (
      mimeType &&
      (mimeType.startsWith('text/') ||
        mimeType.includes('json') ||
        mimeType.includes('javascript') ||
        mimeType.includes('xml'))
    ) {
      return true
    }
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return this.compressibleExtensions.has(ext)
  }

  async compressBuffer(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.isSupported) return arrayBuffer
    try {
      const stream = new Response(arrayBuffer).body?.pipeThrough(
        new CompressionStream('gzip')
      )
      if (!stream) return arrayBuffer
      return await new Response(stream).arrayBuffer()
    } catch (e) {
      console.warn('[Compressor] Gzip compression failed, using original:', e)
      return arrayBuffer
    }
  }

  async decompressBuffer(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.isSupported) return arrayBuffer
    try {
      const stream = new Response(arrayBuffer).body?.pipeThrough(
        new DecompressionStream('gzip')
      )
      if (!stream) return arrayBuffer
      return await new Response(stream).arrayBuffer()
    } catch (e) {
      console.warn('[Compressor] Gzip decompression failed:', e)
      return arrayBuffer
    }
  }
}

export const compressor = new W2WCompressor()
