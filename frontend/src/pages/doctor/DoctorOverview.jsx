import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import BarChart from '../../components/BarChart';
import DonutChart from '../../components/DonutChart';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
  pending: '#a78bfa',
  confirmed: '#008cfd',
  completed: '#7b5cf0',
  cancelled: '#cbd5e1',
};

const CSS = `
.dd-page { display: flex; flex-direction: column; gap: 22px; }

.dd-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.dd-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* KPI row — same pattern as patient dashboard */
.dd-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.dd-kpi {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 22px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 130px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dd-kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px #7b5cf033;
}
.dd-kpi::after {
  content: '';
  position: absolute;
  right: -30px;
  top: -30px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: #ffffff1f;
  pointer-events: none;
}
.dd-kpi-label {
  font-size: 13px;
  color: #ffffffd6;
  margin: 0;
}
.dd-kpi-value {
  font-family: var(--font-head);
  font-size: 40px;
  line-height: 1;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 6px 0 0;
}
.dd-kpi-note {
  font-size: 12px;
  color: #ffffffb3;
  margin-top: 6px;
}

.dd-kpi-blue    { background: linear-gradient(135deg, #008cfd, #4573d4); }
.dd-kpi-indigo  { background: linear-gradient(135deg, #6d28d9, #7b5cf0); }
.dd-kpi-violet  { background: linear-gradient(135deg, #7b5cf0, #a78bfa); }
.dd-kpi-lav     { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }

/* Schedule strip */
.dd-schedule {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px 22px;
}
.dd-schedule-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.dd-schedule-head h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0;
}
.dd-schedule-head a {
  color: var(--p);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.dd-schedule-head a:hover { text-decoration: underline; }

.dd-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}
@media (max-width: 720px) {
  .dd-week { grid-template-columns: repeat(4, 1fr); }
}
.dd-day {
  background: var(--soft);
  border-radius: 12px;
  padding: 12px 10px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dd-day-name {
  font-family: var(--font-head);
  font-size: 12px;
  font-weight: 700;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.dd-day-blocks {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dd-block {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--grad);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
}
.dd-block-name {
  display: block;
  font-size: 10px;
  opacity: 0.9;
}
.dd-block-time {
  display: block;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 12px;
}
.dd-empty-day {
  font-size: 11px;
  color: #cbd5e1;
  text-align: center;
  margin-top: 8px;
}

/* Charts row */
.dd-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) {
  .dd-grid-2 { grid-template-columns: 1fr; }
}

.dd-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
}
.dd-card h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0 0 16px;
}

/* Rating distribution list */
.dd-rating-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dd-rating-row {
  display: grid;
  grid-template-columns: 60px 1fr 30px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.dd-rating-label {
  color: var(--mut);
  font-weight: 600;
}
.dd-rating-track {
  height: 10px;
  border-radius: 999px;
  background: var(--soft);
  overflow: hidden;
}
.dd-rating-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--grad);
  transition: width 0.6s ease;
}
.dd-rating-count {
  text-align: right;
  font-family: var(--font-head);
  font-weight: 700;
  color: var(--ink);
}

.dd-loading {
  padding: 60px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}

.dd-actions {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dd-actions li a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--soft);
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.dd-actions li a:hover {
  background: #dfe8f7;
  transform: translateX(2px);
}
.dd-arrow {
  color: var(--v);
  font-weight: 700;
  transition: transform 0.15s;
}
.dd-actions li a:hover .dd-arrow {
  transform: translateX(3px);
}
`;

