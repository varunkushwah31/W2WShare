import JSZip from 'jszip'

export interface ZipFileEntry {
  name: string
  relativePath?: string
  blob: Blob
}

const PRECOMPRESSED_EXTENSIONS = new Set([
  'zip', 'gz', 'tar', 'bz2', '7z', 'rar', 'xz',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif',
  'mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv',
  'mp3', 'aac', 'flac', 'ogg', 'm4a', 'opus',
  'pdf', 'docx', 'xlsx', 'pptx',
])

export class ZipArchiver {
  /**
   * Bundles multiple blobs or folder trees into a single structured .ZIP archive.
   * Employs adaptive compression: skips redundant DEFLATE compression for pre-compressed
   * media (photos, videos, archives) or large archives to maximize bundling throughput.
   */
  public static async createZip(
    files: ZipFileEntry[],
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const zip = new JSZip()
    let totalBytes = 0
    let precompressedBytes = 0

    for (const item of files) {
      const entryPath = item.relativePath && item.relativePath.trim().length > 0
        ? item.relativePath
        : item.name

      const ext = entryPath.split('.').pop()?.toLowerCase() || ''
      const size = item.blob.size || 0
      totalBytes += size
      if (PRECOMPRESSED_EXTENSIONS.has(ext)) {
        precompressedBytes += size
      }

      // Add file to ZIP preserving folder structure
      zip.file(entryPath, item.blob)
    }

    const isMostlyPrecompressed = totalBytes > 0 && (precompressedBytes / totalBytes) >= 0.4
    const isLargePayload = totalBytes > 25 * 1024 * 1024

    // Use STORE for media and large batches to prevent mobile tab crashes and CPU freezing
    const compression = isMostlyPrecompressed || isLargePayload ? 'STORE' : 'DEFLATE'
    const compressionOptions = compression === 'DEFLATE' ? { level: 2 } : undefined

    return await zip.generateAsync(
      {
        type: 'blob',
        compression,
        compressionOptions,
      },
      (metadata) => {
        if (onProgress) {
          onProgress(Math.round(metadata.percent))
        }
      }
    )
  }

  /**
   * Triggers client-side browser download for a generated zip blob
   */
  public static downloadBlob(blob: Blob, fileName = 'w2w-transfer-archive.zip') {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}
