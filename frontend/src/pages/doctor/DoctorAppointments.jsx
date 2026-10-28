import { useEffect, useState } from 'react';
import { api } from '../../api/client';

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

const CSS = `
.da-page { display: flex; flex-direction: column; gap: 22px; }

.da-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.da-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.da-sub { color: var(--mut); font-size: 14px; margin: 0; }

.da-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.da-filter {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--mut);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  text-transform: capitalize;
  font-family: inherit;
}
.da-filter:hover { background: var(--soft); color: var(--ink); }
.da-filter.is-active {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

/* Cards list */
.da-list { display: flex; flex-direction: column; gap: 14px; }

.da-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.da-card:hover { border-color: #7b5cf055; }

.da-card-main {
  padding: 18px 22px;
  display: grid;
  grid-template-columns: 1fr 220px auto;
  gap: 18px;
  align-items: center;
}
@media (max-width: 900px) {
  .da-card-main { grid-template-columns: 1fr; gap: 12px; }
}

/* When column */
.da-when {
  font-family: var(--font-head);
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--ink);
}
.da-when-meta {
  font-size: 13px;
  color: var(--mut);
  margin: 0;
}
.da-notes {
  font-size: 12px;
  color: var(--mut);
  margin: 8px 0 0;
  padding: 8px 10px;
  background: var(--soft);
  border-radius: 8px;
  max-width: 40ch;
}

/* Patient column */
.da-patient {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.da-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.da-patient-name {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
  color: var(--ink);
}
.da-patient-email {
  font-size: 12px;
  color: var(--mut);
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions column */
.da-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.da-actions .btn { padding: 6px 14px; font-size: 13px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

/* Status badge */
.da-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 8px;
}
.da-badge-pending   { background: #ede9fe; color: #6d28d9; }
.da-badge-confirmed { background: #dbeafe; color: #1d4ed8; }
.da-badge-completed { background: #dcfce7; color: #166534; }
.da-badge-cancelled { background: #f1f5f9; color: #64748b; }

/* Expandable patient details */
.da-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 22px;
  border-top: 1px dashed var(--line);
  color: var(--v);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.da-card-foot:hover { background: var(--soft); }
.da-card-foot .da-chevron {
  display: inline-block;
  transition: transform 0.2s;
}
.da-card-foot.is-open .da-chevron { transform: rotate(180deg); }

.da-patient-panel {
  padding: 18px 22px 22px;
  background: var(--soft);
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.da-patient-field { display: flex; flex-direction: column; gap: 2px; }
.da-patient-field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
}
.da-patient-field-value {
  font-size: 14px;
  color: var(--ink);
  font-weight: 500;
}
.da-patient-notes {
  grid-column: 1 / -1;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
}
.da-patient-notes h4 {
  font-family: var(--font-head);
  font-size: 13px;
  margin: 0 0 6px;
  color: var(--ink);
}
.da-patient-notes p {
  margin: 0;
  font-size: 13px;
  color: var(--mut);
  line-height: 1.55;
  white-space: pre-wrap;
}

.da-state {
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
}
`;

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAppointments();
      setAppointments(res.appointments || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load appointments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(id, action) {
    const labels = { confirm: 'Confirm', complete: 'Complete', cancel: 'Cancel' };
    if (!confirm(`${labels[action]} this appointment?`)) return;
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

  function toggleExpand(id) {
    setExpanded((cur) => (cur === id ? null : id));
  }

  const visible = appointments.filter((a) =>
    filter === 'all' ? true : a.status === filter
  );

  return (
    <div className="da-page">
      <style>{CSS}</style>

      <header className="da-header">
        <div>
          <h1>Appointments</h1>
          <p className="da-sub">
            {appointments.length} appointment{appointments.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="da-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`da-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="da-state">Loading…</div>}
      {error && <div className="da-state">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="da-state">
          {filter === 'all' ? 'No appointments yet.' : `No ${filter} appointments.`}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="da-list">
          {visible.map((a) => {
            const isOpen = expanded === a.id;
            const p = a.patient || {};
            return (
              <article key={a.id} className="da-card">
                <div className="da-card-main">
                  {/* When + status */}
                  <div>
                    <p className="da-when">{formatDateTime(a.dateTime)}</p>
                    <p className="da-when-meta">
                      {a.hospital?.name ?? '—'}
                      {a.hospital?.city ? ` · ${a.hospital.city}` : ''}
                    </p>
                    <span className={`da-badge da-badge-${a.status}`}>{a.status}</span>
                    {a.notes && <p className="da-notes">{a.notes}</p>}
                  </div>

                  {/* Patient */}
                  <div className="da-patient">
                    <div className="da-avatar">
                      {(p.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="da-patient-name">{p.name ?? 'Unknown patient'}</p>
                      <p className="da-patient-email">{p.email ?? '—'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="da-actions">
                    {a.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-primary"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'confirm')}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-danger"
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
                          className="btn"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'complete')}
                        >
                          Complete
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={busyId === a.id}
                          onClick={() => changeStatus(a.id, 'cancel')}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expandable patient details */}
                <div
                  className={`da-card-foot${isOpen ? ' is-open' : ''}`}
                  onClick={() => toggleExpand(a.id)}
                >
                  <span>{isOpen ? 'Hide patient details' : 'View patient details'}</span>
                  <span className="da-chevron">▾</span>
                </div>

                {isOpen && (
                  <div className="da-patient-panel">
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Full name</span>
                      <span className="da-patient-field-value">{p.name ?? '—'}</span>
                    </div>
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Email</span>
                      <span className="da-patient-field-value">{p.email ?? '—'}</span>
                    </div>
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Phone</span>
                      <span className="da-patient-field-value">{p.phone ?? '—'}</span>
                    </div>
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Date of birth</span>
                      <span className="da-patient-field-value">
                        {p.dateOfBirth
                          ? new Date(p.dateOfBirth).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Gender</span>
                      <span className="da-patient-field-value">
                        {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}
                      </span>
                    </div>
                    <div className="da-patient-field">
                      <span className="da-patient-field-label">Address</span>
                      <span className="da-patient-field-value">{p.address ?? '—'}</span>
                    </div>

                    <div className="da-patient-notes">
                      <h4>Medical history notes</h4>
                      <p>{p.medicalNotes || 'No notes provided by the patient.'}</p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}