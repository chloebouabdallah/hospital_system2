import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

const Icon = {
  Head: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3a5 5 0 0 0-5 5v1a4 4 0 0 0 1 2.6V15a3 3 0 0 0 3 3h1v2" />
      <path d="M9 3a5 5 0 0 1 5 5v3.6L15 15a3 3 0 0 1-3 3" />
      <circle cx="8" cy="10" r="0.6" fill="currentColor" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.7-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.3-7 10-7 10z" />
    </svg>
  ),
  Stomach: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v4.5c0 1-.7 1.5-1.5 2S6 11 6 12c0 4 3 7 6 7s6-2 6-6-2-5-2-7" />
      <path d="M15 3v3" />
    </svg>
  ),
  Thermometer: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z" />
    </svg>
  ),
  Lungs: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v9" />
      <path d="M12 8c-1.5-1.5-3.5-2-5-1.5C5.5 7 5 8.5 5 10.5V17a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2V8" />
      <path d="M12 8c1.5-1.5 3.5-2 5-1.5C18.5 7 19 8.5 19 10.5V17a3 3 0 0 1-3 3h-1a2 2 0 0 1-2-2V8" />
    </svg>
  ),
  Spine: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M9 6h6M9 10h6M9 14h6M9 18h6" />
    </svg>
  ),
  Stethoscope: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v6a5 5 0 0 0 10 0V4M4 4h3M14 4h3" />
      <path d="M11 15v1.5a4 4 0 0 0 8 0v-2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  ),
};

function iconFor(name) {
  const n = name.toLowerCase();
  if (n.includes('head')) return Icon.Head;
  if (n.includes('chest')) return Icon.Heart;
  if (n.includes('stomach')) return Icon.Stomach;
  if (n.includes('fever')) return Icon.Thermometer;
  if (n.includes('cough')) return Icon.Lungs;
  if (n.includes('back')) return Icon.Spine;
  return Icon.Stethoscope;
}

const URGENCY = {
  low: { label: 'Low priority', color: '#16a34a', bg: '#dcfce7' },
  moderate: { label: 'Moderate — see a doctor soon', color: '#d97706', bg: '#fef3c7' },
  urgent: { label: 'Urgent — seek care now', color: '#dc2626', bg: '#fee2e2' },
};

