import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------- Inline styles ----------
const CSS = `
.as-page { display: flex; flex-direction: column; gap: 22px; }

.as-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.as-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.as-sub { color: var(--mut); font-size: 14px; margin: 0; }

.as-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.as-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.as-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.as-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.as-table tr:last-child td { border-bottom: none; }

.as-doctor { font-weight: 600; margin: 0; }
.as-spec { font-size: 12px; color: var(--mut); margin: 2px 0 0; }

.as-day {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-weight: 600;
  font-size: 12px;
}

.as-hours {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: var(--ink);
}

.as-available {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.as-available-yes { background: #dcfce7; color: #166534; }
.as-available-no  { background: #f1f5f9; color: #64748b; }

.as-col-actions { text-align: right; white-space: nowrap; }
.as-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.as-state {
  padding: 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #0e1a3380;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
  backdrop-filter: blur(3px);
}
.modal {
  background: var(--card);
  border-radius: 18px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 60px #00000030;
  overflow: hidden;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
}
.modal-head h2 { font-family: var(--font-head); font-size: 18px; margin: 0; }
.modal-close {
  background: none; border: none;
  font-size: 24px; line-height: 1;
  color: var(--mut); cursor: pointer; padding: 0 4px;
}
.modal-body {
  padding: 22px 24px 24px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
}
.modal-actions {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;
}
.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 11px 14px;
  font-size: 15px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
}
.form-group input:disabled { opacity: 0.7; cursor: not-allowed; }
.form-group select:focus,
.form-group input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.checkbox-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}
.checkbox-line input[type='checkbox'] {
  width: 16px; height: 16px;
  accent-color: var(--v);
  cursor: pointer;
}

@media (max-width: 1000px) {
  .as-table { table-layout: fixed; font-size: 13px; }
  .as-table th {
    font-size: 11px;
    padding: 12px 9px 10px;
    letter-spacing: 0.04em;
  }
  .as-table td { padding: 12px 9px; }
  .as-hours { font-size: 11px; }
  .as-col-actions .btn { margin: 2px; padding: 5px 8px; font-size: 11px; }
}

@media (max-width: 700px) {
  .as-header h1 { font-size: 25px; }
  .as-header > .btn { padding: 8px 12px; font-size: 13px; }
  .as-page > .form-group { max-width: none !important; }
  .as-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .as-table,
  .as-table tbody { display: block; width: 100%; }
  .as-table thead { display: none; }
  .as-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .as-table td {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-width: 0;
    padding: 9px 0;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .as-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .as-table td:nth-child(1)::before { content: 'Doctor'; }
  .as-table td:nth-child(2)::before { content: 'Hospital'; }
  .as-table td:nth-child(3)::before { content: 'Day'; }
  .as-table td:nth-child(4)::before { content: 'Hours'; }
  .as-table td:nth-child(5)::before { content: 'Status'; }
  .as-table td:nth-child(6) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .as-table td:nth-child(6)::before { content: ''; display: none; }
  .as-doctor { font-size: 12px; }
  .as-spec { font-size: 11px; }
  .as-day,
  .as-available { padding: 3px 8px; font-size: 10px; }
  .as-hours { font-size: 11px; }
  .as-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }
}

@media (max-width: 380px) {
  .as-table tr { grid-template-columns: minmax(0, 1fr); }
  .as-table td:nth-child(6) { grid-column: auto; }
}
`;

