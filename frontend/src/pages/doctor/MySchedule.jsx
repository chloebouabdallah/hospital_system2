import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Prisma returns TIME columns as Date objects (1970-01-01 + time).
// These helpers accept either a Date or a "HH:MM(:SS)" string and normalize.
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

function toMinutes(v) {
  const d = toDate(v);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function toHHMM(v) {
  const d = toDate(v);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
.mys-page { display: flex; flex-direction: column; gap: 22px; }

.mys-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.mys-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.mys-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* Week grid */
.mys-week {
  display: grid;
  grid-template-columns: 80px 1fr;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
}
.mys-week-col {
  display: flex;
  flex-direction: column;
}
.mys-week-head {
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  border-bottom: 1px solid var(--line);
  text-align: center;
  background: var(--soft);
}
.mys-hour {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px 14px 0 0;
  font-size: 11px;
  color: var(--mut);
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  border-bottom: 1px solid var(--line);
}
.mys-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.mys-day-col {
  border-left: 1px solid var(--line);
  position: relative;
}
.mys-day-head {
  padding: 14px 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
  text-align: center;
  background: var(--soft);
}
.mys-day-head.is-today {
  color: var(--v);
  background: linear-gradient(135deg, #7b5cf010, #a78bfa10);
}
.mys-day-body {
  position: relative;
  height: calc(60px * 14);
}
.mys-day-body::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 59px,
      var(--line) 59px,
      var(--line) 60px
    );
  pointer-events: none;
}

.mys-block {
  position: absolute;
  left: 4px;
  right: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--grad);
  color: #fff;
  font-size: 11px;
  line-height: 1.3;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 4px 12px #7b5cf033;
  transition: transform 0.15s, box-shadow 0.15s;
  border: none;
  font-family: inherit;
  text-align: left;
}
.mys-block:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 20px #7b5cf055;
  z-index: 5;
}
.mys-block-name {
  font-weight: 600;
  font-size: 10px;
  opacity: 0.9;
  display: block;
  margin-bottom: 2px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.mys-block-time {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 12px;
}

.mys-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.mys-list-head h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0;
}
.mys-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.mys-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.mys-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.mys-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.mys-table tr:last-child td { border-bottom: none; }

