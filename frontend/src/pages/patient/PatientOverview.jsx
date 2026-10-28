import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import BarChart from '../../components/BarChart';
import DonutChart from '../../components/DonutChart';

const STATUS_COLORS = {
  pending: '#a78bfa',
  confirmed: '#008cfd',
  completed: '#7b5cf0',
  cancelled: '#cbd5e1',
};

const DOCTOR_COLORS = ['#7b5cf0', '#a78bfa', '#6d28d9', '#008cfd', '#4573d4'];

const TIPS = [
  { icon: '💧', title: 'Water first', body: 'Mild headaches are often dehydration. Try a full glass of water before anything else.' },
  { icon: '😴', title: 'Sleep matters', body: 'Most adults need 7–9 hours. Chronic poor sleep worsens almost every symptom.' },
  { icon: '🚶', title: 'Move a little', body: 'A short walk improves mood, circulation and digestion. 10 minutes is enough.' },
  { icon: '📝', title: 'Note your symptoms', body: 'When did it start? What makes it worse? Your doctor needs these details.' },
];

const CSS = `
.po-page { display: flex; flex-direction: column; gap: 22px; }

.po-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}
.po-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.po-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* KPI — colored gradient cards, all in the website palette */
.po-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.po-kpi {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 22px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 140px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.po-kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px #7b5cf033;
}

.po-kpi::after {
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

.po-kpi-icon {
  font-size: 22px;
  margin-bottom: 12px;
  opacity: 0.95;
}
.po-kpi-value {
  font-family: var(--font-head);
  font-size: 40px;
  line-height: 1;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}
.po-kpi-label {
  color: #ffffffd6;
  font-size: 13px;
  margin-top: 6px;
}

/* Four shades from the site palette — blue, deep violet, violet, lavender */
.po-kpi-blue    { background: linear-gradient(135deg, #008cfd, #4573d4); }
.po-kpi-indigo  { background: linear-gradient(135deg, #6d28d9, #7b5cf0); }
.po-kpi-violet  { background: linear-gradient(135deg, #7b5cf0, #a78bfa); }
.po-kpi-lav     { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }

/* Grid */
.po-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .po-grid-2 { grid-template-columns: 1fr; } }

.po-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
}
.po-card h2 { font-family: var(--font-head); font-size: 16px; margin: 0 0 16px; color: var(--ink); }
.po-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.po-card-head h2 { margin: 0; }
.po-link { color: var(--p); font-size: 13px; font-weight: 600; text-decoration: none; }
.po-link:hover { text-decoration: underline; }

.po-next-when { font-family: var(--font-head); font-size: 20px; font-weight: 700; color: var(--ink); margin: 0 0 4px; }
.po-next-where { font-size: 14px; color: var(--mut); margin: 0 0 14px; }
.po-next-meta { display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: var(--mut); }
.po-next-meta b { color: var(--ink); font-weight: 600; }

.po-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
  align-self: flex-start;
}
.po-badge-pending   { background: #ede9fe; color: #6d28d9; }
.po-badge-confirmed { background: #dbeafe; color: #1d4ed8; }

.po-empty { color: var(--mut); font-size: 14px; padding: 16px 0; margin: 0; }

/* Tip */
.po-tip { background: linear-gradient(135deg, #f5f3ff, #eef2ff); }
.po-tip-icon { font-size: 32px; margin-bottom: 8px; }
.po-tip h3 { font-family: var(--font-head); font-size: 16px; margin: 0 0 8px; }
.po-tip p { font-size: 14px; line-height: 1.6; color: var(--mut); margin: 0; }

/* Chart cards */
.po-chart-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
}
.po-chart-card h2 { font-family: var(--font-head); font-size: 16px; margin: 0 0 16px; }

/* Doctor bar list */
.po-doclist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.po-doclist li { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
.po-doc-name { font-size: 14px; font-weight: 600; color: var(--ink); margin: 0; }
.po-doc-spec { font-size: 12px; color: var(--mut); margin: 2px 0 0; }
.po-doc-count {
  font-family: var(--font-head);
  font-weight: 700;
  color: var(--v);
  align-self: center;
}
.po-doc-track {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: var(--soft);
  overflow: hidden;
  margin-top: 4px;
}
.po-doc-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }

.po-loading { padding: 60px; text-align: center; color: var(--mut); font-size: 15px; }
`;

