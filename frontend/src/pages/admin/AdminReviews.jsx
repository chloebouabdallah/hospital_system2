import { useEffect, useState } from 'react';
import { api } from '../../api/client';

// ---------- Inline styles ----------
const CSS = `
.arv-page { display: flex; flex-direction: column; gap: 22px; }

.arv-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.arv-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.arv-sub { color: var(--mut); font-size: 14px; margin: 0; }

.arv-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.arv-filter {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--mut);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.arv-filter:hover { background: var(--soft); color: var(--ink); }
.arv-filter.is-active {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

.arv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.arv-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.15s, opacity 0.15s;
}
.arv-card:hover { box-shadow: 0 12px 28px #7b5cf015; }
.arv-card.is-hidden { opacity: 0.6; }

.arv-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.arv-stars {
  display: flex;
  gap: 2px;
  font-size: 18px;
  line-height: 1;
  color: #f59e0b;
}
.arv-star-empty { color: #d1d5db; }

.arv-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.arv-status-visible { background: #dcfce7; color: #166534; }
.arv-status-hidden  { background: #f1f5f9; color: #64748b; }

.arv-comment {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.arv-comment-empty {
  font-style: italic;
  color: var(--mut);
}

.arv-meta {
  font-size: 12px;
  color: var(--mut);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.arv-meta b { color: var(--ink); font-weight: 600; }

.arv-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.arv-actions .btn { padding: 6px 14px; font-size: 13px; }
.btn-danger {
  color: #dc2626;
  border-color: #fecaca;
  background: #fff;
}
.btn-danger:hover { background: #fef2f2; }

.arv-state {
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}

@media (max-width: 800px) {
  .arv-page { gap: 18px; }
  .arv-header h1 { font-size: 25px; }
  .arv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .arv-card { padding: 16px; gap: 10px; border-radius: 15px; }
  .arv-card-head { gap: 8px; }
  .arv-stars { font-size: 15px; }
  .arv-status { padding: 3px 7px; font-size: 9px; }
  .arv-comment { font-size: 13px; line-height: 1.5; }
  .arv-meta { font-size: 11px; overflow-wrap: anywhere; }
  .arv-actions .btn { padding: 6px 10px; font-size: 12px; }
  .arv-filter { padding: 7px 12px; font-size: 12px; }
}

@media (max-width: 380px) {
  .arv-grid { gap: 8px; }
  .arv-card { padding: 11px; gap: 8px; }
  .arv-card-head { flex-wrap: wrap; }
  .arv-stars { font-size: 13px; }
  .arv-status { font-size: 8px; }
  .arv-comment { font-size: 12px; }
  .arv-meta { font-size: 10px; }
  .arv-actions .btn { width: 100%; padding: 6px 5px; font-size: 11px; }
}
`;

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAllReviews();
      setReviews(res.reviews || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleHidden(review) {
    const willHide = review.status === 'visible';
    const action = willHide ? 'Hide' : 'Unhide';
    if (!confirm(`${action} this review?`)) return;
    setBusyId(review.id);
    try {
      await api.hideReview(review.id, willHide);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not update review.');
    } finally {
      setBusyId(null);
    }
  }

  const visible = reviews.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const hiddenCount = reviews.filter((r) => r.status === 'hidden').length;

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'visible', label: 'Visible' },
    { key: 'hidden', label: 'Hidden' },
  ];

  return (
    <div className="arv-page">
      <style>{CSS}</style>

      <header className="arv-header">
        <div>
          <h1>Reviews</h1>
          <p className="arv-sub">
            {reviews.length} review{reviews.length === 1 ? '' : 's'}
            {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          </p>
        </div>
      </header>

      <div className="arv-toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`arv-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="arv-state">Loading…</div>}
      {error && <div className="arv-state">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="arv-state">
          {filter === 'all' ? 'No reviews yet.' : `No ${filter} reviews.`}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="arv-grid">
          {visible.map((r) => (
            <article
              key={r.id}
              className={`arv-card${r.status === 'hidden' ? ' is-hidden' : ''}`}
            >
              <div className="arv-card-head">
                <div className="arv-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= r.rating ? '' : 'arv-star-empty'}>★</span>
                  ))}
                </div>
                <span className={`arv-status arv-status-${r.status}`}>{r.status}</span>
              </div>

              {r.comment ? (
                <p className="arv-comment">{r.comment}</p>
              ) : (
                <p className="arv-comment arv-comment-empty">No comment</p>
              )}

              <div className="arv-meta">
                <div>
                  <b>{r.patient?.name ?? 'Unknown patient'}</b> on{' '}
                  <b>{r.doctor?.name ?? 'Unknown doctor'}</b>
                </div>
                {r.doctor?.specialty && <div>{r.doctor.specialty}</div>}
                <div>
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="arv-actions">
                <button
                  className={`btn ${r.status === 'visible' ? 'btn-danger' : ''}`}
                  disabled={busyId === r.id}
                  onClick={() => toggleHidden(r)}
                >
                  {r.status === 'visible' ? 'Hide review' : 'Unhide review'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}