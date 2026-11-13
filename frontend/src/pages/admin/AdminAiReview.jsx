import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';



const CSS = `
.air-page { display: flex; flex-direction: column; gap: 22px; }
.air-header h1 { font-family: var(--font-head); font-size: 28px; margin: 0 0 4px; letter-spacing: -0.02em; }
.air-sub { color: var(--mut); font-size: 14px; margin: 0; max-width: 680px; }

.air-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.air-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.air-tab {
  padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--card);
  color: var(--ink); font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.air-tab.is-active { background: var(--grad); color: #fff; border-color: transparent; }
.air-count { opacity: 0.75; margin-left: 6px; font-weight: 500; }
.air-select {
  padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--card);
  color: var(--ink); font-family: inherit; font-size: 13px;
}

.air-list { display: flex; flex-direction: column; gap: 12px; }
.air-item { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }
.air-item-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
.air-kind {
  display: inline-block; padding: 3px 10px; border-radius: 999px; background: var(--soft); color: var(--v);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-right: 8px;
}
.air-symptom { font-weight: 600; font-size: 14px; }
.air-meta { color: var(--mut); font-size: 12px; margin-top: 4px; }
.air-body { margin-top: 12px; font-size: 13.5px; line-height: 1.55; color: var(--ink); }
.air-body ul { margin: 6px 0 0; padding-left: 18px; color: var(--mut); }
.air-body p { margin: 0 0 6px; }
.air-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.air-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.air-pill.low { background: #dcfce7; color: #16a34a; }
.air-pill.moderate { background: #fef3c7; color: #d97706; }
.air-pill.urgent { background: #fee2e2; color: #dc2626; }
.air-empty, .air-error { padding: 40px; text-align: center; color: var(--mut); background: var(--card); border: 1px solid var(--line); border-radius: 16px; }
.air-error { color: #dc2626; }
`;

const STATUS_TABS = [
  ['pending', 'Pending review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
];

function Payload({ item }) {
  const p = item.payload || {};
  if (item.kind === 'question') {
    const q = p.question;
    if (!q) return <p>Model chose to finish the questionnaire here.</p>;
    return (
      <>
        <p><b>{q.text}</b> <span style={{ color: 'var(--mut)' }}>({q.type === 'multi' ? 'select all' : 'select one'})</span></p>
        <ul>{(q.options || []).map((o) => <li key={o.value}>{o.text}</li>)}</ul>
      </>
    );
  }
  return (
    <>
      <p>
        Model urgency: <span className={`air-pill ${p.urgency}`}>{p.urgency}</span>
        {' '}· Specialty: <b>{p.specialty || '—'}</b> · Confidence: {p.confidence}
        {p.red_flag_detected && !(p.red_flags || []).length ? ' · flagged a red flag' : ''}
      </p>
      {(p.red_flags || []).length > 0 && (
        <>
          <p style={{ marginTop: 8 }}><b>Red flags</b> (check each is really supported by the answers):</p>
          <ul>
            {p.red_flags.map((f, i) => (
              <li key={i}>
                <b>{f.flag}</b> [{f.action === 'urgent_visit' ? 'see a doctor soon' : 'emergency'}]
                {f.condition ? ` → ${f.condition}` : ''}
                {f.based_on ? ` · based on: ${f.based_on}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
      <ul>
        {(p.conditions || []).map((c) => (
          <li key={c.name}><b>{c.name}</b> ({c.likelihood}): {c.description}</li>
        ))}
      </ul>
      {p.reasoning && <p style={{ marginTop: 8 }}>Reasoning: {p.reasoning}</p>}
      {p.advice && <p style={{ marginTop: 8 }}>Advice: {p.advice}</p>}
    </>
  );
}

export default function AdminAiReview() {
  const [status, setStatus] = useState('pending');
  const [kind, setKind] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ status });
      if (kind) params.set('kind', kind);
      const r = await api.getAiReview(`?${params}`);
      setItems(r.items || []);
      setSummary(r.summary || { pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      setError(err.data?.error || 'Could not load the review queue.');
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.data?.error || 'Action failed.');
    }
  }

  return (
    <div className="air-page">
      <style>{CSS}</style>

      <header className="air-header">
        <h1>AI review</h1>
        <p className="air-sub">
          Questions and assessments generated by the AI are saved here, including the urgency and red
          flags the AI decided. Approve the good ones; reject anything wrong or unsafe and it will never be
          shown again. When the AI is unavailable, only approved entries are reused for patients.
        </p>
      </header>

      <div className="air-toolbar">
        <div className="air-tabs">
          {STATUS_TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`air-tab${status === key ? ' is-active' : ''}`}
              onClick={() => setStatus(key)}
            >
              {label}<span className="air-count">{summary[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <select className="air-select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          <option value="question">Questions</option>
          <option value="assessment">Assessments</option>
        </select>
      </div>

      {error && <div className="air-error">{error}</div>}
      {loading && <div className="air-empty">Loading…</div>}
      {!loading && !error && items.length === 0 && <div className="air-empty">Nothing here.</div>}

      <div className="air-list">
        {!loading && items.map((item) => (
          <article key={item.id} className="air-item">
            <div className="air-item-head">
              <div>
                <span className="air-kind">{item.kind}</span>
                <span className="air-symptom">{item.symptomText}</span>
                <div className="air-meta">
                  Served {item.hits}× · created {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="air-actions">
                {status !== 'approved' && (
                  <button className="btn btn-primary" type="button" onClick={() => act(() => api.setAiReviewStatus(item.id, 'approved'))}>
                    Approve
                  </button>
                )}
                {status !== 'rejected' && (
                  <button className="btn" type="button" onClick={() => act(() => api.setAiReviewStatus(item.id, 'rejected'))}>
                    Reject
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => window.confirm('Delete this entry? It will be regenerated on the next matching request.') && act(() => api.deleteAiReviewItem(item.id))}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="air-body"><Payload item={item} /></div>
          </article>
        ))}
      </div>
    </div>
  );
}