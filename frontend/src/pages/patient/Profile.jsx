import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const CSS = `
.pf-page { display: flex; flex-direction: column; gap: 22px; max-width: 780px; }

.pf-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.pf-sub { color: var(--mut); font-size: 14px; margin: 0; }

.pf-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 26px;
}
.pf-card h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0 0 4px;
}
.pf-card-sub { color: var(--mut); font-size: 13px; margin: 0 0 20px; }

.pf-avatar-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.pf-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 800;
  font-size: 28px;
  flex-shrink: 0;
}
.pf-avatar-info h2 {
  font-family: var(--font-head);
  font-size: 20px;
  margin: 0 0 4px;
}
.pf-avatar-role {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) {
  .pf-row { grid-template-columns: 1fr; }
}

.pf-field { margin-bottom: 14px; }
.pf-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.pf-field input,
.pf-field select,
.pf-field textarea {
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
.pf-field textarea { resize: vertical; min-height: 90px; }
.pf-field input:focus,
.pf-field select:focus,
.pf-field textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.pf-hint {
  font-size: 12px;
  color: var(--mut);
  margin: 4px 0 0;
  line-height: 1.5;
}

.pf-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

.pf-flash {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 14px;
}
.pf-flash-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.pf-flash-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
`;

export default function PatientProfile() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    medicalNotes: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [profileFlash, setProfileFlash] = useState({ type: '', msg: '' });
  const [passwordFlash, setPasswordFlash] = useState({ type: '', msg: '' });

  useEffect(() => {
    api.getMe()
      .then((r) => {
        const u = r.user;
        setForm({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
          gender: u.gender || '',
          address: u.address || '',
          medicalNotes: u.medicalNotes || '',
        });
      })
      .catch((err) =>
        setProfileFlash({ type: 'error', msg: err.data?.error || 'Could not load profile.' })
      )
      .finally(() => setLoading(false));
  }, []);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    if (profileFlash.msg) setProfileFlash({ type: '', msg: '' });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileFlash({ type: '', msg: '' });
    setSaving(true);
    try {
      await api.updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        medicalNotes: form.medicalNotes.trim() || null,
      });
      await refreshUser();
      setProfileFlash({ type: 'success', msg: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFlash({ type: 'error', msg: err.data?.error || 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordFlash({ type: '', msg: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFlash({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.updateUser(user.id, { password: passwordForm.newPassword });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setPasswordFlash({ type: 'success', msg: 'Password changed.' });
    } catch (err) {
      setPasswordFlash({ type: 'error', msg: err.data?.error || 'Could not change password.' });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--mut)' }}>Loading profile…</div>;
  }

  const initials = (form.name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="pf-page">
      <style>{CSS}</style>

      <header className="pf-header">
        <h1>My profile</h1>
        <p className="pf-sub">Update your personal details and password.</p>
      </header>

      {/* Profile card */}
      <section className="pf-card">
        <div className="pf-avatar-row">
          <div className="pf-avatar">{initials}</div>
          <div className="pf-avatar-info">
            <h2>{form.name || 'Your name'}</h2>
            <span className="pf-avatar-role">{user?.role}</span>
          </div>
        </div>

        {profileFlash.msg && (
          <div className={`pf-flash pf-flash-${profileFlash.type}`}>
            {profileFlash.msg}
          </div>
        )}

        <form onSubmit={saveProfile}>
          <div className="pf-row">
            <div className="pf-field">
              <label>Full name</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div className="pf-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pf-row">
            <div className="pf-field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+961 ..."
              />
            </div>
            <div className="pf-field">
              <label>Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
            </div>
          </div>

          <div className="pf-row">
            <div className="pf-field">
              <label>Gender</label>
              <select
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="">— prefer not to say —</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="pf-field">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Street, city"
              />
            </div>
          </div>

          <div className="pf-field">
            <label>Medical history notes (optional)</label>
            <textarea
              value={form.medicalNotes}
              onChange={(e) => update('medicalNotes', e.target.value)}
              placeholder="Allergies, chronic conditions, current medications…"
              maxLength={2000}
            />
            <p className="pf-hint">
              These notes are visible to doctors you book. Do not include sensitive information
              you would not share with a healthcare professional.
            </p>
          </div>

          <div className="pf-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Password card */}
      <section className="pf-card">
        <h2>Change password</h2>
        <p className="pf-card-sub">
          Minimum 8 characters, at least 1 letter and 1 number.
        </p>

        {passwordFlash.msg && (
          <div className={`pf-flash pf-flash-${passwordFlash.type}`}>
            {passwordFlash.msg}
          </div>
        )}

        <form onSubmit={savePassword}>
          <div className="pf-row">
            <div className="pf-field">
              <label>New password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                required
              />
            </div>
            <div className="pf-field">
              <label>Confirm new password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="pf-actions">
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}