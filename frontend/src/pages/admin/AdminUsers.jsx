import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const ROLE_LABELS = { patient: 'Patient', doctor: 'Doctor', admin: 'Admin' };

// ---------- Inline styles ----------
const CSS = `
.aus-page { display: flex; flex-direction: column; gap: 22px; }

.aus-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.aus-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.aus-sub { color: var(--mut); font-size: 14px; margin: 0; }

.aus-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.aus-search {
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
}
.aus-search:focus { border-color: var(--p); box-shadow: 0 0 0 3px #008cfd22; }

.aus-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.aus-filter {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--mut);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.aus-filter:hover { background: var(--soft); color: var(--ink); }
.aus-filter.is-active {
  background: var(--grad);
  color: #fff;
  border-color: transparent;
}

.aus-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.aus-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.aus-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.aus-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.aus-table tr:last-child td { border-bottom: none; }

.aus-user-cell { display: flex; align-items: center; gap: 12px; }
.aus-avatar {
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
.aus-name { font-weight: 600; margin: 0; }
.aus-id { font-size: 12px; color: var(--mut); margin: 2px 0 0; }
.aus-email {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: var(--mut);
}

.aus-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.aus-badge-patient { background: #dbeafe; color: #1d4ed8; }
.aus-badge-doctor  { background: #ede9fe; color: #6d28d9; }
.aus-badge-admin   { background: #f5f3ff; color: #7b5cf0; }

.aus-col-actions { text-align: right; white-space: nowrap; }
.aus-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.aus-state {
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
.form-group input:disabled { opacity: 0.7; cursor: not-allowed; }
.form-group input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.form-hint {
  font-size: 12px;
  color: var(--mut);
  margin: 4px 0 0;
}

@media (max-width: 1000px) {
  .aus-table { table-layout: fixed; font-size: 13px; }
  .aus-table th {
    font-size: 11px;
    padding: 12px 9px 10px;
    letter-spacing: 0.04em;
  }
  .aus-table td { padding: 12px 9px; }
  .aus-user-cell { gap: 8px; }
  .aus-avatar { width: 32px; height: 32px; }
  .aus-email { font-size: 12px; overflow-wrap: anywhere; }
  .aus-col-actions .btn { margin: 2px; padding: 5px 8px; font-size: 11px; }
}

@media (max-width: 700px) {
  .aus-page { gap: 18px; }
  .aus-header h1 { font-size: 25px; }
  .aus-toolbar { align-items: stretch; flex-direction: column; }
  .aus-search { width: 100%; min-width: 0; font-size: 16px; }
  .aus-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .aus-filter { padding: 8px 6px; font-size: 12px; }
  .aus-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .aus-table,
  .aus-table tbody { display: block; width: 100%; }
  .aus-table thead { display: none; }
  .aus-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .aus-table td {
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
  .aus-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .aus-table td:nth-child(1)::before { content: 'User'; }
  .aus-table td:nth-child(2)::before { content: 'Email'; }
  .aus-table td:nth-child(3)::before { content: 'Role'; }
  .aus-table td:nth-child(4) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .aus-table td:nth-child(4)::before { content: ''; display: none; }
  .aus-user-cell { gap: 8px; }
  .aus-avatar { width: 30px; height: 30px; font-size: 13px; }
  .aus-name { font-size: 12px; }
  .aus-id { font-size: 11px; }
  .aus-email {
    width: 100%;
    font-size: 11px;
    word-break: break-word;
  }
  .aus-badge { padding: 3px 8px; font-size: 10px; }
  .aus-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }
}

@media (max-width: 380px) {
  .aus-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aus-table tr { grid-template-columns: minmax(0, 1fr); }
  .aus-table td:nth-child(4) { grid-column: auto; }
}
`;

// ---------- Page ----------
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(u) {
    if (u.role === 'admin' && !confirm(`Delete admin ${u.name}? Are you sure?`)) return;
    if (u.role !== 'admin' && !confirm(`Delete ${u.name}? This cannot be undone.`)) return;

    setBusyId(u.id);
    try {
      await api.deleteUser(u.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete user.');
    } finally {
      setBusyId(null);
    }
  }

  // Filter + search
  const visible = users.filter((u) => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'patient', label: 'Patients' },
    { key: 'doctor', label: 'Doctors' },
    { key: 'admin', label: 'Admins' },
  ];

  return (
    <div className="aus-page">
      <style>{CSS}</style>

      <header className="aus-header">
        <div>
          <h1>Users</h1>
          <p className="aus-sub">{users.length} record{users.length === 1 ? '' : 's'}</p>
        </div>
      </header>

      <div className="aus-toolbar">
        <input
          className="aus-search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="aus-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`aus-filter${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="aus-state">Loading…</div>}
      {error && <div className="aus-state">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="aus-state">No users match.</div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="aus-table-wrap">
          <table className="aus-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="aus-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="aus-user-cell">
                      <div className="aus-avatar">{(u.name || '?').charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="aus-name">{u.name}</p>
                        <p className="aus-id">ID #{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="aus-email">{u.email}</td>
                  <td>
                    <span className={`aus-badge aus-badge-${u.role}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="aus-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(u)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === u.id}
                      onClick={() => handleDelete(u)}
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

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Edit user modal ----------
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {};
    if (form.name.trim() && form.name.trim() !== user.name) payload.name = form.name.trim();
    if (form.email.trim() && form.email.trim() !== user.email) payload.email = form.email.trim();
    if (form.password) {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      payload.password = form.password;
    }

    if (Object.keys(payload).length === 0) {
      setError('Nothing to update.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateUser(user.id, payload);
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not update user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Edit user</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Leave blank to keep current password"
            />
            <p className="form-hint">Minimum 8 characters, 1 letter + 1 number.</p>
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