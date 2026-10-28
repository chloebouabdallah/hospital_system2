import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import './NewAppointmentModal.css';

export default function NewAppointmentModal({ onClose, onCreated }) {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load patients, doctors, hospitals once
  useEffect(() => {
    (async () => {
      try {
        const [p, d, h] = await Promise.all([
          api.getPatients().catch(() => ({ users: [] })),
          api.getDoctors().catch(() => ({ doctors: [] })),
          api.getHospitals().catch(() => ({ hospitals: [] })),
        ]);
        setPatients(p.users || []);
        setDoctors(d.doctors || []);
        setHospitals(h.hospitals || []);
      } catch {
        /* fallbacks already handled */
      }
    })();
  }, []);

  // Load slots when doctor + hospital + date set
  useEffect(() => {
    setSlot('');
    setSlots([]);
    if (!doctorId || !hospitalId || !date) return;
    setLoadingSlots(true);
    api
      .getAvailableSlots(doctorId, date, hospitalId)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, hospitalId, date]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!patientId || !doctorId || !hospitalId || !slot) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createAppointment({
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        hospitalId: Number(hospitalId),
        dateTime: slot,
      });
      onCreated();
    } catch (err) {
      setError(err.data?.error || 'Could not create appointment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Book an appointment</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Doctor</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
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
            <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} required>
              <option value="">Select a hospital…</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>45-minute slots</label>
            {loadingSlots && <p className="modal-hint">Loading slots…</p>}
            {!loadingSlots && slots.length === 0 && (
              <p className="modal-hint">Pick a date to see free slots.</p>
            )}
            {!loadingSlots && slots.length > 0 && (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={`slot-btn${slot === s ? ' is-active' : ''}`}
                    onClick={() => setSlot(s)}
                  >
                    {new Date(s).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Booking…' : 'Book appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}