.mys-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mys-badge-yes { background: #dcfce7; color: #166534; }
.mys-badge-no  { background: #f1f5f9; color: #64748b; }

.mys-col-actions { text-align: right; white-space: nowrap; }
.mys-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.mys-empty {
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
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
  display: flex; justify-content: space-between; gap: 8px; margin-top: 6px;
}
.modal-actions .right { display: flex; gap: 8px; }

.form-group select,
.form-group input {
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

@media (max-width: 900px) {
  .mys-page { gap: 18px; min-width: 0; }
  .mys-header h1 { font-size: 25px; }
  .mys-header > .btn { padding: 8px 12px; font-size: 13px; }

  .mys-week {
    grid-template-columns: 58px 650px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    border-radius: 16px;
  }
  .mys-week-head { padding: 12px 4px; }
  .mys-hour { padding-right: 6px; font-size: 10px; }
  .mys-day-head { padding: 12px 6px; font-size: 11px; }
  .mys-block { left: 3px; right: 3px; padding: 6px 5px; }
  .mys-block-name { font-size: 9px; }
  .mys-block-time { font-size: 10px; }

  .mys-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .mys-table,
  .mys-table tbody { display: block; width: 100%; }
  .mys-table thead { display: none; }
  .mys-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .mys-table td {
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
  .mys-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .mys-table td:nth-child(1)::before { content: 'Day'; }
  .mys-table td:nth-child(2)::before { content: 'Hospital'; }
  .mys-table td:nth-child(3)::before { content: 'Hours'; }
  .mys-table td:nth-child(4)::before { content: 'Status'; }
  .mys-table td:nth-child(5) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .mys-table td:nth-child(5)::before { content: ''; display: none; }
  .mys-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }
  .mys-badge { padding: 3px 8px; font-size: 10px; }
}

@media (max-width: 560px) {
  .mys-page { gap: 16px; }
  .mys-header h1 { font-size: 23px; }
  .mys-header > .btn { width: 100%; }
  .mys-week {
    grid-template-columns: 48px 630px;
    border-radius: 13px;
  }
  .mys-hour { font-size: 9px; padding-right: 4px; }
  .mys-day-head { padding: 10px 3px; font-size: 10px; }
  .mys-block { padding: 5px 3px; border-radius: 7px; }
  .mys-block-time { font-size: 9px; }
  .mys-list-head { margin-top: 0; }
  .mys-empty { padding: 36px 18px; font-size: 14px; }

  .mys-page .modal-backdrop { align-items: flex-end; padding: 0; }
  .mys-page .modal {
    width: 100%;
    max-width: none;
    max-height: 92vh;
    max-height: 92dvh;
    border-radius: 18px 18px 0 0;
  }
  .mys-page .modal-head { padding: 16px 18px; }
  .mys-page .modal-head h2 { font-size: 17px; }
  .mys-page .modal-body { padding: 18px 18px max(18px, env(safe-area-inset-bottom)); }
  .mys-page .form-group input,
  .mys-page .form-group select { font-size: 16px; }
}

@media (max-width: 380px) {
  .mys-table tr { grid-template-columns: minmax(0, 1fr); }
  .mys-table td:nth-child(5) { grid-column: auto; }
  .mys-page .form-row { grid-template-columns: minmax(0, 1fr); }
  .mys-page .modal-actions { flex-wrap: wrap; }
  .mys-page .modal-actions > .btn,
  .mys-page .modal-actions .right { flex: 1 1 100%; }
  .mys-page .modal-actions .right .btn { flex: 1; }
}
`;

export default function MySchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctor, setDoctor] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const doc = await api.getMyDoctorProfile();
      const me = doc.doctor;
      setDoctor(me);
      const avail = await api.getAvailability(`?doctorId=${me.id}`);
      setAvailability(avail.availability || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load your schedule.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(block) {
    if (!confirm('Delete this schedule block?')) return;
    setBusyId(block.id);
    try {
      await api.deleteAvailability(block.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete block.');
    } finally {
      setBusyId(null);
    }
  }

  const byDay = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  for (const b of availability) {
    byDay[b.dayOfWeek]?.push(b);
  }
  for (const d in byDay) {
    byDay[d].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }

  const GRID_START_MIN = 7 * 60;
  const HOUR_PX = 60;
  const VISIBLE_HOURS = 14;

  function blockTop(startTime) {
    const mins = toMinutes(startTime) - GRID_START_MIN;
    return (mins / 60) * HOUR_PX;
  }
  function blockHeight(startTime, endTime) {
    const mins = toMinutes(endTime) - toMinutes(startTime);
    return (mins / 60) * HOUR_PX - 2;
  }

  if (loading) return <div className="mys-empty">Loading schedule…</div>;
  if (error) return <div className="mys-empty">{error}</div>;

  const todayDow = new Date().getDay();

  return (
    <div className="mys-page">
      <style>{CSS}</style>

      <header className="mys-header">
        <div>
          <h1>My schedule</h1>
          <p className="mys-sub">
            {availability.length} block{availability.length === 1 ? '' : 's'} per week
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add schedule block
        </button>
      </header>

      {/* Week grid */}
      <div className="mys-week">
        <div className="mys-week-col">
          <div className="mys-week-head">&nbsp;</div>
          {Array.from({ length: VISIBLE_HOURS }).map((_, i) => {
            const hour = 7 + i;
            const h12 = hour % 12 === 0 ? 12 : hour % 12;
            const suffix = hour < 12 ? 'AM' : 'PM';
            return (
              <div key={i} className="mys-hour">
                {String(h12).padStart(2, '0')}:00 {suffix}
              </div>
            );
          })}
        </div>

        <div className="mys-days">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <div key={d} className="mys-day-col">
              <div className={`mys-day-head${d === todayDow ? ' is-today' : ''}`}>
                {DAY_SHORT[d]}
              </div>
              <div className="mys-day-body">
                {byDay[d].map((b) => {
                  const top = blockTop(b.startTime);
                  const h = blockHeight(b.startTime, b.endTime);
                  if (top + h < 0 || top > VISIBLE_HOURS * HOUR_PX) return null;
                  return (
                    <button
                      key={b.id}
                      className="mys-block"
                      style={{
                        top: `${Math.max(0, top)}px`,
                        height: `${Math.max(24, h)}px`,
                        opacity: b.isAvailable === false ? 0.55 : 1,
                      }}
                      onClick={() => setEditing(b)}
                      title={`${b.hospital?.name || ''} ${fmtTime(b.startTime)}–${fmtTime(b.endTime)}`}
                    >
                      <span className="mys-block-name">{b.hospital?.name}</span>
                      <span className="mys-block-time">
                        {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* List view */}
      <div className="mys-list-head">
        <h2>All blocks</h2>
      </div>

      {availability.length === 0 ? (
        <div className="mys-empty">
          No schedule blocks yet. Add your first to start receiving bookings.
        </div>
      ) : (
        <div className="mys-table-wrap">
          <table className="mys-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Hospital</th>
                <th>Hours</th>
                <th>Status</th>
                <th className="mys-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {availability
                .slice()
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime))
                .map((b) => (
                  <tr key={b.id}>
                    <td>{DAY_NAMES[b.dayOfWeek]}</td>
                    <td>{b.hospital?.name ?? '—'}</td>
                    <td>{fmtTime(b.startTime)} – {fmtTime(b.endTime)}</td>
                    <td>
                      <span className={`mys-badge mys-badge-${b.isAvailable === false ? 'no' : 'yes'}`}>
                        {b.isAvailable === false ? 'Blocked' : 'Available'}
                      </span>
                    </td>
                    <td className="mys-col-actions">
                      <button className="btn btn-sm" onClick={() => setEditing(b)}>Edit</button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busyId === b.id}
                        onClick={() => handleDelete(b)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <ScheduleModal
          doctor={doctor}
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <ScheduleModal
          existing={editing}
          doctor={doctor}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Create / Edit modal ----------
function ScheduleModal({ existing, doctor, onClose, onSaved }) {
  const isEdit = !!existing;
  const hospitals = (doctor?.hospitals || []).map((h) => h.hospital);

  const [form, setForm] = useState({
    hospitalId: existing?.hospital?.id ?? existing?.hospitalId ?? hospitals[0]?.id ?? '',
    dayOfWeek: existing?.dayOfWeek ?? 1,
    startTime: existing ? toHHMM(existing.startTime) : '09:00',
    endTime: existing ? toHHMM(existing.endTime) : '13:00',
    isAvailable: existing?.isAvailable !== false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.hospitalId) {
      setError('Pick a hospital.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('End time must be after start time.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        hospitalId: Number(form.hospitalId),
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        isAvailable: form.isAvailable,
      };
      if (isEdit) {
        await api.updateAvailability(existing.id, payload);
      } else {
        payload.doctorId = doctor.id;
        await api.createAvailability(payload);
      }
      onSaved();
    } catch (err) {
      const details = err.data?.details ? ' ' + err.data.details.join(' ') : '';
      setError((err.data?.error || 'Could not save schedule.') + details);
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
            <label>Hospital</label>
            <select
              value={form.hospitalId}
              onChange={(e) => update('hospitalId', e.target.value)}
              required
            >
              <option value="">Select a hospital…</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {hospitals.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--mut)', margin: '6px 0 0' }}>
                You are not linked to any hospital yet. An admin must assign you first.
              </p>
            )}
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
              <label>Start</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>End</label>
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

          {error && <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>}

          <div className="modal-actions">
            <span />
            <div className="right">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}