import { useEffect, useState } from 'react';
import { api } from '../../api/client';

// ---------- Inline styles ----------
const CSS = `
.asp-page { display: flex; flex-direction: column; gap: 22px; }

.asp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.asp-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.asp-sub { color: var(--mut); font-size: 14px; margin: 0; }

.asp-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.asp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.asp-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.asp-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.asp-table tr:last-child td { border-bottom: none; }

.asp-name {
  font-weight: 600;
  margin: 0;
}
.asp-desc {
  color: var(--mut);
  font-size: 13px;
  margin: 0;
}

.asp-col-actions { text-align: right; white-space: nowrap; }
.asp-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.asp-state {
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
.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
`;

// ---------- Page ----------
export default function AdminSpecialties() {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSpecialties();
      setSpecialties(res.specialties || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load specialties.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(s) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    setBusyId(s.id);
    try {
      await api.deleteSpecialty(s.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete specialty.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="asp-page">
      <style>{CSS}</style>

      <header className="asp-header">
        <div>
          <h1>Specialties</h1>
          <p className="asp-sub">{specialties.length} record{specialties.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add specialty
        </button>
      </header>

      {loading && <div className="asp-state">Loading…</div>}
      {error && <div className="asp-state">{error}</div>}
      {!loading && !error && specialties.length === 0 && (
        <div className="asp-state">No specialties yet.</div>
      )}

      {!loading && !error && specialties.length > 0 && (
        <div className="asp-table-wrap">
          <table className="asp-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Name</th>
                <th>Description</th>
                <th className="asp-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {specialties.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="asp-name">{s.name}</p>
                  </td>
                  <td>
                    <p className="asp-desc">{s.description || '—'}</p>
                  </td>
                  <td className="asp-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(s)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === s.id}
                      onClick={() => handleDelete(s)}
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
        <SpecialtyModal
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <SpecialtyModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Create / Edit modal ----------
function SpecialtyModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
      };
      if (isEdit) {
        await api.updateSpecialty(existing.id, payload);
      } else {
        await api.createSpecialty(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save specialty.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit specialty' : 'New specialty'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dermatologist"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this specialty covers"
            />
          </div>

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