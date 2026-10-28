import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import BookingModal from './BookingModal';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDateTime(iso) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { weekday, date, time };
}

const CSS = `
.ma-page { display: flex; flex-direction: column; gap: 18px; }

.ma-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.ma-header h1 {
  font-family: var(--font-head);
  font-size: 26px;
  margin: 0 0 3px;
  letter-spacing: -0.02em;
}
.ma-sub { color: var(--mut); font-size: 13px; margin: 0; }

/* Filters */
.ma-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.ma-filter {
  padding: 6px 14px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--mut);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  text-transform: capitalize;
  font-family: inherit;
}
.ma-filter:hover { background: var(--soft); color: var(--ink); }
.ma-filter.is-active {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

/* Card list */
.ma-list { display: flex; flex-direction: column; gap: 10px; }

.ma-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 90px 1fr auto;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ma-card:hover { border-color: #7b5cf055; box-shadow: 0 4px 16px #7b5cf010; }
@media (max-width: 780px) {
  .ma-card { grid-template-columns: 80px 1fr; }
  .ma-card-actions { grid-column: 1 / -1; border-left: none; border-top: 1px solid var(--line); }
}

/* Date column */
.ma-date-col {
  background: var(--soft);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1px;
  border-right: 1px solid var(--line);
}
.ma-date-wd {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
}
.ma-date-day {
  font-family: var(--font-head);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 2px 0;
}
.ma-date-mon {
  font-size: 11px;
  font-weight: 600;
  color: var(--mut);
}
.ma-date-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--v);
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--line);
  width: 100%;
}

/* Body column */
.ma-body { padding: 14px 16px; min-width: 0; }
.ma-body-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}
.ma-doctor {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.ma-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.ma-doctor-name {
  font-family: var(--font-head);
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ma-doctor-spec {
  font-size: 11px;
  color: var(--mut);
  margin: 1px 0 0;
}

.ma-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12.5px;
  color: var(--mut);
}
.ma-details span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ma-details b { color: var(--ink); font-weight: 600; }

.ma-notes {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--mut);
  font-style: italic;
  padding: 4px 8px;
  background: var(--soft);
  border-radius: 6px;
  border-left: 2px solid var(--v);
}

/* Status badge */
.ma-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.ma-badge-pending   { background: #ede9fe; color: #6d28d9; }
.ma-badge-confirmed { background: #dbeafe; color: #1d4ed8; }
.ma-badge-completed { background: #dcfce7; color: #166534; }
.ma-badge-cancelled { background: #f1f5f9; color: #64748b; }

/* Actions column */
.ma-card-actions {
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  border-left: 1px solid var(--line);
  min-width: 130px;
}
.ma-card-actions .btn {
  width: 100%;
  padding: 6px 12px;
  font-size: 12.5px;
}
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }
.ma-card-actions .btn-review { color: var(--v); border-color: var(--v); background: #fff; }
.ma-card-actions .btn-review:hover { background: var(--soft); }

.ma-state {
  padding: 48px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
}

/* Modal (unchanged) */
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
  resize: vertical;
  min-height: 90px;
}
.form-group textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.star-picker { display: flex; gap: 6px; margin-top: 4px; }
.star-btn {
  background: none; border: none;
  font-size: 30px; line-height: 1;
  cursor: pointer; color: #d1d5db; padding: 0;
  transition: color 0.1s, transform 0.1s;
}
.star-btn:hover { transform: scale(1.15); }
.star-btn.is-filled { color: #f59e0b; }
`;

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [reviewsByApptId, setReviewsByApptId] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [booking, setBooking] = useState(false);
  const [reviewFor, setReviewFor] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAppointments();
      const list = res.appointments || [];
      setAppointments(list);

      const completed = list.filter((a) => a.status === 'completed');
      const reviewChecks = await Promise.all(
        completed.map((a) =>
          api
            .getReviewForAppointment(a.id)
            .then((r) => [a.id, r.review])
            .catch(() => [a.id, null])
        )
      );
      setReviewsByApptId(Object.fromEntries(reviewChecks));
    } catch (err) {
      setError(err.data?.error || 'Could not load your appointments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(appt) {
    if (!confirm(`Cancel this appointment with ${appt.doctor?.user?.name}?`)) return;
    setBusyId(appt.id);
    try {
      await api.cancelAppointment(appt.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not cancel appointment.');
    } finally {
      setBusyId(null);
    }
  }

  const visible = appointments.filter((a) =>
    filter === 'all' ? true : a.status === filter
  );

  return (
    <div className="ma-page">
      <style>{CSS}</style>

      <header className="ma-header">
        <div>
          <h1>My appointments</h1>
          <p className="ma-sub">
            {appointments.length} appointment{appointments.length === 1 ? '' : 's'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setBooking(true)}>
          + New appointment
        </button>
      </header>

      <div className="ma-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ma-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="ma-state">Loading…</div>}
      {error && <div className="ma-state">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="ma-state">
          {filter === 'all' ? (
            <>No appointments yet. Book your first visit from <b>Find doctors</b>.</>
          ) : (
            `No ${filter} appointments.`
          )}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="ma-list">
          {visible.map((a) => {
            const hasReview = !!reviewsByApptId[a.id];
            const { weekday, date, time } = formatDateTime(a.dateTime);
            const [dayNum, ...rest] = date.split(' ');
            const monthYear = rest.slice(1).join(' ');
            const month = rest[0];

            return (
              <article key={a.id} className="ma-card">
                {/* Date block */}
                <div className="ma-date-col">
                  <span className="ma-date-wd">{weekday}</span>
                  <span className="ma-date-day">{dayNum}</span>
                  <span className="ma-date-mon">{month} {monthYear}</span>
                  <span className="ma-date-time">{time}</span>
                </div>

                {/* Main body */}
                <div className="ma-body">
                  <div className="ma-body-head">
                    <div className="ma-doctor">
                      <div className="ma-avatar">
                        {(a.doctor?.user?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p className="ma-doctor-name">{a.doctor?.user?.name ?? '—'}</p>
                        {a.doctor?.specialty?.name && (
                          <p className="ma-doctor-spec">{a.doctor.specialty.name}</p>
                        )}
                      </div>
                    </div>
                    <span className={`ma-badge ma-badge-${a.status}`}>{a.status}</span>
                  </div>

                  <div className="ma-details">
                    <span>
                      📍 <b>{a.hospital?.name ?? '—'}</b>
                      {a.hospital?.city ? ` · ${a.hospital.city}` : ''}
                    </span>
                  </div>

                  {a.notes && <div className="ma-notes">{a.notes}</div>}
                </div>

                {/* Actions */}
                <div className="ma-card-actions">
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <button
                      className="btn btn-danger"
                      disabled={busyId === a.id}
                      onClick={() => handleCancel(a)}
                    >
                      Cancel
                    </button>
                  )}
                  {a.status === 'completed' && (
                    <button
                      className={`btn${hasReview ? '' : ' btn-review'}`}
                      onClick={() => setReviewFor(a)}
                    >
                      {hasReview ? 'Edit review' : 'Add review'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {booking && (
        <BookingFromScratchModal
          onClose={() => setBooking(false)}
          onBooked={async () => { setBooking(false); await load(); }}
        />
      )}

      {reviewFor && (
        <ReviewModal
          appointment={reviewFor}
          onClose={() => setReviewFor(null)}
          onSaved={async () => { setReviewFor(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Book from scratch (patient picks doctor) ----------
function BookingFromScratchModal({ onClose, onBooked }) {
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctors()
      .then((r) => setDoctors(r.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return (
      <BookingModal
        doctor={selected}
        onClose={onClose}
        onBooked={onBooked}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Pick a doctor</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          {loading && <p style={{ color: 'var(--mut)' }}>Loading…</p>}
          {!loading && doctors.length === 0 && (
            <p style={{ color: 'var(--mut)' }}>No doctors available.</p>
          )}
          {!loading && doctors.map((d) => (
            <button
              key={d.id}
              className="btn"
              style={{ textAlign: 'left', padding: '12px 16px' }}
              onClick={() => setSelected(d)}
            >
              <b>{d.user?.name}</b>
              {d.specialty ? ` · ${d.specialty.name}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Review modal ----------
function ReviewModal({ appointment, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getReviewForAppointment(appointment.id)
      .then((r) => {
        if (r.review) {
          setExisting(r.review);
          setRating(r.review.rating);
          setComment(r.review.comment || '');
        }
      })
      .catch(() => { /* 404 = no review */ })
      .finally(() => setLoading(false));
  }, [appointment.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (rating < 1 || rating > 5) {
      setError('Please pick a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { rating, comment: comment.trim() || null };
      if (existing) {
        await api.updateReview(appointment.id, payload);
      } else {
        await api.createReview(appointment.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save review.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteReview(appointment.id);
      onSaved();
    } catch (err) {
      alert(err.data?.error || 'Could not delete review.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{existing ? 'Edit your review' : 'Leave a review'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {loading ? (
          <div className="modal-body">
            <p style={{ color: 'var(--mut)' }}>Loading…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            <div style={{ padding: '12px 14px', background: 'var(--soft)', borderRadius: 12 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>
                {appointment.doctor?.user?.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--mut)' }}>
                {new Date(appointment.dateTime).toLocaleString(undefined, {
                  weekday: 'long', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })} · {appointment.hospital?.name}
              </p>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                Your rating
              </label>
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`star-btn${n <= rating ? ' is-filled' : ''}`}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was your visit? (visible to other patients)"
                maxLength={2000}
              />
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>}

            <div className="modal-actions">
              {existing ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete review'}
                </button>
              ) : (
                <span />
              )}
              <div className="right">
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : existing ? 'Save review' : 'Post review'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}