export default function DoctorOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDoctorOverview()
      .then(setData)
      .catch((err) => setError(err.data?.error || 'Could not load your overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dd-loading">Loading…</div>;
  if (error) return <div className="dd-loading">{error}</div>;
  if (!data) return null;

  const firstName = (data.doctor.name || 'Doctor').split(' ').slice(0, 2).join(' ');

  // Group schedule blocks by day
  const byDay = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  for (const b of data.schedule || []) {
    if (b.isAvailable === false) continue;
    byDay[b.dayOfWeek]?.push(b);
  }

  const monthlyBars = (data.charts?.appointmentsPerMonth || []).map((m) => ({
    label: m.label,
    value: m.value,
    color: '#7b5cf0',
  }));

  const statusSlices = (data.charts?.statusBreakdown || [])
    .filter((s) => s.value > 0)
    .map((s) => ({
      label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      value: s.value,
      color: STATUS_COLORS[s.status],
    }));

  const maxDistCount = Math.max(1, ...(data.charts?.ratingDistribution || []).map((r) => r.value));

  return (
    <div className="dd-page">
      <style>{CSS}</style>

      <header className="dd-header">
        <h1>Good day, {firstName}.</h1>
        <p className="dd-sub">Here's your practice at a glance.</p>
      </header>

      {/* KPI row */}
      <div className="dd-kpis">
        <div className="dd-kpi dd-kpi-blue">
          <p className="dd-kpi-label">Waiting for you</p>
          <p className="dd-kpi-value">{data.counts.pending}</p>
          <p className="dd-kpi-note">Pending requests</p>
        </div>
        <div className="dd-kpi dd-kpi-indigo">
          <p className="dd-kpi-label">Upcoming visits</p>
          <p className="dd-kpi-value">{data.counts.upcoming}</p>
          <p className="dd-kpi-note">This week</p>
        </div>
        <div className="dd-kpi dd-kpi-violet">
          <p className="dd-kpi-label">Completed</p>
          <p className="dd-kpi-value">{data.counts.completed}</p>
          <p className="dd-kpi-note">{data.counts.patients} unique patients</p>
        </div>
        <div className="dd-kpi dd-kpi-lav">
          <p className="dd-kpi-label">Average rating</p>
          <p className="dd-kpi-value">
            {data.averageRating != null ? data.averageRating.toFixed(1) : '—'}
          </p>
          <p className="dd-kpi-note">{data.counts.reviews} reviews</p>
        </div>
      </div>

      {/* Schedule strip */}
      <section className="dd-schedule">
        <div className="dd-schedule-head">
          <h2>My weekly schedule</h2>
          <Link to="/dashboard/schedule">Manage →</Link>
        </div>
        <div className="dd-week">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <div key={d} className="dd-day">
              <span className="dd-day-name">{DAY_SHORT[d]}</span>
              <div className="dd-day-blocks">
                {byDay[d].length === 0 ? (
                  <span className="dd-empty-day">—</span>
                ) : (
                  byDay[d].map((b) => (
                    <div key={b.id} className="dd-block">
                      <span className="dd-block-name">{b.hospital?.name || 'Hospital'}</span>
                      <span className="dd-block-time">
                        {b.startTime?.slice(11, 16)} – {b.endTime?.slice(11, 16)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts row */}
      <div className="dd-grid-2">
        <section className="dd-card">
          <h2>Appointments (last 6 months)</h2>
          {monthlyBars.every((b) => b.value === 0) ? (
            <p style={{ color: 'var(--mut)', fontSize: 14 }}>No appointments in the last 6 months.</p>
          ) : (
            <BarChart items={monthlyBars} />
          )}
        </section>

        <section className="dd-card">
          <h2>Appointments by status</h2>
          {statusSlices.length === 0 ? (
            <p style={{ color: 'var(--mut)', fontSize: 14 }}>No appointments yet.</p>
          ) : (
            <DonutChart slices={statusSlices} />
          )}
        </section>
      </div>

      {/* Rating distribution */}
      <div className="dd-grid-2">
        <section className="dd-card">
          <h2>Rating distribution</h2>
          {data.counts.reviews === 0 ? (
            <p style={{ color: 'var(--mut)', fontSize: 14 }}>No reviews yet.</p>
          ) : (
            <div className="dd-rating-list">
              {[...(data.charts?.ratingDistribution || [])].reverse().map((r) => (
                <div key={r.stars} className="dd-rating-row">
                  <span className="dd-rating-label">{r.stars} ★</span>
                  <div className="dd-rating-track">
                    <div
                      className="dd-rating-fill"
                      style={{ width: `${(r.value / maxDistCount) * 100}%` }}
                    />
                  </div>
                  <span className="dd-rating-count">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dd-card">
  <h2>Quick actions</h2>
  <ul className="dd-actions">
    <li>
      <Link to="/dashboard/appointments">
        <span>Review pending requests</span>
        <span className="dd-arrow">→</span>
      </Link>
    </li>
    <li>
      <Link to="/dashboard/schedule">
        <span>Manage my schedule</span>
        <span className="dd-arrow">→</span>
      </Link>
    </li>
    <li>
      <Link to="/dashboard/reviews">
        <span>Read my patient reviews</span>
        <span className="dd-arrow">→</span>
      </Link>
    </li>
    <li>
      <Link to="/dashboard/profile">
        <span>Update my profile</span>
        <span className="dd-arrow">→</span>
      </Link>
    </li>
  </ul>
</section>
      </div>
    </div>
  );
}