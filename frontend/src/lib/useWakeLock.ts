import { useRef, useCallback, useEffect } from 'react'

/**
 * Screen WakeLock Hook to prevent mobile phones and tablets from sleeping
 * during sustained P2P cryptographic transfers and large file downloads.
 */
export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch (e) {
        console.debug('[WakeLock] Request denied or unsupported:', e)
      }
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch {
        // Suppress release failures if already released
      }
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    if (active) {
      void acquireWakeLock()
    } else {
      void releaseWakeLock()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        void acquireWakeLock()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void releaseWakeLock()
    }
  }, [active, acquireWakeLock, releaseWakeLock])

  return { acquireWakeLock, releaseWakeLock }
}
