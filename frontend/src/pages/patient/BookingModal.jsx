import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

const CSS = `
.bm-backdrop {
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
.bm-modal {
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
.bm-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
}
.bm-head h2 { font-family: var(--font-head); font-size: 18px; margin: 0; }
.bm-close {
  background: none; border: none;
  font-size: 24px; line-height: 1;
  color: var(--mut); cursor: pointer; padding: 0 4px;
}
.bm-body {
  padding: 22px 24px 24px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
}
.bm-doctor {
  padding: 12px 14px;
  background: var(--soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.bm-doctor-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  flex-shrink: 0;
}
.bm-doctor-info p { margin: 0; }
.bm-doctor-name { font-weight: 600; font-size: 14px; color: var(--ink); }
.bm-doctor-spec { font-size: 12px; color: var(--mut); margin-top: 2px !important; }

.bm-policy {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid;
}
.bm-policy-urgent   { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.bm-policy-moderate { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.bm-policy-low      { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.bm-policy-default  { background: var(--soft); border-color: var(--line); color: var(--mut); }
.bm-policy-title {
  font-weight: 700;
  font-family: var(--font-head);
  margin: 0 0 2px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.bm-policy-msg { margin: 0; }

.bm-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
  display: block;
}
.bm-select,
.bm-input {
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
.bm-select:focus, .bm-input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.bm-hint { font-size: 13px; color: var(--mut); margin: 4px 0 0; }

.bm-slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.bm-slot {
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
.bm-slot:hover { border-color: var(--v); }
.bm-slot.is-selected {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

.bm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.bm-error { color: #dc2626; font-size: 14px; margin: 0; }

.bm-days {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  margin-top: 8px;
}
.bm-day {
  flex: 0 0 auto;
  min-width: 78px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.bm-day:hover { border-color: var(--v); }
.bm-day.is-active { background: var(--grad); color: #fff; border-color: transparent; }
.bm-day-name { display: block; font-size: 12px; font-weight: 700; }
.bm-day-date { display: block; font-size: 12px; opacity: 0.85; margin-top: 2px; }
.bm-day-count { display: block; font-size: 11px; opacity: 0.75; margin-top: 2px; }
.bm-slot-hosp { display: block; font-size: 10.5px; font-weight: 500; opacity: 0.8; margin-top: 2px; }
.bm-summary { font-size: 13px; color: var(--mut); margin: 10px 0 0; }
`;

// ---- helpers: group ISO slots by the patient's LOCAL calendar day ----
const pad = (n) => String(n).padStart(2, '0');
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayLabel(key, date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (key === localKey(today)) return 'Today';
  if (key === localKey(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function groupByDay(slots) {
  const map = new Map();
  for (const s of slots) {
    const d = new Date(s.dateTime);
    const key = localKey(d);
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: dayLabel(key, d),
        date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        slots: [],
      });
    }
    map.get(key).slots.push(s);
  }
  return [...map.values()];
}