// ---------- Page ----------
export default function AdminSchedules() {
  const [items, setItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const q = filterDoctor ? `?doctorId=${filterDoctor}` : '';
      const [a, d, h] = await Promise.all([
        api.getAvailability(q),
        api.getDoctors(),
        api.getHospitals(),
      ]);
      setItems(a.availability || []);
      setDoctors(d.doctors || []);
      setHospitals(h.hospitals || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load schedules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterDoctor]);

  async function handleDelete(item) {
    const doc = doctors.find((d) => d.id === item.doctorId);
    const name = doc?.user?.name || `Doctor #${item.doctorId}`;
    if (!confirm(`Delete this schedule for ${name}?`)) return;
    setBusyId(item.id);
    try {
      await api.deleteAvailability(item.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete schedule.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="as-page">
      <style>{CSS}</style>

      <header className="as-header">
        <div>
          <h1>Schedules</h1>
          <p className="as-sub">{items.length} record{items.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add schedule block
        </button>
      </header>

      <div className="form-group" style={{ maxWidth: 320 }}>
        <label>Filter by doctor</label>
        <select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.user?.name || `Doctor #${d.id}`}</option>
          ))}
        </select>
      </div>

      {loading && <div className="as-state">Loading…</div>}
      {error && <div className="as-state">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="as-state">No schedule blocks yet.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Hospital</th>
                <th>Day</th>
                <th>Hours</th>
                <th>Status</th>
                <th className="as-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const start = it.startTime?.slice(11, 16) ?? '—';
                const end = it.endTime?.slice(11, 16) ?? '—';
                const active = it.isAvailable !== false;
                return (
                  <tr key={it.id}>
                    <td>
                      <p className="as-doctor">{it.doctor?.user?.name ?? `Doctor #${it.doctorId}`}</p>
                      {it.doctor?.specialty?.name && (
                        <p className="as-spec">{it.doctor.specialty.name}</p>
                      )}
                    </td>
                    <td>{it.hospital?.name ?? '—'}</td>
                    <td>
                      <span className="as-day">{DAY_SHORT[it.dayOfWeek] ?? '?'}</span>
                    </td>
                    <td className="as-hours">{start} – {end}</td>
                    <td>
                      <span className={`as-available as-available-${active ? 'yes' : 'no'}`}>
                        {active ? 'Available' : 'Blocked'}
                      </span>
                    </td>
                    <td className="as-col-actions">
                      <button className="btn btn-sm" onClick={() => setEditing(it)}>Edit</button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busyId === it.id}
                        onClick={() => handleDelete(it)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <ScheduleModal
          doctors={doctors}
          hospitals={hospitals}
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <ScheduleModal
          existing={editing}
          doctors={doctors}
          hospitals={hospitals}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Create / Edit modal ----------
function ScheduleModal({ existing, doctors, hospitals, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    doctorId: existing?.doctorId ?? '',
    hospitalId: existing?.hospitalId ?? '',
    dayOfWeek: existing?.dayOfWeek ?? 1,
    startTime: existing?.startTime?.slice(11, 16) ?? '09:00',
    endTime: existing?.endTime?.slice(11, 16) ?? '13:00',
    isAvailable: existing?.isAvailable !== false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isEdit && (!form.doctorId || !form.hospitalId)) {
      setError('Doctor and hospital are required.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        isAvailable: form.isAvailable,
      };
      if (isEdit) {
        // Admin/doctor can also change the hospital. Doctor is immutable (matches backend).
        if (form.hospitalId) payload.hospitalId = Number(form.hospitalId);
        await api.updateAvailability(existing.id, payload);
      } else {
        payload.doctorId = Number(form.doctorId);
        payload.hospitalId = Number(form.hospitalId);
        await api.createAvailability(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save schedule.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit schedule block' : 'New schedule block'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Doctor</label>
            <select
              value={form.doctorId}
              onChange={(e) => update('doctorId', e.target.value)}
              disabled={isEdit}
              required
            >
              <option value="">Select a doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user?.name || `Doctor #${d.id}`}
                  {d.specialty ? ` · ${d.specialty.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Hospital</label>
            <select
              value={form.hospitalId}
              onChange={(e) => update('hospitalId', e.target.value)}
              required
            >
              <option value="">Select a hospital…</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name} · {h.city}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Day of week</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => update('dayOfWeek', Number(e.target.value))}
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => update('isAvailable', e.target.checked)}
            />
            <span>Available (uncheck to temporarily block this window)</span>
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}