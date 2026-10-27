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

const cache = new Map<Sound, HTMLAudioElement>();

function base(name: Sound): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let el = cache.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.mp3`);
    el.preload = 'auto';
    cache.set(name, el);
  }
  return el;
}

export function preloadSounds(): void {
  (['move-self', 'move-opponent', 'capture', 'castle', 'move-check', 'promote', 'illegal', 'notify'] as Sound[]).forEach(
    (s) => base(s)?.load(),
  );
}

function play(name: Sound, muted: boolean) {
  if (muted) return;
  const el = base(name);
  if (!el) return;
  const node = el.cloneNode(true) as HTMLAudioElement;
  void node.play().catch(() => {});
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
