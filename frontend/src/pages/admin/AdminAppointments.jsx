import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import NewAppointmentModal from './NewAppointmentModal';
import './AdminAppointments.css';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const res = await api.getAppointments(query);
      setAppointments(res.appointments || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load appointments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function changeStatus(id, action) {
    setBusyId(id);
    try {
      if (action === 'confirm') await api.confirmAppointment(id);
      if (action === 'complete') await api.completeAppointment(id);
      if (action === 'cancel') await api.cancelAppointment(id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not update the appointment.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ap-page">
      <header className="ap-header">
        <div>
          <h1>Appointments</h1>
          <p className="ap-sub">{appointments.length} records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New appointment
        </button>
      </header>

      <div className="ap-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ap-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="ap-state">Loading…</div>}
      {error && <div className="ap-state">{error}</div>}

      {!loading && !error && appointments.length === 0 && (
        <div className="ap-state">No appointments found.</div>
      )}

      {!loading && !error && appointments.length > 0 && (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Hospital</th>
                <th>Status</th>
                <th className="ap-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="ap-when">{formatDateTime(a.dateTime)}</div>
                    {a.notes && <div className="ap-note">{a.notes}</div>}
                  </td>
                  <td>{a.patient?.name ?? '—'}</td>
                  <td>{a.doctor?.user?.name ?? '—'}</td>
                  <td>{a.hospital?.name ?? '—'}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${a.status}`}>{a.status}</span>
                  </td>
                  <td className="ap-col-actions">
                    {a.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'confirm')}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'cancel')}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {a.status === 'confirmed' && (
                      <>
                        <button
                          className="btn btn-sm"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'complete')}
                        >
                          Complete
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'cancel')}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={async () => { setShowNew(false); await load(); }}
        />
      )}
    </div>
  );
}