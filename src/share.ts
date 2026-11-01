import { overall, percentage, summary, type Subject } from './attendance';

// Plain text attendance plan, for pasting into a chat or notes app.
export function planText(subjects: Subject[], target: number): string {
  if (!subjects.length) return '';
  const all = overall(subjects);
  const pct = percentage(all.attended, all.total);
  const lines = [`My attendance plan (target ${target}%)`];
  lines.push(`Overall: ${pct === null ? '--' : pct.toFixed(1) + '%'} (${all.attended}/${all.total})`);
  for (const s of subjects) lines.push(`- ${s.name}: ${summary(s.attended, s.total, target)}`);
  lines.push('Made with bunkwise');
  return lines.join('\n');
}
