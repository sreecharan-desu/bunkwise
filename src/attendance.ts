// Attendance math. Targets are whole percentages (1..100) so every
// calculation stays in integers and avoids floating point surprises.

export interface Subject {
  id: string;
  name: string;
  attended: number;
  total: number;
}

export function isValidCounts(attended: number, total: number): boolean {
  return (
    Number.isInteger(attended) &&
    Number.isInteger(total) &&
    attended >= 0 &&
    total >= 0 &&
    attended <= total
  );
}

/** Current percentage, or null when no classes have happened yet. */
export function percentage(attended: number, total: number): number | null {
  if (total === 0) return null;
  return (attended / total) * 100;
}

/** How many upcoming classes can be missed in a row while staying at or above target. */
export function safeSkips(attended: number, total: number, target: number): number {
  if (target <= 0) return Infinity;
  const k = Math.floor((100 * attended - target * total) / target);
  return Math.max(0, k);
}

/**
 * How many upcoming classes must be attended in a row to reach target.
 * Returns Infinity when the target can never be reached (target 100 after a miss).
 */
export function classesNeeded(attended: number, total: number, target: number): number {
  const deficit = target * total - 100 * attended;
  if (deficit <= 0) return 0;
  if (target >= 100) return Infinity;
  return Math.ceil(deficit / (100 - target));
}

/** Percentage after attending `attend` and skipping `skip` more classes. */
export function projectPercentage(
  attended: number,
  total: number,
  attend: number,
  skip: number,
): number | null {
  return percentage(attended + attend, total + attend + skip);
}

export type Status = 'safe' | 'edge' | 'short' | 'empty';

export function status(attended: number, total: number, target: number): Status {
  if (total === 0) return 'empty';
  if (100 * attended < target * total) return 'short';
  return safeSkips(attended, total, target) === 0 ? 'edge' : 'safe';
}

/** Overall attendance across subjects (some colleges use this instead of per subject). */
export function overall(subjects: Subject[]): { attended: number; total: number } {
  return subjects.reduce(
    (acc, s) => ({ attended: acc.attended + s.attended, total: acc.total + s.total }),
    { attended: 0, total: 0 },
  );
}

export function summary(attended: number, total: number, target: number): string {
  const st = status(attended, total, target);
  if (st === 'empty') return 'No classes yet.';
  if (st === 'short') {
    const n = classesNeeded(attended, total, target);
    if (!Number.isFinite(n)) return `You can no longer reach ${target}%.`;
    return `Attend the next ${n} ${n === 1 ? 'class' : 'classes'} to reach ${target}%.`;
  }
  if (st === 'edge') return `Right at the line. Missing the next class drops you below ${target}%.`;
  const k = safeSkips(attended, total, target);
  return `You can miss ${k} ${k === 1 ? 'class' : 'classes'} and stay at or above ${target}%.`;
}

export interface SemesterPlan {
  /** Most of the remaining classes you can skip and still finish at or above target. */
  maxSkips: number;
  /** Fewest of the remaining classes you must attend. */
  mustAttend: number;
  /** False when even attending every remaining class leaves you short. */
  reachable: boolean;
  /** Final percentage if you attend every remaining class. */
  bestFinal: number | null;
}

/** Plan to the end of the semester when `remaining` more classes will be held. */
export function semesterPlan(attended: number, total: number, remaining: number, target: number): SemesterPlan {
  const finalTotal = total + remaining;
  const bestFinal = percentage(attended + remaining, finalTotal);
  const s = Math.floor((100 * (attended + remaining) - target * finalTotal) / 100);
  if (s < 0) return { maxSkips: 0, mustAttend: remaining, reachable: false, bestFinal };
  const maxSkips = Math.min(s, remaining);
  return { maxSkips, mustAttend: remaining - maxSkips, reachable: true, bestFinal };
}

export interface TodayVerdict {
  id: string;
  name: string;
  canSkip: boolean;
  /** Safe skips still left after skipping today (0 when canSkip is false). */
  leftAfter: number;
  /** Percentage if today's class is skipped. */
  ifSkipped: number;
}

/**
 * "Can I skip today?" for every subject that has a class today.
 * Skipping is safe when the percentage after one more missed class is still at or above target.
 */
export function skipToday(subjects: Subject[], target: number): TodayVerdict[] {
  return subjects.map((s) => {
    const skips = safeSkips(s.attended, s.total, target);
    const canSkip = skips >= 1;
    return {
      id: s.id,
      name: s.name,
      canSkip,
      leftAfter: canSkip ? skips - 1 : 0,
      ifSkipped: (s.attended / (s.total + 1)) * 100,
    };
  });
}
