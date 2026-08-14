/**
 * W2W Share - Offline Web Audio API Synthesizer
 * Zero external audio assets required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null
  public soundEnabled = true

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
  }

  playTone(
    freq: number,
    type: OscillatorType = 'sine',
    duration = 0.15,
    gainVal = 0.08
  ) {
    if (!this.soundEnabled) return
    try {
      this.init()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + duration)
    } catch {
      // Ignore audio errors if blocked
    }
  }

  peerConnect() {
    this.playTone(523.25, 'sine', 0.1, 0.06)
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.06), 100)
  }

  transferComplete() {
    this.playTone(523.25, 'triangle', 0.1, 0.08)
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.08), 100)
    setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.08), 200)
  }

  chatMsg() {
    this.playTone(880, 'sine', 0.08, 0.04)
  }

  errorTone() {
    this.playTone(220, 'sawtooth', 0.25, 0.08)
  }
}

export const soundEngine = new SoundEngine()