export default function PatientOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPatientOverview()
      .then(setData)
      .catch((err) => setError(err.data?.error || 'Could not load your overview.'))
      .finally(() => setLoading(false));
  }, []);

  const tipIndex = new Date().getDate() % TIPS.length;
  const tip = TIPS[tipIndex];

  if (loading) return <div className="po-loading">Loading…</div>;
  if (error) return <div className="po-loading">{error}</div>;
  if (!data) return null;

  const firstName = (user?.name || 'there').split(' ')[0];
  const next = data.nextAppointment;

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

  const doctors = data.charts?.doctorsSeen || [];
  const maxDocCount = Math.max(1, ...doctors.map((d) => d.count));

  return (
    <div className="po-page">
      <style>{CSS}</style>

      <header className="po-header">
        <div>
          <h1>Hi, {firstName}.</h1>
          <p className="po-sub">Here's your health snapshot for today.</p>
        </div>
      </header>

      {/* KPI row — 4 colored tiles in the site palette */}
      <div className="po-kpis">
        <div className="po-kpi po-kpi-blue">
          <span className="po-kpi-icon">📅</span>
          <b className="po-kpi-value">{data.counts.upcoming}</b>
          <small className="po-kpi-label">Upcoming visits</small>
        </div>
        <div className="po-kpi po-kpi-indigo">
          <span className="po-kpi-icon">✅</span>
          <b className="po-kpi-value">{data.counts.completed}</b>
          <small className="po-kpi-label">Completed visits</small>
        </div>
        <div className="po-kpi po-kpi-violet">
          <span className="po-kpi-icon">🩺</span>
          <b className="po-kpi-value">{data.counts.doctors}</b>
          <small className="po-kpi-label">Doctors available</small>
        </div>
        <div className="po-kpi po-kpi-lav">
          <span className="po-kpi-icon">🏥</span>
          <b className="po-kpi-value">{data.counts.hospitals}</b>
          <small className="po-kpi-label">Hospitals near you</small>
        </div>
      </div>

      {/* Charts row */}
      <div className="po-grid-2">
        <section className="po-chart-card">
          <h2>Your appointments (last 6 months)</h2>
          {monthlyBars.every((b) => b.value === 0) ? (
            <p className="po-empty">No appointments in the last 6 months.</p>
          ) : (
            <BarChart items={monthlyBars} />
          )}
        </section>

        <section className="po-chart-card">
          <h2>Appointments by status</h2>
          {statusSlices.length === 0 ? (
            <p className="po-empty">No appointments yet.</p>
          ) : (
            <DonutChart slices={statusSlices} />
          )}
        </section>
      </div>

      {/* Next appointment + doctors seen */}
      <div className="po-grid-2">
        <section className="po-card">
          <div className="po-card-head">
            <h2>Next appointment</h2>
            <Link to="/dashboard/appointments" className="po-link">View all →</Link>
          </div>

          {!next ? (
            <p className="po-empty">
              No upcoming appointments. Start a symptom check to find the right care.
            </p>
          ) : (
            <>
              <span className={`po-badge po-badge-${next.status}`}>{next.status}</span>
              <p className="po-next-when">
                {new Date(next.dateTime).toLocaleString(undefined, {
                  weekday: 'long', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="po-next-where">
                {next.hospital?.name || 'Hospital TBD'}
              </p>
              <div className="po-next-meta">
                <span>
                  Doctor: <b>{next.doctor?.user?.name || 'TBD'}</b>
                  {next.doctor?.specialty?.name && ` · ${next.doctor.specialty.name}`}
                </span>
              </div>
            </>
          )}
        </section>

        <section className="po-chart-card">
          <h2>Doctors you've seen</h2>
          {doctors.length === 0 ? (
            <p className="po-empty">No completed visits yet.</p>
          ) : (
            <ul className="po-doclist">
              {doctors.map((d, i) => (
                <li key={d.name}>
                  <div>
                    <p className="po-doc-name">{d.name}</p>
                    {d.specialty && <p className="po-doc-spec">{d.specialty}</p>}
                  </div>
                  <span className="po-doc-count">{d.count}</span>
                  <div className="po-doc-track">
                    <div
                      className="po-doc-fill"
                      style={{
                        width: `${(d.count / maxDocCount) * 100}%`,
                        background: DOCTOR_COLORS[i % DOCTOR_COLORS.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Tip of the day */}
      <section className="po-card po-tip">
        <div className="po-tip-icon">{tip.icon}</div>
        <h3>{tip.title}</h3>
        <p>{tip.body}</p>
      </section>
    </div>
  );
}