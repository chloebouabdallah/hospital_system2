import { useEffect, useState } from 'react';
import { api } from '../../api/client';

// ---------- Inline styles ----------
const CSS = `
.ad-page { display: flex; flex-direction: column; gap: 22px; }

.ad-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.ad-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.ad-sub { color: var(--mut); font-size: 14px; margin: 0; }

.ad-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.ad-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ad-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.ad-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.ad-table tr:last-child td { border-bottom: none; }

.ad-doctor-cell { display: flex; align-items: center; gap: 12px; }
.ad-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-family: var(--font-head);
  flex-shrink: 0;
}
.ad-name { font-weight: 600; margin: 0; }
.ad-bio {
  font-size: 12px;
  color: var(--mut);
  margin: 2px 0 0;
  max-width: 32ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-hospitals { font-size: 13px; color: var(--mut); }
.ad-rating {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
}
.ad-star { color: #f59e0b; font-size: 15px; }
.ad-rating b { font-family: var(--font-head); font-weight: 700; }
.ad-rating small { color: var(--mut); }
.ad-rating-empty { color: var(--mut); }
.ad-col-actions { text-align: right; white-space: nowrap; }
.ad-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }
.ad-state {
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
.form-group textarea { resize: vertical; min-height: 60px; }
.form-group input:disabled { opacity: 0.7; cursor: not-allowed; }
.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}

/* Hospital multiselect */
.hospital-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--soft);
}
.hospital-check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  padding: 4px 2px;
}
.hospital-check input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--v);
  cursor: pointer;
  flex-shrink: 0;
}
.hospital-check em {
  color: var(--mut);
  font-style: normal;
  font-size: 12px;
}
.modal-hint {
  font-size: 13px;
  color: var(--mut);
  margin: 4px 0 0;
}

@media (max-width: 1000px) {
  .ad-table { table-layout: fixed; font-size: 13px; }
  .ad-table th {
    font-size: 11px;
    padding: 12px 9px 10px;
    letter-spacing: 0.04em;
  }
  .ad-table td { padding: 12px 9px; }
  .ad-doctor-cell { gap: 8px; }
  .ad-avatar { width: 32px; height: 32px; }
  .ad-name { font-size: 13px; }
  .ad-hospitals { font-size: 12px; }
  .ad-col-actions .btn { margin: 2px; padding: 5px 8px; font-size: 11px; }
}

@media (max-width: 700px) {
  .ad-header h1 { font-size: 25px; }
  .ad-header > .btn { padding: 8px 12px; font-size: 13px; }
  .ad-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .ad-table,
  .ad-table tbody { display: block; width: 100%; }
  .ad-table thead { display: none; }
  .ad-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .ad-table td {
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
  .ad-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .ad-table td:nth-child(1)::before { content: 'Doctor'; }
  .ad-table td:nth-child(2)::before { content: 'Specialty'; }
  .ad-table td:nth-child(3)::before { content: 'Years'; }
  .ad-table td:nth-child(4)::before { content: 'Hospitals'; }
  .ad-table td:nth-child(5)::before { content: 'Rating'; }
  .ad-table td:nth-child(6) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .ad-table td:nth-child(6)::before { content: ''; display: none; }
  .ad-doctor-cell { align-items: center; }
  .ad-avatar { width: 30px; height: 30px; font-size: 13px; }
  .ad-name { font-size: 12px; }
  .ad-bio {
    max-width: 24ch;
    font-size: 11px;
  }
  .ad-hospitals { font-size: 11px; }
  .ad-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }
  .ad-rating { font-size: 12px; }
  .ad-rating small { font-size: 10px; }
}

@media (max-width: 380px) {
  .ad-table tr { grid-template-columns: minmax(0, 1fr); }
  .ad-table td:nth-child(6) { grid-column: auto; }
}
`;

