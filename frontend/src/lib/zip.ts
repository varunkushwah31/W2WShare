import JSZip from 'jszip'

export interface ZipFileEntry {
  name: string
  relativePath?: string
  blob: Blob
}

export class ZipArchiver {
  /**
   * Bundles multiple blobs or folder trees into a single structured .ZIP archive
   */
  public static async createZip(
    files: ZipFileEntry[],
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const zip = new JSZip()

    for (const item of files) {
      const entryPath = item.relativePath && item.relativePath.trim().length > 0
        ? item.relativePath
        : item.name

      // Add file to ZIP preserving folder structure
      zip.file(entryPath, item.blob)
    }

    return await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6,
        },
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
