import { isValidCounts, type Subject } from './attendance';

export interface AppState {
  target: number;
  subjects: Subject[];
}

export const STORAGE_KEY = 'bunkwise:v1';
export const DEFAULT_STATE: AppState = { target: 75, subjects: [] };

export function isValidTarget(t: unknown): t is number {
  return typeof t === 'number' && Number.isInteger(t) && t >= 1 && t <= 100;
}

/** Parses untrusted JSON (localStorage or an imported file). Throws on bad data. */
export function parseState(raw: string): AppState {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Not a bunkwise file.');
  if (!isValidTarget(data.target)) throw new Error('Target must be a whole number from 1 to 100.');
  if (!Array.isArray(data.subjects)) throw new Error('Missing subjects list.');
  const subjects: Subject[] = data.subjects.map((s: unknown, i: number) => {
    const o = s as Record<string, unknown>;
    if (!o || typeof o.name !== 'string' || !o.name.trim())
      throw new Error(`Subject ${i + 1} has no name.`);
    const attended = o.attended as number;
    const total = o.total as number;
    if (!isValidCounts(attended, total))
      throw new Error(`Subject "${o.name}" has invalid counts.`);
    return {
      id: typeof o.id === 'string' && o.id ? o.id : newId(),
      name: o.name.trim().slice(0, 60),
      attended,
      total,
    };
  });
  return { target: data.target, subjects };
}

export function load(store: Pick<Storage, 'getItem'> = localStorage): AppState {
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? parseState(raw) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function save(state: AppState, store: Pick<Storage, 'setItem'> = localStorage) {
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
