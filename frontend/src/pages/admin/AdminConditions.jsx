import { useEffect, useState } from 'react';
import { api } from '../../api/client';

// ---------- Inline styles ----------
const CSS = `
.ac-page { display: flex; flex-direction: column; gap: 22px; }

.ac-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.ac-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.ac-sub { color: var(--mut); font-size: 14px; margin: 0; }

.ac-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.ac-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.ac-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.ac-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: top;
}
.ac-table tr:last-child td { border-bottom: none; }

.ac-name { font-weight: 600; margin: 0; }
.ac-desc {
  color: var(--mut);
  font-size: 13px;
  margin: 0;
  max-width: 44ch;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ac-specialty {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-weight: 600;
  font-size: 12px;
}
.ac-specialty-none {
  background: #f1f5f9;
  color: #94a3b8;
}

.ac-col-actions { text-align: right; white-space: nowrap; }
.ac-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.ac-state {
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
  max-width: 560px;
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

@media (max-width: 1000px) {
  .ac-table { table-layout: fixed; font-size: 13px; }
  .ac-table th {
    font-size: 11px;
    padding: 12px 9px 10px;
    letter-spacing: 0.04em;
  }
  .ac-table td { padding: 12px 9px; }
  .ac-desc { font-size: 12px; }
  .ac-col-actions .btn { margin: 2px; padding: 5px 8px; font-size: 11px; }
}

@media (max-width: 700px) {
  .ac-header h1 { font-size: 25px; }
  .ac-header > .btn { padding: 8px 12px; font-size: 13px; }
  .ac-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .ac-table,
  .ac-table tbody { display: block; width: 100%; }
  .ac-table thead { display: none; }
  .ac-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .ac-table td {
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
  .ac-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .ac-table td:nth-child(1)::before { content: 'Name'; }
  .ac-table td:nth-child(2)::before { content: 'Specialty'; }
  .ac-table td:nth-child(3) {
    grid-column: 1 / -1;
  }
  .ac-table td:nth-child(3)::before { content: 'Description'; }
  .ac-table td:nth-child(4) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .ac-table td:nth-child(4)::before { content: ''; display: none; }
  .ac-name { font-size: 12px; }
  .ac-desc {
    max-width: none;
    font-size: 12px;
    -webkit-line-clamp: 3;
  }
  .ac-specialty { padding: 3px 8px; font-size: 10px; }
  .ac-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }
}

@media (max-width: 380px) {
  .ac-table tr { grid-template-columns: minmax(0, 1fr); }
  .ac-table td:nth-child(3),
  .ac-table td:nth-child(4) { grid-column: auto; }
}
`;

// ---------- Page ----------
export default function AdminConditions() {
  const [conditions, setConditions] = useState([]);
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
      const [c, s] = await Promise.all([api.getConditions(), api.getSpecialties()]);
      setConditions(c.conditions || []);
      setSpecialties(s.specialties || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load conditions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(c) {
    if (!confirm(`Delete "${c.name}"? Its articles will also be removed and any triage rule pointing at it will be cleaned up.`)) return;
    setBusyId(c.id);
    try {
      await api.deleteCondition(c.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete condition.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ac-page">
      <style>{CSS}</style>

      <header className="ac-header">
        <div>
          <h1>Conditions</h1>
          <p className="ac-sub">{conditions.length} record{conditions.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add condition
        </button>
      </header>

      {loading && <div className="ac-state">Loading…</div>}
      {error && <div className="ac-state">{error}</div>}
      {!loading && !error && conditions.length === 0 && (
        <div className="ac-state">No conditions yet.</div>
      )}

      {!loading && !error && conditions.length > 0 && (
        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Name</th>
                <th style={{ width: '18%' }}>Specialty</th>
                <th>Description</th>
                <th className="ac-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p className="ac-name">{c.name}</p>
                  </td>
                  <td>
                    {c.specialty?.name ? (
                      <span className="ac-specialty">{c.specialty.name}</span>
                    ) : (
                      <span className="ac-specialty ac-specialty-none">—</span>
                    )}
                  </td>
                  <td>
                    <p className="ac-desc">{c.description || '—'}</p>
                  </td>
                  <td className="ac-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(c)}>Edit</button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === c.id}
                      onClick={() => handleDelete(c)}
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
        <ConditionModal
          specialties={specialties}
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <ConditionModal
          existing={editing}
          specialties={specialties}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Create / Edit modal ----------
function ConditionModal({ existing, specialties, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    causes: existing?.causes ?? '',
    whenToSeekCare: existing?.whenToSeekCare ?? '',
    specialtyId: existing?.specialty?.id ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        causes: form.causes.trim() || null,
        whenToSeekCare: form.whenToSeekCare.trim() || null,
        specialtyId: form.specialtyId === '' ? null : Number(form.specialtyId),
      };
      if (isEdit) await api.updateCondition(existing.id, payload);
      else await api.createCondition(payload);
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save condition.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit condition' : 'New condition'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Migraine"
              required
            />
          </div>

          <div className="form-group">
            <label>Specialty</label>
            <select
              value={form.specialtyId}
              onChange={(e) => update('specialtyId', e.target.value)}
            >
              <option value="">— none —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Short description shown to the patient"
            />
          </div>

          <div className="form-group">
            <label>Causes</label>
            <textarea
              rows="2"
              value={form.causes}
              onChange={(e) => update('causes', e.target.value)}
              placeholder="Common causes or triggers"
            />
          </div>

          <div className="form-group">
            <label>When to seek care</label>
            <textarea
              rows="2"
              value={form.whenToSeekCare}
              onChange={(e) => update('whenToSeekCare', e.target.value)}
              placeholder="Warning signs and when to see a doctor"
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