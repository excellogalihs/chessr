import { publicAsset } from './assets';

// chess.com default sound set (served from /public/sounds).
type Sound =
  | 'move-self'
  | 'move-opponent'
  | 'capture'
  | 'castle'
  | 'move-check'
  | 'promote'
  | 'illegal'
  | 'notify';

const ALL: Sound[] = [
  'move-self',
  'move-opponent',
  'capture',
  'castle',
  'move-check',
  'promote',
  'illegal',
  'notify',
];

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
const files = new Map<Sound, Promise<ArrayBuffer | null>>();
const buffers = new Map<Sound, AudioBuffer>();
const decoding = new Map<Sound, Promise<AudioBuffer | null>>();

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  return context;
}

function fetchFile(name: Sound): Promise<ArrayBuffer | null> {
  let pending = files.get(name);
  if (!pending) {
    pending = fetch(publicAsset(`sounds/${name}.mp3`))
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    files.set(name, pending);
  }
  return pending;
}

async function decode(name: Sound): Promise<AudioBuffer | null> {
  const existing = buffers.get(name);
  if (existing) return existing;
  const pending = decoding.get(name);
  if (pending) return pending;

  const task = (async () => {
    const ctx = audioContext();
    const data = await fetchFile(name);
    if (!ctx || !data) return null;
    const buffer = await ctx.decodeAudioData(data.slice(0));
    buffers.set(name, buffer);
    return buffer;
  })()
    .catch(() => null)
    .finally(() => decoding.delete(name));

  decoding.set(name, task);
  return task;
}

/** Must run inside a click/tap/key so HTTPS pages (GitHub Pages) can start audio. */
export function unlockAudio(): void {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  ALL.forEach((name) => {
    void decode(name);
  });
}

export function preloadSounds(): void {
  ALL.forEach((name) => {
    void fetchFile(name);
  });
}

function play(name: Sound, muted: boolean) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  void (async () => {
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = await decode(name);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  })().catch(() => {});
}

/** Pick the chess.com sound for a SAN move, same priority as chess.com. */
export function moveSoundFor(san: string, self: boolean): Sound {
  if (san.includes('+') || san.includes('#')) return 'move-check';
  if (san.includes('=')) return 'promote';
  if (san.includes('x')) return 'capture';
  if (san.startsWith('O-O')) return 'castle';
  return self ? 'move-self' : 'move-opponent';
}

export function playMoveSound(san: string, self: boolean, muted: boolean): void {
  play(moveSoundFor(san, self), muted);
}

export function playSound(sound: 'wrong' | 'win' | 'illegal', muted: boolean): void {
  play(sound === 'win' ? 'notify' : 'illegal', muted);
}