const CSS = `
.sc-page { display: flex; flex-direction: column; gap: 22px; }

.sc-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.sc-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* Stepper */
.sc-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  flex-wrap: wrap;
}
.sc-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mut);
}
.sc-step-num {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--soft);
  color: var(--mut);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.sc-step.is-active .sc-step-num { background: var(--grad); color: #fff; }
.sc-step.is-active { color: var(--ink); }
.sc-step.is-done .sc-step-num { background: #dcfce7; color: #16a34a; }
.sc-step.is-done { color: var(--ink); }
.sc-step-arrow { color: var(--line); }

/* Card shell */
.sc-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 28px;
}
.sc-card-title {
  font-family: var(--font-head);
  font-size: 20px;
  margin: 0 0 6px;
}
.sc-card-sub { color: var(--mut); font-size: 14px; margin: 0 0 20px; }

/* Symptom picker */
.sc-sym-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.sc-sym {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  text-align: center;
  font-family: inherit;
}
.sc-sym:hover {
  transform: translateY(-2px);
  border-color: var(--v);
  box-shadow: 0 12px 28px #7b5cf018;
}
.sc-sym-icon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7b5cf015, #a78bfa15);
  color: var(--v);
  transition: background 0.15s, color 0.15s;
}
.sc-sym:hover .sc-sym-icon {
  background: var(--grad);
  color: #fff;
}
.sc-sym-name { font-weight: 600; font-size: 14px; color: var(--ink); }

/* Question flow */
.sc-questions { display: flex; flex-direction: column; gap: 26px; }
.sc-q-block { display: flex; flex-direction: column; gap: 12px; }
.sc-q-title { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0; }
.sc-q-num {
  display: inline-block;
  color: var(--v);
  font-family: var(--font-head);
  margin-right: 6px;
}

.sc-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sc-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  cursor: pointer;
  font-size: 14px;
  color: var(--ink);
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.sc-opt:hover { border-color: var(--v); background: var(--soft); }
.sc-opt.is-selected {
  border-color: var(--v);
  background: linear-gradient(135deg, #7b5cf015, #a78bfa10);
  box-shadow: 0 0 0 3px #7b5cf022;
}
.sc-opt-marker {
  width: 16px; height: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background 0.15s;
}
.sc-opt.is-selected .sc-opt-marker {
  border-color: var(--v);
  background: var(--v);
}
.sc-opt.is-selected .sc-opt-marker::after {
  content: '';
  width: 6px; height: 6px;
  background: #fff;
  border-radius: 50%;
}
.sc-opt[data-multi] .sc-opt-marker {
  border-radius: 5px;
}

/* Actions */
.sc-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 26px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.sc-error {
  color: #dc2626;
  font-size: 14px;
  margin: 12px 0 0;
}

/* Result view */
.sc-result {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sc-urgency {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  border-radius: 16px;
  border: 1px solid;
}
.sc-urgency-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px #ffffff66;
}
.sc-urgency-label {
  font-family: var(--font-head);
  font-weight: 800;
  font-size: 18px;
  margin: 0;
}
.sc-urgency-sub { font-size: 13px; margin: 2px 0 0; opacity: 0.85; }

.sc-result-section h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0 0 14px;
}

.sc-conditions { display: flex; flex-direction: column; gap: 12px; }
.sc-cond {
  background: var(--soft);
  border-radius: 14px;
  padding: 16px 18px;
  border: 1px solid var(--line);
}
.sc-cond-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.sc-cond h3 { font-family: var(--font-head); font-size: 16px; margin: 0; }
.sc-cond p { font-size: 14px; line-height: 1.6; color: var(--mut); margin: 0 0 8px; }
.sc-cond p:last-child { margin-bottom: 0; }

.sc-cond-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--card);
  color: var(--v);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sc-specialty-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--grad);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}
.sc-specialty-pill svg { flex-shrink: 0; }

.sc-articles { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.sc-article { background: var(--soft); border-radius: 12px; padding: 14px 16px; }
.sc-article h4 { font-family: var(--font-head); font-size: 14px; margin: 0 0 6px; color: var(--ink); }
.sc-article p { font-size: 13px; line-height: 1.6; color: var(--mut); margin: 0; }
.sc-article .sc-source { font-size: 11px; color: var(--mut); margin-top: 6px; font-style: italic; }

.sc-disclaimer {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--mut);
  padding: 14px 16px;
  background: #f8f7ff;
  border: 1px dashed var(--line);
  border-radius: 12px;
}

.sc-result-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.sc-loading { padding: 60px; text-align: center; color: var(--mut); }

/* Free-text symptom entry */
.sc-textarea {
  width: 100%;
  min-height: 92px;
  resize: vertical;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  color: var(--ink);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  box-sizing: border-box;
}
.sc-textarea:focus { outline: none; border-color: var(--v); box-shadow: 0 0 0 3px #7b5cf022; }
.sc-hint { color: var(--mut); font-size: 12.5px; margin: 8px 0 0; display: flex; justify-content: space-between; gap: 12px; }
.sc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.sc-chip {
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--card);
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.sc-chip:hover { border-color: var(--v); background: var(--soft); }
.sc-chips-label { color: var(--mut); font-size: 12.5px; margin: 20px 0 0; }

/* One-question-at-a-time */
.sc-progress { height: 6px; border-radius: 999px; background: var(--soft); overflow: hidden; margin: 0 0 22px; }
.sc-progress > span { display: block; height: 100%; background: var(--grad); border-radius: 999px; transition: width 0.3s; }
.sc-q-meta { color: var(--mut); font-size: 12.5px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.sc-q-big { font-family: var(--font-head); font-size: 20px; line-height: 1.35; margin: 0 0 6px; }
.sc-q-help { color: var(--mut); font-size: 13px; margin: 0 0 18px; }
.sc-asked { color: var(--mut); font-size: 13px; margin: 0 0 18px; padding: 12px 14px; background: var(--soft); border-radius: 12px; }
.sc-thinking { padding: 40px 0; text-align: center; color: var(--mut); }

/* Result extras */
.sc-flags { margin: 10px 0 0; padding-left: 18px; font-size: 13.5px; }
.sc-advice { font-size: 14.5px; line-height: 1.65; color: var(--ink); margin: 0; }
.sc-top {
  border: 1px solid var(--line);
  background: linear-gradient(135deg, #7b5cf010, #a78bfa08);
  border-radius: 16px;
  padding: 18px 20px;
}
.sc-top-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--v); margin: 0 0 6px; }
.sc-top h2 { font-family: var(--font-head); font-size: 22px; margin: 0 0 8px; }
.sc-top p { margin: 0 0 8px; font-size: 14.5px; line-height: 1.6; }
.sc-top-warn { font-size: 12.5px; color: var(--mut); margin: 0; }
.sc-why { font-size: 13.5px; color: var(--ink); }
.sc-ai-note { font-size: 12px; color: var(--mut); margin: 0; }
.sc-cond-likely { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mut); }
`;