export default function BookingModal({ doctor, preselectedHospitalId, urgency, onClose, onBooked }) {
  const level = ['urgent', 'moderate', 'low'].includes(urgency) ? urgency : 'no_triage';

  const [hospitalId, setHospitalId] = useState(preselectedHospitalId ?? '');
  const [policy, setPolicy] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null); // { dateTime, hospitalId }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load EVERY free slot inside this urgency's booking window (built from the doctor's schedule)
  // as soon as the modal opens: no date has to be picked first.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setSelectedSlot(null);
    const qs = new URLSearchParams({ urgency: level });
    if (hospitalId) qs.set('hospitalId', hospitalId);
    api
      .getBookableSlots(doctor.id, `?${qs}`)
      .then((r) => {
        if (cancelled) return;
        setPolicy(r.policy || null);
        setSlots(r.slots || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setSlots([]);
        setLoadError(err.data?.error || 'Could not load available times.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [doctor.id, hospitalId, level]);

  const days = useMemo(() => groupByDay(slots), [slots]);

  // Keep a valid day selected (first day with slots by default).
  useEffect(() => {
    if (days.length === 0) { setActiveDay(''); return; }
    if (!days.some((d) => d.key === activeDay)) setActiveDay(days[0].key);
  }, [days, activeDay]);

  const hospitals = doctor.hospitals || [];
  const hospitalName = (id) => hospitals.find((h) => h.hospital?.id === id)?.hospital?.name;
  const showHospitalOnSlots = !hospitalId && new Set(slots.map((s) => s.hospitalId)).size > 1;
  const currentDay = days.find((d) => d.key === activeDay);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!selectedSlot) {
      setError('Please pick a time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createAppointment({
        doctorId: doctor.id,
        hospitalId: Number(selectedSlot.hospitalId),
        dateTime: selectedSlot.dateTime,
        urgency: level,
      });
      onBooked();
    } catch (err) {
      setError(err.data?.error || 'Could not book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const policyClass = policy
    ? `bm-policy-${policy.urgencyLevel === 'no_triage' ? 'default' : policy.urgencyLevel}`
    : 'bm-policy-default';

  return (
    <div className="bm-backdrop" onClick={onClose}>
      <style>{CSS}</style>
      <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="bm-head">
          <h2>Book an appointment</h2>
          <button className="bm-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="bm-body">
          <div className="bm-doctor">
            <div className="bm-doctor-avatar">
              {(doctor.user?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="bm-doctor-info">
              <p className="bm-doctor-name">{doctor.user?.name}</p>
              <p className="bm-doctor-spec">{doctor.specialty?.name}</p>
            </div>
          </div>

          {/* Policy banner */}
          {policy && (
            <div className={`bm-policy ${policyClass}`}>
              <p className="bm-policy-title">
                {policy.urgencyLevel === 'urgent' && 'Urgent'}
                {policy.urgencyLevel === 'moderate' && 'Moderate'}
                {policy.urgencyLevel === 'low' && 'Low priority'}
                {policy.urgencyLevel === 'no_triage' && 'Standard booking'}
              </p>
              {policy.message && <p className="bm-policy-msg">{policy.message}</p>}
            </div>
          )}

          {hospitals.length > 1 && (
            <div>
              <label className="bm-label">Hospital</label>
              <select
                className="bm-select"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">All locations</option>
                {hospitals.map((h) => (
                  <option key={h.hospital?.id} value={h.hospital?.id}>
                    {h.hospital?.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="bm-label">Available days and times</label>

            {loading && <p className="bm-hint">Loading available times…</p>}
            {!loading && loadError && <p className="bm-error">{loadError}</p>}

            {!loading && !loadError && days.length === 0 && (
              <p className="bm-hint">
                No free slots{policy ? ` in the next ${policy.maxDaysAhead} day${policy.maxDaysAhead === 1 ? '' : 's'}` : ''}
                {policy?.minHoursAhead > 0 ? ` (bookings must be at least ${policy.minHoursAhead}h ahead)` : ''}.
                {' '}This doctor may have no schedule for that period
                {hospitals.length > 1 && !hospitalId ? '' : ' at this location'}. Try another doctor or location.
              </p>
            )}

            {!loading && days.length > 0 && (
              <>
                <div className="bm-days" role="tablist" aria-label="Available days">
                  {days.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      role="tab"
                      aria-selected={d.key === activeDay}
                      className={`bm-day${d.key === activeDay ? ' is-active' : ''}`}
                      onClick={() => { setActiveDay(d.key); setSelectedSlot(null); }}
                    >
                      <span className="bm-day-name">{d.name}</span>
                      <span className="bm-day-date">{d.date}</span>
                      <span className="bm-day-count">{d.slots.length} slot{d.slots.length === 1 ? '' : 's'}</span>
                    </button>
                  ))}
                </div>

                {currentDay && (
                  <div className="bm-slots">
                    {currentDay.slots.map((s) => {
                      const isSel = selectedSlot?.dateTime === s.dateTime && selectedSlot?.hospitalId === s.hospitalId;
                      return (
                        <button
                          key={`${s.dateTime}-${s.hospitalId}`}
                          type="button"
                          className={`bm-slot${isSel ? ' is-selected' : ''}`}
                          onClick={() => setSelectedSlot(s)}
                        >
                          {new Date(s.dateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          {showHospitalOnSlots && (
                            <span className="bm-slot-hosp">{hospitalName(s.hospitalId) || ''}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSlot && (
                  <p className="bm-summary">
                    Selected:{' '}
                    <b>
                      {new Date(selectedSlot.dateTime).toLocaleString(undefined, {
                        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })}
                    </b>
                    {hospitalName(selectedSlot.hospitalId) ? ` · ${hospitalName(selectedSlot.hospitalId)}` : ''}
                  </p>
                )}
              </>
            )}
          </div>

          {error && <p className="bm-error">{error}</p>}

          <div className="bm-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !selectedSlot}>
              {submitting ? 'Booking…' : 'Book appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}