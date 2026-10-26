type Sound = 'move' | 'correct' | 'wrong' | 'win';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  context: AudioContext,
  frequency: number,
  offset: number,
  duration: number,
  type: OscillatorType,
  volume: number,
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSound(sound: Sound, muted: boolean): void {
  if (muted) return;
  const context = audio();
  if (!context) return;
  switch (sound) {
    case 'move':
      tone(context, 520, 0, 0.055, 'triangle', 0.035);
      tone(context, 330, 0.018, 0.05, 'sine', 0.025);
      break;
    case 'correct':
      tone(context, 523.25, 0, 0.12, 'sine', 0.05);
      tone(context, 659.25, 0.08, 0.14, 'sine', 0.045);
      tone(context, 783.99, 0.17, 0.18, 'sine', 0.04);
      break;
    case 'wrong':
      tone(context, 196, 0, 0.16, 'triangle', 0.045);
      tone(context, 155.56, 0.07, 0.2, 'sine', 0.035);
      break;
    case 'win':
      tone(context, 523.25, 0, 0.14, 'sine', 0.045);
      tone(context, 659.25, 0.1, 0.14, 'sine', 0.045);
      tone(context, 783.99, 0.2, 0.16, 'sine', 0.04);
      tone(context, 1046.5, 0.3, 0.3, 'sine', 0.035);
      break;
  }
}
