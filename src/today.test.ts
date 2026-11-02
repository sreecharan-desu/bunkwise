import { describe, expect, it } from 'vitest';
import { skipToday } from './attendance';

const mk = (id: string, attended: number, total: number) => ({ id, name: id, attended, total });

describe('skipToday', () => {
  it('matches brute force for every small case', () => {
    for (let total = 0; total <= 40; total++)
      for (let attended = 0; attended <= total; attended++)
        for (const target of [50, 65, 75, 85]) {
          const [v] = skipToday([mk('a', attended, total)], target);
          const ok = 100 * attended >= target * (total + 1);
          expect(v.canSkip).toBe(ok);
          if (ok) expect(100 * attended >= target * (total + 1 + v.leftAfter)).toBe(true);
          if (ok) expect(100 * attended >= target * (total + 2 + v.leftAfter)).toBe(false);
        }
  });
  it('reports the percentage after skipping', () => {
    const [v] = skipToday([mk('a', 3, 3)], 75);
    expect(v.ifSkipped).toBe(75);
    expect(v.canSkip).toBe(true);
    expect(v.leftAfter).toBe(0);
  });
});
