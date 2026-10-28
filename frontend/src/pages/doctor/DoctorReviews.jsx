import { useEffect, useState } from 'react';
import { api } from '../../api/client';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const CSS = `
.dr-page { display: flex; flex-direction: column; gap: 22px; }

.dr-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.dr-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* Summary row */
.dr-summary {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
}
@media (max-width: 820px) {
  .dr-summary { grid-template-columns: 1fr; }
}

.dr-score-card {
  background: var(--grad);
  color: #fff;
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.dr-score-card::after {
  content: '';
  position: absolute;
  right: -60px;
  bottom: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: #ffffff1f;
  pointer-events: none;
}
.dr-score-value {
  font-family: var(--font-head);
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  margin: 0 0 8px;
  letter-spacing: -0.03em;
}
.dr-score-stars {
  display: flex;
  gap: 3px;
  margin-bottom: 10px;
}
.dr-score-count {
  font-size: 13px;
  color: #ffffffd6;
  margin: 0;
}

/* Distribution card */
.dr-dist-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dr-dist-title {
  font-family: var(--font-head);
  font-size: 15px;
  margin: 0 0 8px;
  color: var(--ink);
}
.dr-dist-row {
  display: grid;
  grid-template-columns: 60px 1fr 36px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.dr-dist-label {
  color: var(--mut);
  font-weight: 600;
}
.dr-dist-track {
  height: 10px;
  border-radius: 999px;
  background: var(--soft);
  overflow: hidden;
}
.dr-dist-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--grad);
  transition: width 0.6s ease;
}
.dr-dist-count {
  text-align: right;
  font-family: var(--font-head);
  font-weight: 700;
  color: var(--ink);
}

/* Reviews grid */
.dr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.dr-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px #7b5cf015;
}

.dr-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.dr-stars {
  display: flex;
  gap: 2px;
  color: #f59e0b;
  font-size: 16px;
  line-height: 1;
}
.dr-stars-empty { color: #d1d5db; }
.dr-date {
  font-size: 12px;
  color: var(--mut);
  white-space: nowrap;
}

.dr-comment {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.dr-comment-empty {
  font-style: italic;
  color: var(--mut);
}

.dr-author {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  margin-top: auto;
}
.dr-author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--soft);
  color: var(--v);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.dr-author-name {
  font-size: 13px;
  color: var(--mut);
  margin: 0;
}
.dr-author-name b {
  color: var(--ink);
  font-weight: 600;
}

.dr-state {
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
}
`;

export default function DoctorReviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ average: null, count: 0 });
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const me = await api.getMyDoctorProfile();
        const doctorId = me.doctor.id;
        const res = await api.getDoctorReviews(doctorId);
        setSummary(res.summary || { average: null, count: 0 });
        setReviews(res.reviews || []);
      } catch (err) {
        setError(err.data?.error || 'Could not load your reviews.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="dr-state">Loading reviews…</div>;
  if (error) return <div className="dr-state">{error}</div>;

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxDist = Math.max(1, ...distribution.map((d) => d.count));

  const avg = summary.average ?? 0;
  const roundedAvg = Math.round(avg);

  return (
    <div className="dr-page">
      <style>{CSS}</style>

      <header className="dr-header">
        <h1>My reviews</h1>
        <p className="dr-sub">
          What patients are saying about you.
        </p>
      </header>

      {summary.count === 0 ? (
        <div className="dr-state">
          No reviews yet. Once patients complete appointments with you, their feedback will appear here.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="dr-summary">
            <div className="dr-score-card">
              <p className="dr-score-value">{avg.toFixed(1)}</p>
              <div className="dr-score-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} style={{ color: n <= roundedAvg ? '#fff' : '#ffffff55' }}>
                    ★
                  </span>
                ))}
              </div>
              <p className="dr-score-count">
                {summary.count} visible review{summary.count === 1 ? '' : 's'}
              </p>
            </div>

            <div className="dr-dist-card">
              <h3 className="dr-dist-title">Rating distribution</h3>
              {distribution.map((d) => (
                <div key={d.star} className="dr-dist-row">
                  <span className="dr-dist-label">{d.star} ★</span>
                  <div className="dr-dist-track">
                    <div
                      className="dr-dist-fill"
                      style={{ width: `${(d.count / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="dr-dist-count">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews grid */}
          <div className="dr-grid">
            {reviews.map((r) => {
              const initial = (r.authorDisplay || 'P').charAt(0).toUpperCase();
              return (
                <article key={r.id} className="dr-card">
                  <div className="dr-card-head">
                    <div className="dr-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= r.rating ? '' : 'dr-stars-empty'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="dr-date">{formatDate(r.createdAt)}</span>
                  </div>

                  {r.comment ? (
                    <p className="dr-comment">{r.comment}</p>
                  ) : (
                    <p className="dr-comment dr-comment-empty">No comment left</p>
                  )}

                  <div className="dr-author">
                    <div className="dr-author-avatar">{initial}</div>
                    <p className="dr-author-name">
                      <b>{r.authorDisplay || 'Verified patient'}</b>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}