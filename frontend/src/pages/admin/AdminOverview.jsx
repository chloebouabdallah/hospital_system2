import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import useCountUp from '../../hooks/useCountUp';
import BarChart from '../../components/BarChart';
import DonutChart from '../../components/DonutChart';
import './AdminOverview.css';

const STATUS_COLORS = {
  pending: '#eab308',
  confirmed: '#008cfd',
  completed: '#16a34a',
  cancelled: '#94a3b8',
};

const SPECIALTY_COLORS = ['#008cfd', '#7b5cf0', '#a78bfa', '#6d28d9', '#4573d4', '#8b5cf6'];

function Kpi({ value, label, icon, tint }) {
  const [ref, n] = useCountUp(value);
  return (
    <div className="ao-kpi" ref={ref} style={{ '--tint': tint }}>
      <span className="ao-kpi-icon" aria-hidden="true">{icon}</span>
      <b className="ao-kpi-value">{n}</b>
      <small className="ao-kpi-label">{label}</small>
    </div>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminOverview();
      setData(res);
    } catch (err) {
      setError(err.data?.error || 'Could not load the overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="ao-state">Loading overview…</div>;
  }

  if (error) {
    return (
      <div className="ao-state">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  const { totals, appointmentsByStatus, doctorsBySpecialty, recentAppointments, topDoctors } = data;

  const statusBars = [
    { label: 'Pending', value: appointmentsByStatus.pending, color: STATUS_COLORS.pending },
    { label: 'Confirmed', value: appointmentsByStatus.confirmed, color: STATUS_COLORS.confirmed },
    { label: 'Completed', value: appointmentsByStatus.completed, color: STATUS_COLORS.completed },
    { label: 'Cancelled', value: appointmentsByStatus.cancelled, color: STATUS_COLORS.cancelled },
  ];

  const specialtySlices = doctorsBySpecialty
    .filter((s) => s.count > 0)
    .map((s, i) => ({
      label: s.specialty,
      value: s.count,
      color: SPECIALTY_COLORS[i % SPECIALTY_COLORS.length],
    }));

  return (
    <div className="ao-page">
      <header className="ao-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'Admin'}.</h1>
          <p className="ao-sub">Here's how GuideCare is doing today.</p>
        </div>
      </header>

      {/* KPI row */}
      <div className="ao-kpis">
        <Kpi value={totals.users} label="Total users" icon="👥" tint="blue" />
        <Kpi value={totals.doctors} label="Doctors" icon="🩺" tint="violet" />
        <Kpi value={totals.hospitals} label="Hospitals" icon="🏥" tint="indigo" />
        <Kpi value={totals.appointments} label="Appointments" icon="📅" tint="sky" />
      </div>

      {/* Charts row */}
      <div className="ao-grid-2">
        <section className="ao-card">
          <h2>Appointments by status</h2>
          <BarChart items={statusBars} />
        </section>

        <section className="ao-card">
          <h2>Doctors by specialty</h2>
          {specialtySlices.length === 0 ? (
            <div className="ao-empty">No doctors yet.</div>
          ) : (
            <DonutChart slices={specialtySlices} />
          )}
        </section>
      </div>

      {/* Tables row */}
      <div className="ao-grid-2">
        <section className="ao-card">
          <div className="ao-card-head">
            <h2>Recent appointments</h2>
            <Link to="/dashboard/appointments" className="ao-link">View all →</Link>
          </div>
          {recentAppointments.length === 0 ? (
            <div className="ao-empty">No appointments yet.</div>
          ) : (
            <table className="ao-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {new Date(a.dateTime).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>{a.patient?.name ?? '—'}</td>
                    <td>{a.doctor?.user?.name ?? '—'}</td>
                    <td>
                      <span className={`ao-badge ao-badge-${a.status}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="ao-card">
          <div className="ao-card-head">
            <h2>Top-rated doctors</h2>
            <Link to="/dashboard/doctors" className="ao-link">View all →</Link>
          </div>
          {topDoctors.length === 0 ? (
            <div className="ao-empty">No reviews yet.</div>
          ) : (
            <ul className="ao-topdocs">
              {topDoctors.map((d) => (
                <li key={d.id}>
                  <div className="ao-topdoc-avatar">{d.name.charAt(0)}</div>
                  <div className="ao-topdoc-info">
                    <p className="ao-topdoc-name">{d.name}</p>
                    <p className="ao-topdoc-spec">{d.specialty || '—'}</p>
                  </div>
                  <div className="ao-topdoc-rating">
                    <span className="ao-topdoc-star">★</span>
                    <b>{d.avgRating?.toFixed(1)}</b>
                    <small>({d.reviewCount})</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}