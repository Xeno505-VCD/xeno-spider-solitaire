// XENO Spider Solitaire - Audio Manager
// Web Audio API programmatic sound effects (no external files)

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

export function playCardFlip(): void {
  // Short crisp noise burst
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.15;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start();
  } catch { /* ignore */ }
}

export function playSequenceComplete(): void {
  // Ascending arpeggio
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'triangle', 0.12), i * 80);
  });
}

export function playVictory(): void {
  // C major chord arpeggio
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]; // C5 E5 G5 C6 G5 C6 E6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', 0.1), i * 100);
  });
}

export function playInvalid(): void {
  playTone(200, 0.1, 'square', 0.05);
}

export function playDealCards(): void {
  // 10 fast notes for 10 cards
  for (let i = 0; i < 10; i++) {
    setTimeout(() => playTone(300 + i * 30, 0.05, 'sine', 0.06), i * 30);
  }
}