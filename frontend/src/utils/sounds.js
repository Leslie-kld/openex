const ctx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null

function beep({ frequency = 880, duration = 0.08, type = 'sine', gain = 0.3 }) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()
  osc.connect(vol)
  vol.connect(ctx.destination)
  osc.type = type
  osc.frequency.value = frequency
  vol.gain.setValueAtTime(gain, ctx.currentTime)
  vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

export function playBuy() {
  // Rising two-tone — confirms execution
  beep({ frequency: 660, duration: 0.06, type: 'square', gain: 0.15 })
  setTimeout(() => beep({ frequency: 880, duration: 0.1, type: 'square', gain: 0.15 }), 60)
}

export function playSell() {
  // Falling two-tone
  beep({ frequency: 880, duration: 0.06, type: 'square', gain: 0.15 })
  setTimeout(() => beep({ frequency: 660, duration: 0.1, type: 'square', gain: 0.15 }), 60)
}

export function playError() {
  beep({ frequency: 220, duration: 0.2, type: 'sawtooth', gain: 0.1 })
}

export function playFilled() {
  // Three quick ascending tones — trade executed
  beep({ frequency: 523, duration: 0.05, gain: 0.2 })
  setTimeout(() => beep({ frequency: 659, duration: 0.05, gain: 0.2 }), 55)
  setTimeout(() => beep({ frequency: 784, duration: 0.1, gain: 0.2 }), 110)
}