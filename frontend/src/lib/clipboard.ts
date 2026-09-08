/**
 * W2W Share - Universal Resilient Clipboard Utility
 * Safely copies text in both secure contexts (HTTPS/localhost) and
 * insecure contexts (LAN IP access http://192.168.x.x:8080) with
 * legacy document.execCommand fallback. Never throws or rejects.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // 1. Try modern async Clipboard API if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Modern API may reject on insecure origins or permission restrictions; fall through to legacy fallback
    }
  }

  // 2. Legacy fallback for insecure HTTP LAN origins
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      // Prevent zooming or scrolling on mobile devices
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '0'
      textarea.style.width = '2em'
      textarea.style.height = '2em'
      textarea.style.padding = '0'
      textarea.style.border = 'none'
      textarea.style.outline = 'none'
      textarea.style.boxShadow = 'none'
      textarea.style.background = 'transparent'
      textarea.style.opacity = '0'
      textarea.setAttribute('readonly', '')

      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)

      const successful = document.execCommand('copy')
      textarea.remove()
      return successful
    } catch {
      // Ignore fallback failures
    }
  }

  return false
}
