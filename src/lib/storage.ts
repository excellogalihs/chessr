import type { Repertoire } from './types';

const STORAGE_KEY = 'chessr:state:v1';
const MUTE_KEY = 'chessr:muted';
const ACTIVITY_KEY = 'chessr:activity:v1';

export interface PersistedState {
  repertoires: Repertoire[];
}

export function loadRepertoires(): Repertoire[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.repertoires)) return [];
    return parsed.repertoires
      .filter((rep) => rep && typeof rep.id === 'string' && typeof rep.pgn === 'string')
      .map((rep) => ({
        ...rep,
        stats: rep.stats ?? {},
        sessions: rep.sessions ?? 0,
        lastTrainedAt: rep.lastTrainedAt ?? null,
        createdAt: rep.createdAt ?? Date.now(),
        updatedAt: rep.updatedAt ?? Date.now(),
      }));
  } catch {
    return [];
  }
}

export function saveRepertoires(repertoires: Repertoire[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ repertoires }));
  } catch {
    // Storage can be full or unavailable (private mode). Keep the app running.
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

export type Activity = Record<string, number>;

export function loadActivity(): Activity {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Activity;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveActivity(activity: Activity): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  } catch {
    // ignore
  }
}

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayStreak(activity: Activity): number {
  const cursor = new Date();
  if (!activity[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activity[dateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