// ---------- Page ----------
export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDoctors();
      setDoctors(res.doctors || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load doctors.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(d) {
    if (!confirm(`Delete ${d.user?.name || 'this doctor'}?`)) return;
    setBusyId(d.id);
    try {
      await api.deleteDoctor(d.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete doctor.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ad-page">
      <style>{CSS}</style>

      <header className="ad-header">
        <div>
          <h1>Doctors</h1>
          <p className="ad-sub">{doctors.length} record{doctors.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add doctor
        </button>
      </header>

      {loading && <div className="ad-state">Loading…</div>}
      {error && <div className="ad-state">{error}</div>}
      {!loading && !error && doctors.length === 0 && (
        <div className="ad-state">No doctors yet.</div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Years</th>
                <th>Hospitals</th>
                <th>Rating</th>
                <th className="ad-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="ad-doctor-cell">
                      <div className="ad-avatar">{(d.user?.name || '?').charAt(0)}</div>
                      <div>
                        <p className="ad-name">{d.user?.name ?? 'Unknown'}</p>
                        {d.bio && <p className="ad-bio">{d.bio}</p>}
                      </div>
                    </div>
                  </td>
                  <td>{d.specialty?.name ?? '—'}</td>
                  <td>{d.yearsExperience ?? '—'}</td>
                  <td className="ad-hospitals">
                    {d.hospitals?.length
                      ? d.hospitals.map((h) => h.hospital?.name || h.name).join(', ')
                      : '—'}
                  </td>
                  <td>
                    {d.avgRating ? (
                      <span className="ad-rating">
                        <span className="ad-star">★</span>
                        <b>{d.avgRating.toFixed(1)}</b>
                        <small>({d.reviewCount ?? 0})</small>
                      </span>
                    ) : (
                      <span className="ad-rating ad-rating-empty">— (0)</span>
                    )}
                  </td>
                  <td className="ad-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(d)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === d.id}
                      onClick={() => handleDelete(d)}
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
        <NewDoctorModal
          onClose={() => setShowNew(false)}
          onCreated={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <EditDoctorModal
          doctor={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- New doctor modal ----------
function NewDoctorModal({ onClose, onCreated }) {
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    specialtyId: '',
    yearsExperience: '',
    bio: '',
    hospitalIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getSpecialties(), api.getHospitals()])
      .then(([s, h]) => {
        setSpecialties(s.specialties || []);
        setHospitals(h.hospitals || []);
      })
      .catch(() => {});
  }, []);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleHospital(id) {
    setForm((f) => ({
      ...f,
      hospitalIds: f.hospitalIds.includes(id)
        ? f.hospitalIds.filter((x) => x !== id)
        : [...f.hospitalIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.specialtyId) {
      setError('Name, email, password and specialty are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        specialtyId: Number(form.specialtyId),
      };
      if (form.yearsExperience !== '') payload.yearsExperience = Number(form.yearsExperience);
      if (form.bio.trim()) payload.bio = form.bio.trim();
      if (form.hospitalIds.length > 0) payload.hospitalIds = form.hospitalIds;
      await api.createDoctor(payload);
      onCreated();
    } catch (err) {
      setError(err.data?.error || 'Could not create doctor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>New doctor</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Full name</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)}
              placeholder="Dr. Jane Doe" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              placeholder="jane.doe@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
              placeholder="min 8 chars, 1 letter + 1 number" required />
          </div>
          <div className="form-group">
            <label>Specialty</label>
            <select value={form.specialtyId} onChange={(e) => update('specialtyId', e.target.value)} required>
              <option value="">Select a specialty…</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Years of experience</label>
            <input type="number" min="0" value={form.yearsExperience}
              onChange={(e) => update('yearsExperience', e.target.value)} placeholder="e.g. 8" />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea rows="3" value={form.bio} onChange={(e) => update('bio', e.target.value)}
              placeholder="Short professional description" />
          </div>

          <div className="form-group">
            <label>Works at</label>
            {hospitals.length === 0 ? (
              <p className="modal-hint">No hospitals yet. Add some first.</p>
            ) : (
              <div className="hospital-checks">
                {hospitals.map((h) => (
                  <label key={h.id} className="hospital-check">
                    <input
                      type="checkbox"
                      checked={form.hospitalIds.includes(h.id)}
                      onChange={() => toggleHospital(h.id)}
                    />
                    <span>{h.name} <em>· {h.city}</em></span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Edit doctor modal ----------
function EditDoctorModal({ doctor, onClose, onSaved }) {
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    specialtyId: doctor.specialty?.id ?? '',
    bio: doctor.bio ?? '',
    yearsExperience: doctor.yearsExperience ?? '',
    hospitalIds: (doctor.hospitals || []).map((h) => h.hospital?.id).filter(Boolean),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getSpecialties(), api.getHospitals()])
      .then(([s, h]) => {
        setSpecialties(s.specialties || []);
        setHospitals(h.hospitals || []);
      })
      .catch(() => {});
  }, []);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleHospital(id) {
    setForm((f) => ({
      ...f,
      hospitalIds: f.hospitalIds.includes(id)
        ? f.hospitalIds.filter((x) => x !== id)
        : [...f.hospitalIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { hospitalIds: form.hospitalIds };
      if (form.specialtyId !== '') payload.specialtyId = Number(form.specialtyId);
      if (form.bio !== '') payload.bio = form.bio;
      if (form.yearsExperience !== '') payload.yearsExperience = Number(form.yearsExperience);
      await api.updateDoctor(doctor.id, payload);
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not update doctor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Edit doctor</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input value={doctor.user?.name ?? ''} disabled />
          </div>
          <div className="form-group">
            <label>Specialty</label>
            <select value={form.specialtyId} onChange={(e) => update('specialtyId', e.target.value)}>
              <option value="">— none —</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Years of experience</label>
            <input type="number" min="0" value={form.yearsExperience}
              onChange={(e) => update('yearsExperience', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea rows="3" value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Works at</label>
            {hospitals.length === 0 ? (
              <p className="modal-hint">No hospitals yet.</p>
            ) : (
              <div className="hospital-checks">
                {hospitals.map((h) => (
                  <label key={h.id} className="hospital-check">
                    <input
                      type="checkbox"
                      checked={form.hospitalIds.includes(h.id)}
                      onChange={() => toggleHospital(h.id)}
                    />
                    <span>{h.name} <em>· {h.city}</em></span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}