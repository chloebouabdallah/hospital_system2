import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const CSS = `
.dp-page { display: flex; flex-direction: column; gap: 22px; max-width: 820px; }

.dp-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.dp-sub { color: var(--mut); font-size: 14px; margin: 0; }

.dp-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 26px;
}
.dp-card h2 {
  font-family: var(--font-head);
  font-size: 16px;
  margin: 0 0 4px;
}
.dp-card-sub { color: var(--mut); font-size: 13px; margin: 0 0 20px; }

.dp-avatar-row {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 24px;
}
.dp-avatar {
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
.dp-avatar-info h2 {
  font-family: var(--font-head);
  font-size: 20px;
  margin: 0 0 6px;
}
.dp-avatar-role {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dp-specialty {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 8px;
}
.dp-hospital-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.dp-hospital-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-size: 12px;
  font-weight: 600;
}

.dp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) {
  .dp-row { grid-template-columns: 1fr; }
}

.dp-field { margin-bottom: 14px; }
.dp-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.dp-field input,
.dp-field select,
.dp-field textarea {
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
.dp-field textarea { resize: vertical; min-height: 100px; }
.dp-field input:focus,
.dp-field select:focus,
.dp-field textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.dp-field input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: var(--soft);
}
.dp-hint {
  font-size: 12px;
  color: var(--mut);
  margin: 4px 0 0;
  line-height: 1.5;
}

.dp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

.dp-flash {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 14px;
}
.dp-flash-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.dp-flash-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

.dp-loading {
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}
`;

export default function DoctorProfile() {
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
    bio: '',
    yearsExperience: '',
  });

  const [doctor, setDoctor] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [profileFlash, setProfileFlash] = useState({ type: '', msg: '' });
  const [passwordFlash, setPasswordFlash] = useState({ type: '', msg: '' });

  useEffect(() => {
    async function load() {
      try {
        const [meRes, docRes] = await Promise.all([
          api.getMe(),
          api.getMyDoctorProfile(),
        ]);
        const u = meRes.user;
        const d = docRes.doctor;
        setDoctor(d);
        setForm({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
          gender: u.gender || '',
          address: u.address || '',
          bio: d.bio || '',
          yearsExperience: d.yearsExperience ?? '',
        });
      } catch (err) {
        setProfileFlash({
          type: 'error',
          msg: err.data?.error || 'Could not load your profile.',
        });
      } finally {
        setLoading(false);
      }
    }
    load();
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
      // 1. Update the user-level fields
      await api.updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
      });

      // 2. Update the doctor-level fields (bio + years)
      await api.updateDoctor(doctor.id, {
        bio: form.bio || null,
        yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
      });

      await refreshUser();
      setProfileFlash({ type: 'success', msg: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFlash({
        type: 'error',
        msg: err.data?.error || 'Could not save profile.',
      });
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
      setPasswordFlash({
        type: 'error',
        msg: err.data?.error || 'Could not change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <div className="dp-loading">Loading profile…</div>;

  const initials = (form.name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hospitals = (doctor?.hospitals || []).map((h) => h.hospital);

  return (
    <div className="dp-page">
      <style>{CSS}</style>

      <header className="dp-header">
        <h1>My profile</h1>
        <p className="dp-sub">
          Keep your public profile up to date so patients can find you.
        </p>
      </header>

      {/* Profile card */}
      <section className="dp-card">
        <div className="dp-avatar-row">
          <div className="dp-avatar">{initials}</div>
          <div className="dp-avatar-info">
            <h2>{form.name || 'Your name'}</h2>
            <span className="dp-avatar-role">{user?.role}</span>
            {doctor?.specialty?.name && (
              <span className="dp-specialty">{doctor.specialty.name}</span>
            )}
            {hospitals.length > 0 && (
              <div className="dp-hospital-chips">
                {hospitals.map((h) => (
                  <span key={h.id} className="dp-hospital-chip">
                    {h.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {profileFlash.msg && (
          <div className={`dp-flash dp-flash-${profileFlash.type}`}>
            {profileFlash.msg}
          </div>
        )}

        <form onSubmit={saveProfile}>
          <div className="dp-row">
            <div className="dp-field">
              <label>Full name</label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div className="dp-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="dp-row">
            <div className="dp-field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+961 ..."
              />
            </div>
            <div className="dp-field">
              <label>Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
            </div>
          </div>

          <div className="dp-row">
            <div className="dp-field">
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
            <div className="dp-field">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Street, city"
              />
            </div>
          </div>

          <div className="dp-row">
            <div className="dp-field">
              <label>Specialty</label>
              <input value={doctor?.specialty?.name || '—'} disabled />
              <p className="dp-hint">
                Specialty is managed by an administrator.
              </p>
            </div>
            <div className="dp-field">
              <label>Years of experience</label>
              <input
                type="number"
                min="0"
                value={form.yearsExperience}
                onChange={(e) => update('yearsExperience', e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div className="dp-field">
            <label>Professional bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="A short description patients will see on your public profile."
              maxLength={1000}
            />
            <p className="dp-hint">
              This appears on your public profile and helps patients choose you.
            </p>
          </div>

          <div className="dp-field">
            <label>Works at</label>
            <div className="dp-hospital-chips">
              {hospitals.length === 0 ? (
                <span style={{ color: 'var(--mut)', fontSize: 13 }}>
                  Not linked to any hospital yet.
                </span>
              ) : (
                hospitals.map((h) => (
                  <span key={h.id} className="dp-hospital-chip">
                    {h.name}
                  </span>
                ))
              )}
            </div>
            <p className="dp-hint">
              Hospital assignments are managed by an administrator.
            </p>
          </div>

          <div className="dp-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Password card */}
      <section className="dp-card">
        <h2>Change password</h2>
        <p className="dp-card-sub">
          Minimum 8 characters, at least 1 letter and 1 number.
        </p>

        {passwordFlash.msg && (
          <div className={`dp-flash dp-flash-${passwordFlash.type}`}>
            {passwordFlash.msg}
          </div>
        )}

        <form onSubmit={savePassword}>
          <div className="dp-row">
            <div className="dp-field">
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
            <div className="dp-field">
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

          <div className="dp-actions">
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}