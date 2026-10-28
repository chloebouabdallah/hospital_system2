import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import BookingModal from './BookingModal';

// Reusable icons (keep consistent with FindDoctors)
const Icon = {
  Back: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="1.5" />
      <path d="M12 8v6M9 11h6M4 21h16" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  StarEmpty: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" />
    </svg>
  ),
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
      const [h, m] = v.split(':').map(Number);
      const d = new Date('1970-01-01T00:00:00Z');
      d.setUTCHours(h, m, 0, 0);
      return d;
    }
    return new Date(v);
  }
  return new Date('1970-01-01T00:00:00Z');
}

function fmtTime(v) {
  const d = toDate(v);
  const H = d.getUTCHours();
  const m = d.getUTCMinutes();
  const suffix = H < 12 ? 'AM' : 'PM';
  const hh = H % 12 === 0 ? 12 : H % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

const CSS = `
.dd-page { display: flex; flex-direction: column; gap: 22px; }

.dd-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mut);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  align-self: flex-start;
  background: var(--card);
  border: 1px solid var(--line);
  cursor: pointer;
  font-family: inherit;
}
.dd-back:hover { color: var(--v); border-color: var(--v); }

/* Hero */
.dd-hero {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 32px;
  display: flex;
  gap: 26px;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
}
.dd-hero::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: var(--grad);
  opacity: 0.08;
  pointer-events: none;
}

.dd-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 800;
  font-size: 38px;
  flex-shrink: 0;
}

.dd-hero-info { flex: 1; min-width: 0; }
.dd-name {
  font-family: var(--font-head);
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.dd-specialty {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
}
.dd-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 13px;
  color: var(--mut);
  margin-bottom: 16px;
}
.dd-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dd-meta-item b { color: var(--ink); font-weight: 600; }

.dd-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.dd-rating-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #f59e0b;
}

/* Sections */
.dd-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 26px;
}
.dd-card h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0 0 14px;
  color: var(--ink);
}
.dd-bio {
  font-size: 15px;
  line-height: 1.7;
  color: var(--mut);
  margin: 0;
  white-space: pre-wrap;
}

/* Hospitals */
.dd-hospitals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dd-hosp-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--soft);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
}
.dd-hosp-chip svg { color: var(--v); }

/* Weekly schedule */
.dd-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
@media (max-width: 720px) {
  .dd-week { grid-template-columns: repeat(4, 1fr); }
}
.dd-day {
  background: var(--soft);
  border-radius: 12px;
  padding: 12px 10px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dd-day-name {
  font-family: var(--font-head);
  font-size: 11px;
  font-weight: 700;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--line);
}
.dd-block {
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--grad);
  color: #fff;
  font-size: 10px;
  line-height: 1.3;
}
.dd-block-name {
  display: block;
  font-weight: 600;
  opacity: 0.9;
  font-size: 9px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.dd-block-time {
  display: block;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 11px;
}
.dd-day-empty {
  font-size: 11px;
  color: #cbd5e1;
  text-align: center;
  margin-top: auto;
  margin-bottom: auto;
}

/* Reviews list */
.dd-reviews {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dd-review {
  padding: 16px;
  background: var(--soft);
  border-radius: 12px;
}
.dd-review-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}
.dd-review-stars {
  display: flex;
  gap: 2px;
  color: #f59e0b;
}
.dd-review-stars-empty { color: #d1d5db; }
.dd-review-author {
  font-size: 12px;
  color: var(--mut);
  font-weight: 600;
}
.dd-review-date {
  font-size: 11px;
  color: var(--mut);
}
.dd-review-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
  white-space: pre-wrap;
}
.dd-review-empty {
  font-style: italic;
  color: var(--mut);
  font-size: 14px;
  padding: 20px 0;
  text-align: center;
}

/* Summary stats */
.dd-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.dd-stat {
  padding: 16px;
  background: var(--soft);
  border-radius: 12px;
  text-align: center;
}
.dd-stat-value {
  font-family: var(--font-head);
  font-size: 26px;
  font-weight: 800;
  margin: 0;
  color: var(--ink);
  line-height: 1;
}
.dd-stat-label {
  font-size: 12px;
  color: var(--mut);
  margin: 6px 0 0;
}

.dd-loading {
  padding: 60px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}
`;

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [docRes, revRes] = await Promise.all([
          api.getDoctorById(id),
          api.getDoctorReviews(id),
        ]);
        setDoctor(docRes.doctor);
        setReviews(revRes.reviews || []);
        setSummary(revRes.summary || { average: null, count: 0 });
      } catch (err) {
        setError(err.data?.error || 'Could not load this doctor.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="dd-loading">Loading doctor…</div>;
  if (error) return <div className="dd-loading">{error}</div>;
  if (!doctor) return null;

  const avg = summary.average ?? 0;
  const ratingCount = summary.count ?? 0;
  const roundedAvg = Math.round(avg);
  const initials = (doctor.user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  // Group availability by day
  const byDay = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  for (const b of doctor.availability || []) {
    if (b.isAvailable === false) continue;
    byDay[b.dayOfWeek]?.push(b);
  }

  const hospitals = doctor.hospitals || [];

  return (
    <div className="dd-page">
      <style>{CSS}</style>

      <button className="dd-back" onClick={() => navigate(-1)}>
        <Icon.Back /> Back
      </button>

      {/* Hero */}
      <section className="dd-hero">
        <div className="dd-avatar">{initials}</div>
        <div className="dd-hero-info">
          <h1 className="dd-name">{doctor.user?.name || 'Doctor'}</h1>
          {doctor.specialty?.name && (
            <span className="dd-specialty">{doctor.specialty.name}</span>
          )}
          <div className="dd-meta-row">
            {doctor.yearsExperience != null && (
              <span className="dd-meta-item">
                <Icon.Clock />
                <b>{doctor.yearsExperience}</b> years experience
              </span>
            )}
            <span className="dd-meta-item dd-rating-inline">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= roundedAvg ? '' : 'dd-review-stars-empty'}>
                  {n <= roundedAvg ? <Icon.Star /> : <Icon.StarEmpty />}
                </span>
              ))}
              <b style={{ color: 'var(--ink)', marginLeft: 4 }}>
                {ratingCount > 0 ? avg.toFixed(1) : '—'}
              </b>
              <span>({ratingCount} review{ratingCount === 1 ? '' : 's'})</span>
            </span>
          </div>
          <div className="dd-actions">
            <button className="btn btn-primary" onClick={() => setBooking(true)}>
              Book appointment
            </button>
            <a href="#reviews" className="btn">
              Read reviews ({ratingCount})
            </a>
          </div>
        </div>
      </section>

      {/* Bio */}
      {doctor.bio && (
        <section className="dd-card">
          <h2>About</h2>
          <p className="dd-bio">{doctor.bio}</p>
        </section>
      )}

      {/* Hospitals */}
      {hospitals.length > 0 && (
        <section className="dd-card">
          <h2>Works at</h2>
          <div className="dd-hospitals">
            {hospitals.map((h) => (
              <span key={h.hospital?.id} className="dd-hosp-chip">
                <Icon.Hospital />
                {h.hospital?.name}
                {h.hospital?.city ? ` · ${h.hospital.city}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Weekly availability */}
      {Object.values(byDay).some((list) => list.length > 0) && (
        <section className="dd-card">
          <h2>Weekly availability</h2>
          <div className="dd-week">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <div key={d} className="dd-day">
                <span className="dd-day-name">{DAY_SHORT[d]}</span>
                {byDay[d].length === 0 ? (
                  <span className="dd-day-empty">—</span>
                ) : (
                  byDay[d].map((b) => (
                    <div key={b.id} className="dd-block">
                      <span className="dd-block-name">{b.hospital?.name || ''}</span>
                      <span className="dd-block-time">
                        {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="dd-card" id="reviews">
        <h2>Patient reviews</h2>

        <div className="dd-stats">
          <div className="dd-stat">
            <p className="dd-stat-value">{ratingCount > 0 ? avg.toFixed(1) : '—'}</p>
            <p className="dd-stat-label">Average rating</p>
          </div>
          <div className="dd-stat">
            <p className="dd-stat-value">{ratingCount}</p>
            <p className="dd-stat-label">Total reviews</p>
          </div>
          <div className="dd-stat">
            <p className="dd-stat-value">{reviews.filter((r) => r.rating === 5).length}</p>
            <p className="dd-stat-label">5-star reviews</p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="dd-review-empty">
            No reviews yet. Be the first to book and share your experience.
          </p>
        ) : (
          <div className="dd-reviews">
            {reviews.map((r) => (
              <article key={r.id} className="dd-review">
                <div className="dd-review-head">
                  <div>
                    <div className="dd-review-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= r.rating ? '' : 'dd-review-stars-empty'}>
                          {n <= r.rating ? <Icon.Star /> : <Icon.StarEmpty />}
                        </span>
                      ))}
                    </div>
                    <p className="dd-review-author">{r.authorDisplay}</p>
                  </div>
                  <span className="dd-review-date">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
                {r.comment ? (
                  <p className="dd-review-body">{r.comment}</p>
                ) : (
                  <p className="dd-review-body" style={{ fontStyle: 'italic', color: 'var(--mut)' }}>
                    No comment left
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {booking && (
        <BookingModal
          doctor={doctor}
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false);
            navigate('/dashboard/appointments');
          }}
        />
      )}
    </div>
  );
}