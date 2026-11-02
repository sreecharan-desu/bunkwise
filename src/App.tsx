import { useEffect, useRef, useState } from 'react';
import {
  classesNeeded, isValidCounts, overall, percentage, projectPercentage,
  safeSkips, semesterPlan, status, summary, type Subject,
  skipToday,
} from './attendance';
import { planText } from './share';
import { isValidTarget, load, newId, parseState, save, type AppState } from './storage';

const fmt = (p: number | null) => (p === null ? '--' : `${p.toFixed(1)}%`);

const SAMPLE: Subject[] = [
  { id: newId(), name: 'Operating Systems', attended: 31, total: 40 },
  { id: newId(), name: 'Computer Networks', attended: 26, total: 38 },
  { id: newId(), name: 'DBMS Lab', attended: 18, total: 18 },
];

export default function App() {
  const [state, setState] = useState<AppState>(() => load());
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { target, subjects } = state;
  const [targetText, setTargetText] = useState(String(target));
  const [copied, setCopied] = useState('');

  useEffect(() => save(state), [state]);

  const update = (id: string, patch: Partial<Subject>) =>
    setState((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const remove = (id: string) =>
    setState((s) => ({ ...s, subjects: s.subjects.filter((x) => x.id !== id) }));

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bunkwise.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function sharePlan() {
    const text = planText(subjects, target);
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied('Plan copied. Paste it anywhere.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setCopied('Could not copy. Your browser blocked it.');
    }
  }

  async function importJson(file: File) {
    try {
      const next = parseState(await file.text());
      setState(next);
      setTargetText(String(next.target));
      setError('');
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
    }
  }

  const all = overall(subjects);
  const [today, setToday] = useState<string[]>([]);
  const verdicts = skipToday(subjects.filter((x) => today.includes(x.id)), target);

  return (
    <main>
      <header>
        <h1>bunkwise</h1>
        <p className="tag">Know how many classes you can miss, and how many you need, before the 75% rule catches you.</p>
      </header>

      {subjects.length > 0 && (
        <section className="card today" aria-label="Can I skip today">
          <h2>Can I skip today?</h2>
          <p className="tag">Tick the classes you have today.</p>
          <div className="row">
            {subjects.map((x) => (
              <label key={x.id}><input type="checkbox" checked={today.includes(x.id)}
                onChange={(e) => setToday((t) => e.target.checked ? [...t, x.id] : t.filter((i) => i !== x.id))} /> {x.name}</label>
            ))}
          </div>
          {verdicts.length > 0 && (
            <ul aria-live="polite">
              {verdicts.map((v) => (
                <li key={v.id} className={v.canSkip ? 'safe' : 'short'}>
                  <b>{v.name}</b>: {v.canSkip
                    ? `skip is fine, you'd be at ${fmt(v.ifSkipped)} with ${v.leftAfter} safe ${v.leftAfter === 1 ? 'skip' : 'skips'} left.`
                    : `go. skipping drops you to ${fmt(v.ifSkipped)}, below ${target}%.`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="card controls" aria-label="Settings">
        <label>
          Target attendance (%)
          <input
            type="number" min={1} max={100} inputMode="numeric" value={targetText}
            aria-describedby="target-hint"
            onChange={(e) => {
              setTargetText(e.target.value);
              const t = Number(e.target.value);
              if (e.target.value !== '' && isValidTarget(t)) setState((s) => ({ ...s, target: t }));
            }}
            onBlur={() => setTargetText(String(target))}
          />
          <small id="target-hint">Whole number, 1 to 100</small>
        </label>
        <div className="overall" aria-live="polite">
          <span>Overall</span>
          <strong>{fmt(percentage(all.attended, all.total))}</strong>
          <small>{all.attended}/{all.total} classes</small>
        </div>
      </section>

      <AddSubject onAdd={(s) => setState((st) => ({ ...st, subjects: [...st.subjects, s] }))} />

      {subjects.length === 0 && (
        <section className="card empty">
          <p>No subjects yet. Add one above, or</p>
          <button onClick={() => setState((s) => ({ ...s, subjects: SAMPLE }))}>load a sample semester</button>
        </section>
      )}

      <ul className="subjects">
        {subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} target={target}
            onChange={(p) => update(s.id, p)} onRemove={() => remove(s.id)} />
        ))}
      </ul>

      <footer>
        <div className="row">
          <button onClick={sharePlan} disabled={!subjects.length}>Share plan</button>
          <button onClick={exportJson} disabled={!subjects.length}>Export backup</button>
          <button onClick={() => fileRef.current?.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>
        {copied && <p role="status">{copied}</p>}
        {error && <p role="alert" className="error">{error}</p>}
        <p className="note">Your data stays in this browser. Nothing is sent to a server.</p>
        <p className="note">
          Found a bug or have an idea? <a href="https://github.com/sreecharan-desu/bunkwise/issues/new" target="_blank" rel="noopener noreferrer">Open an issue</a>.
        </p>
      </footer>
    </main>
  );
}

function AddSubject({ onAdd }: { onAdd: (s: Subject) => void }) {
  const [name, setName] = useState('');
  const [attended, setAttended] = useState('');
  const [total, setTotal] = useState('');
  const [err, setErr] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(attended || 0), t = Number(total || 0);
    if (!name.trim()) return setErr('Give the subject a name.');
    if (!isValidCounts(a, t)) return setErr('Attended must be a whole number no larger than total.');
    onAdd({ id: newId(), name: name.trim().slice(0, 60), attended: a, total: t });
    setName(''); setAttended(''); setTotal(''); setErr('');
  }

  return (
    <form className="card add" onSubmit={submit} aria-label="Add subject">
      <label className="grow">Subject<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Compiler Design" /></label>
      <label>Attended<input type="number" min={0} inputMode="numeric" value={attended} onChange={(e) => setAttended(e.target.value)} /></label>
      <label>Total held<input type="number" min={0} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} /></label>
      <button type="submit" className="primary">Add</button>
      {err && <p role="alert" className="error full">{err}</p>}
    </form>
  );
}

function SubjectCard({ subject, target, onChange, onRemove }: {
  subject: Subject; target: number; onChange: (p: Partial<Subject>) => void; onRemove: () => void;
}) {
  const { name, attended, total } = subject;
  const [attend, setAttend] = useState(0);
  const [skip, setSkip] = useState(0);
  const [left, setLeft] = useState('');
  const remaining = Math.max(0, Math.floor(Number(left) || 0));
  const plan = left === '' ? null : semesterPlan(attended, total, remaining, target);
  const st = status(attended, total, target);
  const pct = percentage(attended, total);
  const proj = projectPercentage(attended, total, attend, skip);
  const skips = safeSkips(attended, total, target);
  const need = classesNeeded(attended, total, target);

  return (
    <li className={`card subject ${st}`}>
      <div className="head">
        <h2>{name}</h2>
        <span className="pct">{fmt(pct)}</span>
      </div>
      <div className="bar" role="progressbar" aria-label={`${name} attendance`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct ?? 0)}>
        <div className="fill" style={{ width: `${pct ?? 0}%` }} />
        <div className="mark" style={{ left: `${target}%` }} />
      </div>
      <p className="summary">{summary(attended, total, target)}</p>
      <div className="stats">
        <span><b>{attended}</b>/<b>{total}</b> attended</span>
        {st !== 'empty' && <span>Safe skips: <b>{skips}</b></span>}
        {st === 'short' && <span>Needed: <b>{Number.isFinite(need) ? need : 'not reachable'}</b></span>}
      </div>
      <div className="row" role="group" aria-label={`Log a class for ${name}`}>
        <button onClick={() => onChange({ attended: attended + 1, total: total + 1 })}>Attended today</button>
        <button onClick={() => onChange({ total: total + 1 })}>Missed today</button>
        <button onClick={() => attended > 0 && total > 0 && onChange({ attended: attended - 1, total: total - 1 })}
          disabled={attended === 0} title="Undo one attended class">Undo attended</button>
        <button onClick={() => total > attended && onChange({ total: total - 1 })}
          disabled={total === attended} title="Undo one missed class">Undo missed</button>
      </div>
      <details>
        <summary>What if</summary>
        <div className="row whatif">
          <label>Attend next<input type="number" min={0} value={attend} onChange={(e) => setAttend(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
          <label>Skip next<input type="number" min={0} value={skip} onChange={(e) => setSkip(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
          <p aria-live="polite">You would be at <b>{fmt(proj)}</b>{proj !== null && (proj >= target ? ', above target.' : ', below target.')}</p>
        </div>
      </details>
      <details>
        <summary>End of semester</summary>
        <div className="row whatif">
          <label>Classes left<input type="number" min={0} inputMode="numeric" value={left} onChange={(e) => setLeft(e.target.value)} /></label>
          {plan && (
            <p aria-live="polite">
              {plan.reachable
                ? <>Attend at least <b>{plan.mustAttend}</b> of {remaining}. You can skip <b>{plan.maxSkips}</b> and finish at or above {target}%.</>
                : <>Even attending all {remaining} ends at <b>{fmt(plan.bestFinal)}</b>, below {target}%. Talk to your department about condonation.</>}
            </p>
          )}
        </div>
      </details>
      <button className="link danger" onClick={() => confirm(`Remove ${name}?`) && onRemove()}>Remove subject</button>
    </li>
  );
}
