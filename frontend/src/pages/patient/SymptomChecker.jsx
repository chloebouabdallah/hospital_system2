import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';

// ---------- Inline line icons (no emoji) ----------
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
`;

export default function SymptomChecker() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [symptoms, setSymptoms] = useState([]);
  const [symptom, setSymptom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const step = result ? 3 : symptom ? 2 : 1;

  // Load symptoms once
  useEffect(() => {
    api.getSymptoms()
      .then((r) => {
        const list = r.symptoms || [];
        setSymptoms(list);

        const initialId = Number(searchParams.get('symptomId'));
        if (initialId && list.some((s) => s.id === initialId)) {
          const s = list.find((x) => x.id === initialId);
          setSymptom(s);
        }
      })
      .catch((err) => setError(err.data?.error || 'Could not load symptoms.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load questions whenever symptom changes
  useEffect(() => {
    if (!symptom) return;
    setAnswers({});
    setResult(null);
    setError('');
    api.getSymptomQuestions(symptom.id)
      .then((r) => setQuestions(r.questions || []))
      .catch((err) => setError(err.data?.error || 'Could not load questions.'));
  }, [symptom]);

  function pickSymptom(s) {
    setSymptom(s);
    setSearchParams({ symptomId: s.id });
  }

  function backToSymptoms() {
    setSymptom(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError('');
    setSearchParams({});
  }

  function selectAnswer(question, value) {
    setAnswers((prev) => {
      const current = prev[question.id] || [];
      if (question.questionType === 'single') {
        return { ...prev, [question.id]: [value] };
      }
      return {
        ...prev,
        [question.id]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }

  async function submit() {
    setError('');

    const missing = questions.filter((q) => !answers[q.id] || answers[q.id].length === 0);
    if (missing.length > 0) {
      setError('Please answer all questions before continuing.');
      return;
    }

    const payload = {
      symptom_id: symptom.id,
      answers: questions.map((q) => ({
        question_id: q.id,
        values: answers[q.id],
      })),
    };

    setSubmitting(true);
    try {
      const res = await api.submitChecker(payload);
      setResult(res.result);
    } catch (err) {
      setError(err.data?.error || 'Could not process your answers.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="sc-loading">Loading…</div>;

  return (
    <div className="sc-page">
      <style>{CSS}</style>

      <header className="sc-header">
        <h1>Symptom checker</h1>
        <p className="sc-sub">Answer a few questions to understand what to do next.</p>
      </header>

      {/* Stepper */}
      <div className="sc-stepper">
        <div className={`sc-step ${step === 1 ? 'is-active' : step > 1 ? 'is-done' : ''}`}>
          <span className="sc-step-num">{step > 1 ? '✓' : '1'}</span>
          <span>Pick a symptom</span>
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

      {/* STEP 1 — pick symptom */}
      {step === 1 && (
        <div className="sc-card">
          <h2 className="sc-card-title">What's bothering you?</h2>
          <p className="sc-card-sub">Pick one symptom to start.</p>
          <div className="sc-sym-grid">
            {symptoms.map((s) => {
              const SymIcon = iconFor(s.name);
              return (
                <button
                  key={s.id}
                  className="sc-sym"
                  onClick={() => pickSymptom(s)}
                  type="button"
                >
                  <span className="sc-sym-icon" aria-hidden="true">
                    <SymIcon />
                  </span>
                  <span className="sc-sym-name">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 — answer questions */}
      {step === 2 && symptom && (
        <div className="sc-card">
          <h2 className="sc-card-title">{symptom.name}</h2>
          <p className="sc-card-sub">
            Answer each question honestly. You can change answers any time.
          </p>

          <div className="sc-questions">
            {questions.map((q, idx) => (
              <div key={q.id} className="sc-q-block">
                <p className="sc-q-title">
                  <span className="sc-q-num">{String(idx + 1).padStart(2, '0')}</span>
                  {q.questionText}
                </p>
                <div className="sc-options">
                  {q.options.map((o) => {
                    const selected = (answers[q.id] || []).includes(o.optionValue);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`sc-opt${selected ? ' is-selected' : ''}`}
                        data-multi={q.questionType === 'multi' ? '' : undefined}
                        onClick={() => selectAnswer(q, o.optionValue)}
                      >
                        <span className="sc-opt-marker" />
                        <span>{o.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="sc-error">{error}</p>}

          <div className="sc-actions">
            <button className="btn" onClick={backToSymptoms} type="button">
              ← Back
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting}
              type="button"
            >
              {submitting ? 'Checking…' : 'See result'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — result */}
      {step === 3 && result && (
        <ResultView result={result} onReset={backToSymptoms} />
      )}
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
        </div>
      </div>

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
                  {c.specialty?.name && (
                    <span className="sc-cond-tag">{c.specialty.name}</span>
                  )}
                </div>
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