export default function SymptomChecker() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [quick, setQuick] = useState([]);       // quick-pick chips (existing symptoms list)
  const [text, setText] = useState('');         // free-text symptom
  const [history, setHistory] = useState([]);   // answered questions so far
  const [current, setCurrent] = useState(null); // question being shown
  const [selected, setSelected] = useState([]); // option values picked for the current question
  const [progress, setProgress] = useState({ answered: 0, max: 7 });
  const [result, setResult] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const step = result ? 3 : current ? 2 : 1;

  // Quick-pick chips + deep link (?symptomId=) just prefill the text box.
  useEffect(() => {
    api.getSymptoms()
      .then((r) => {
        const list = r.symptoms || [];
        setQuick(list);
        const id = Number(searchParams.get('symptomId'));
        const hit = id && list.find((x) => x.id === id);
        if (hit) setText((t) => t || hit.name);
      })
      .catch(() => {}); // chips are optional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ask the server for the next step given a (symptom, history) pair.
  async function advance(symptom, answers) {
    setBusy(true);
    setError('');
    try {
      const res = await api.aiCheckerStep({ symptom, answers });
      if (res.type === 'question') {
        setCurrent(res.question);
        setProgress(res.progress || { answered: answers.length, max: 7 });
        setSelected([]);
        setResult(null);
      } else {
        setCurrent(null);
        setResult(res.result);
      }
      setHistory(answers);
    } catch (err) {
      setError(err.data?.error || 'Could not reach the checker. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function start() {
    const symptom = text.trim();
    if (symptom.length < 2) {
      setError('Please describe your symptom first.');
      return;
    }
    advance(symptom, []);
  }

  function toggle(option) {
    if (!current) return;
    if (current.type === 'single') {
      setSelected([option.value]);
      return;
    }
    // "None of these" is exclusive in multi-choice questions.
    const isNone = /^none\b|^no$|^لا$/i.test(option.text.trim());
    setSelected((prev) => {
      if (isNone) return prev.includes(option.value) ? [] : [option.value];
      const withoutNone = prev.filter((v) => {
        const o = current.options.find((x) => x.value === v);
        return !(o && /^none\b/i.test(o.text.trim()));
      });
      return withoutNone.includes(option.value)
        ? withoutNone.filter((v) => v !== option.value)
        : [...withoutNone, option.value];
    });
  }

  function next() {
    if (selected.length === 0) {
      setError('Please choose an answer to continue.');
      return;
    }
    const values = current.options
      .filter((o) => selected.includes(o.value))
      .map((o) => ({ value: o.value, text: o.text }));
    advance(text.trim(), [...history, { question: current.text, type: current.type, values }]);
  }

  function back() {
    setError('');
    if (history.length === 0) {
      setCurrent(null);
      return;
    }
    // Re-ask the previous question (cached server-side, so this is cheap).
    advance(text.trim(), history.slice(0, -1));
  }

  function reset() {
    setText('');
    setHistory([]);
    setCurrent(null);
    setSelected([]);
    setResult(null);
    setError('');
    setSearchParams({});
  }

  const pct = Math.min(100, Math.round(((progress.answered + 1) / (progress.max + 1)) * 100));

  return (
    <div className="sc-page">
      <style>{CSS}</style>

      <header className="sc-header">
        <h1>Symptom checker</h1>
        <p className="sc-sub">Describe what you feel, then answer a few questions tailored to you.</p>
      </header>

      {/* Stepper */}
      <div className="sc-stepper">
        <div className={`sc-step ${step === 1 ? 'is-active' : step > 1 ? 'is-done' : ''}`}>
          <span className="sc-step-num">{step > 1 ? '✓' : '1'}</span>
          <span>Describe your symptom</span>
        </div>
        <span className="sc-step-arrow">→</span>
        <div className={`sc-step ${step === 2 ? 'is-active' : step > 2 ? 'is-done' : ''}`}>
          <span className="sc-step-num">{step > 2 ? '✓' : '2'}</span>
          <span>Answer questions</span>
        </div>
        <span className="sc-step-arrow">→</span>
        <div className={`sc-step ${step === 3 ? 'is-active' : ''}`}>
          <span className="sc-step-num">3</span>
          <span>See result</span>
        </div>
      </div>

      {/* STEP 1 — free-text symptom */}
      {step === 1 && (
        <div className="sc-card">
          <h2 className="sc-card-title">What's bothering you?</h2>
          <p className="sc-card-sub">
            Describe it in your own words, for example "headache for two days with nausea".
          </p>

          <textarea
            className="sc-textarea"
            value={text}
            maxLength={300}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            placeholder="Type your symptom here…"
            aria-label="Describe your symptom"
          />
          <p className="sc-hint">
            <span>Don't include your name or other personal details.</span>
            <span>{text.length}/300</span>
          </p>

          {quick.length > 0 && (
            <>
              <p className="sc-chips-label">Or start from a common symptom:</p>
              <div className="sc-chips">
                {quick.map((s) => {
                  const SymIcon = iconFor(s.name);
                  return (
                    <button key={s.id} type="button" className="sc-chip" onClick={() => setText(s.name)}>
                      <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6, transform: 'scale(0.75)' }}>
                        <SymIcon />
                      </span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {error && <p className="sc-error">{error}</p>}

          <div className="sc-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={start} disabled={busy} type="button">
              {busy ? 'Thinking…' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — one adaptive question at a time */}
      {step === 2 && current && (
        <div className="sc-card">
          <div className="sc-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <p className="sc-q-meta">Question {progress.answered + 1}</p>
          <p className="sc-asked">Your symptom: <b>{text}</b></p>

          <h2 className="sc-q-big">{current.text}</h2>
          <p className="sc-q-help">
            {current.type === 'multi' ? 'Select all that apply.' : 'Select one answer.'}
          </p>

          <div className="sc-options">
            {current.options.map((o) => {
              const isSel = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`sc-opt${isSel ? ' is-selected' : ''}`}
                  data-multi={current.type === 'multi' ? '' : undefined}
                  onClick={() => { toggle(o); setError(''); }}
                  disabled={busy}
                >
                  <span className="sc-opt-marker" />
                  <span>{o.text}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="sc-error">{error}</p>}

          <div className="sc-actions">
            <button className="btn" onClick={back} disabled={busy} type="button">← Back</button>
            <button className="btn btn-primary" onClick={next} disabled={busy} type="button">
              {busy ? 'Thinking…' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — result */}
      {step === 3 && result && <ResultView result={result} onReset={reset} />}
    </div>
  );
}

// ---------- Result view ----------
function ResultView({ result, onReset }) {
  const urgency = URGENCY[result.urgencyLevel] || URGENCY.low;
  const conditions = result.conditions || [];
  const specialty = result.recommendedSpecialty;
  const articles = conditions.flatMap((c) => c.articles || []);

  return (
    <div className="sc-result">
      {/* Urgency banner */}
      <div
        className="sc-urgency"
        style={{ background: urgency.bg, borderColor: urgency.color, color: urgency.color }}
      >
        <span
          className="sc-urgency-dot"
          style={{ background: urgency.color }}
          aria-hidden="true"
        />
        <div>
          <p className="sc-urgency-label">{urgency.label}</p>
          {result.matched ? (
            <p className="sc-urgency-sub">
              Based on your answers, {conditions.length} possible condition
              {conditions.length === 1 ? '' : 's'} may apply.
            </p>
          ) : (
            <p className="sc-urgency-sub">
              {result.message || 'We recommend speaking with a doctor.'}
            </p>
          )}
          {(result.redFlags || []).length > 0 && (
            <ul className="sc-flags">
              {result.redFlags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* Most likely condition (AI result): stated clearly, but framed as a possibility to confirm */}
      {result.matched && conditions[0] && (
        <div className="sc-top">
          <p className="sc-top-label">Most likely based on your answers</p>
          <h2>{conditions[0].name}</h2>
          {result.reasoning && <p>{result.reasoning}</p>}
          <p className="sc-top-warn">
            This is not a diagnosis. Only a doctor can confirm what is causing your symptoms.
          </p>
        </div>
      )}

      {/* Advice / emergency message (shown under the banner when a result was matched) */}
      {result.matched && result.message && <p className="sc-advice">{result.message}</p>}

      {/* Specialty recommendation */}
      {specialty && (
        <div className="sc-result-section">
          <h2>Recommended specialty</h2>
          <span className="sc-specialty-pill">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4v6a5 5 0 0 0 10 0V4M4 4h3M14 4h3" />
              <path d="M11 15v1.5a4 4 0 0 0 8 0v-2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            {specialty.name}
          </span>
        </div>
      )}

      {/* Possible conditions */}
      {conditions.length > 0 && (
        <div className="sc-result-section">
          <h2>Possible conditions</h2>
          <div className="sc-conditions">
            {conditions.map((c) => (
              <article key={c.id} className="sc-cond">
                <div className="sc-cond-head">
                  <h3>{c.name}</h3>
                  {c.likelihood && <span className="sc-cond-likely">{c.likelihood}</span>}
                  {c.specialty?.name && (
                    <span className="sc-cond-tag">{c.specialty.name}</span>
                  )}
                </div>
                {c.whyItFits && <p className="sc-why"><b>Why it fits:</b> {c.whyItFits}</p>}
                {c.description && <p>{c.description}</p>}
                {c.causes && <p><b>Common causes:</b> {c.causes}</p>}
                {c.whenToSeekCare && <p><b>When to seek care:</b> {c.whenToSeekCare}</p>}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      {articles.length > 0 && (
        <div className="sc-result-section">
          <h2>Learn more</h2>
          <ul className="sc-articles">
            {articles.map((a) => (
              <li key={a.id} className="sc-article">
                <h4>{a.title}</h4>
                <p>{a.content}</p>
                {a.source && <p className="sc-source">Source: {a.source}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.source === 'ai' && (
        <p className="sc-ai-note">
          These suggestions are generated by AI and checked against built-in safety rules. Urgency is never
          lower than what those rules require.
        </p>
      )}

      {/* Disclaimer */}
      <p className="sc-disclaimer">{result.disclaimer}</p>

      {/* Actions */}
      <div className="sc-result-actions">
        <button className="btn" onClick={onReset} type="button">
          Start over
        </button>
        {specialty && (
         <Link
  to={`/dashboard/find-doctors?specialtyId=${specialty.id}&urgency=${result.urgencyLevel}`}
  className="btn btn-primary"
>
  Find a {specialty.name} near you →
</Link>
        )}
      </div>
    </div>
  );
}