export type FileCategoryType = 'image' | 'video' | 'audio' | 'archive' | 'code' | 'document' | 'other'

export const detectFileTypeCategory = (fileName: string, mimeType: string): FileCategoryType => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video'
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio'
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'].includes(ext)) return 'archive'
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'json', 'html', 'css', 'yml', 'yaml', 'xml', 'md', 'sql', 'sh'].includes(ext)) return 'code'
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(ext)) return 'document'
  return 'other'
}

/**
 * Calculates optimal chunk size capped at 2MB (matching backend AppConstants.DEFAULT_CHUNK_SIZE)
 * Ensures low memory footprint, non-blocking WebCrypto AES-GCM operations,
 * and rapid packet delivery without timeouts.
 */
export const calculateOptimalChunkSize = (fileSize?: number): number => {
  if (fileSize && fileSize > 1024 * 1024 * 1024) {
    return 2 * 1024 * 1024
  }
  return 2 * 1024 * 1024
}

