import { describe, expect, it } from 'vitest';
import {
  classesNeeded, isValidCounts, overall, percentage, projectPercentage,
  safeSkips, status, summary,
} from './attendance';

describe('percentage', () => {
  it('returns null with no classes', () => expect(percentage(0, 0)).toBeNull());
  it('computes a ratio', () => expect(percentage(30, 40)).toBe(75));
});

describe('safeSkips', () => {
  it('counts skips that keep you at target', () => {
    expect(safeSkips(30, 30, 75)).toBe(10); // 30/40 = 75%
    expect(safeSkips(36, 40, 75)).toBe(8); // 36/48 = 75%
  });
  it('is zero when short or exactly on the line', () => {
    expect(safeSkips(20, 40, 75)).toBe(0);
    expect(safeSkips(30, 40, 75)).toBe(0);
  });
  it('never makes you go below target', () => {
    for (let a = 0; a <= 60; a++) for (let t = a; t <= 60; t++) {
      const k = safeSkips(a, t, 75);
      if (k > 0) {
        expect(100 * a).toBeGreaterThanOrEqual(75 * (t + k));
        expect(100 * a).toBeLessThan(75 * (t + k + 1));
      }
    }
  });
});

describe('classesNeeded', () => {
  it('is zero when already at target', () => expect(classesNeeded(30, 40, 75)).toBe(0));
  it('computes recovery classes', () => {
    expect(classesNeeded(20, 40, 75)).toBe(40); // 60/80
    expect(classesNeeded(29, 40, 75)).toBe(4); // 33/44
  });
  it('is minimal for every case', () => {
    for (let a = 0; a <= 50; a++) for (let t = a; t <= 50; t++) {
      const n = classesNeeded(a, t, 80);
      expect(100 * (a + n)).toBeGreaterThanOrEqual(80 * (t + n));
      if (n > 0) expect(100 * (a + n - 1)).toBeLessThan(80 * (t + n - 1));
    }
  });
  it('is Infinity for an unreachable 100% target', () =>
    expect(classesNeeded(9, 10, 100)).toBe(Infinity));
});

describe('status and summary', () => {
  it('classifies', () => {
    expect(status(0, 0, 75)).toBe('empty');
    expect(status(20, 40, 75)).toBe('short');
    expect(status(30, 40, 75)).toBe('edge');
    expect(status(39, 40, 75)).toBe('safe');
  });
  it('writes readable text', () => {
    expect(summary(29, 40, 75)).toBe('Attend the next 4 classes to reach 75%.');
    expect(summary(31, 40, 75)).toBe('You can miss 1 class and stay at or above 75%.');
    expect(summary(9, 10, 100)).toBe('You can no longer reach 100%.');
  });
});

describe('helpers', () => {
  it('projects', () => expect(projectPercentage(30, 40, 5, 5)).toBe(70));
  it('validates counts', () => {
    expect(isValidCounts(3, 5)).toBe(true);
    expect(isValidCounts(6, 5)).toBe(false);
    expect(isValidCounts(-1, 5)).toBe(false);
    expect(isValidCounts(1.5, 5)).toBe(false);
  });
  it('sums subjects', () =>
    expect(overall([
      { id: 'a', name: 'A', attended: 3, total: 4 },
      { id: 'b', name: 'B', attended: 5, total: 6 },
    ])).toEqual({ attended: 8, total: 10 }));
});
