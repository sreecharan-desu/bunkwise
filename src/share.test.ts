import { describe, expect, it } from 'vitest';
import { planText } from './share';
import { summary } from './attendance';

describe('planText', () => {
  it('is empty with no subjects', () => expect(planText([], 75)).toBe(''));
  it('lists overall and each subject', () => {
    const t = planText([
      { id: 'a', name: 'OS', attended: 30, total: 40 },
      { id: 'b', name: 'CN', attended: 10, total: 10 },
    ], 75);
    const lines = t.split('\n');
    expect(lines[0]).toBe('My attendance plan (target 75%)');
    expect(lines[1]).toBe('Overall: 80.0% (40/50)');
    expect(lines[2]).toBe(`- OS: ${summary(30, 40, 75)}`);
    expect(lines[3]).toBe(`- CN: ${summary(10, 10, 75)}`);
    expect(lines.at(-1)).toBe('Made with bunkwise');
  });
  it('shows -- when no classes are held', () =>
    expect(planText([{ id: 'a', name: 'X', attended: 0, total: 0 }], 75).split('\n')[1]).toBe('Overall: -- (0/0)'));
});
