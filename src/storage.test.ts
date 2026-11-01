import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, STORAGE_KEY, load, parseState, save } from './storage';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('storage', () => {
  it('round trips state', () => {
    const s = memStore();
    const state = { target: 80, subjects: [{ id: 'x', name: 'DBMS', attended: 10, total: 12 }] };
    save(state, s);
    expect(load(s)).toEqual(state);
  });
  it('falls back to defaults on missing or broken data', () => {
    const s = memStore();
    expect(load(s)).toEqual(DEFAULT_STATE);
    s.setItem(STORAGE_KEY, '{oops');
    expect(load(s)).toEqual(DEFAULT_STATE);
  });
  it('rejects invalid imports with a reason', () => {
    expect(() => parseState('{"target":150,"subjects":[]}')).toThrow(/Target/);
    expect(() => parseState('{"target":75,"subjects":[{"name":"OS","attended":5,"total":3}]}')).toThrow(/invalid counts/);
    expect(() => parseState('{"target":75,"subjects":[{"name":" ","attended":1,"total":3}]}')).toThrow(/no name/);
  });
  it('fills in missing ids and trims names', () => {
    const st = parseState('{"target":75,"subjects":[{"name":"  CN ","attended":1,"total":2}]}');
    expect(st.subjects[0].name).toBe('CN');
    expect(st.subjects[0].id).toMatch(/\w+/);
  });
});
