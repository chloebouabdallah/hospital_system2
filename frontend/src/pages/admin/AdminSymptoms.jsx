import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

const CSS = `
.sym-page { display: flex; flex-direction: column; gap: 22px; }

.sym-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.sym-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.sym-sub { color: var(--mut); font-size: 14px; margin: 0; }

.sym-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.sym-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.sym-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.sym-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.sym-table tr:last-child td { border-bottom: none; }

.sym-name { font-weight: 600; margin: 0; }

.sym-questions-link {
  color: var(--p);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.sym-questions-link:hover { text-decoration: underline; }

.sym-count {
  display: inline-block;
  min-width: 22px;
  text-align: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-weight: 700;
  font-size: 12px;
}

.sym-col-actions { text-align: right; white-space: nowrap; }
.sym-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.sym-state {
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
  max-width: 480px;
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
.form-group input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
`;

export default function AdminSymptoms() {
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSymptoms();
      setSymptoms(res.symptoms || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load symptoms.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(s) {
    if (!confirm(`Delete "${s.name}"? This also deletes its questions, options and any linked conditions/triage rules.`)) return;
    setBusyId(s.id);
    try {
      await api.deleteSymptom(s.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete symptom.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sym-page">
      <style>{CSS}</style>

      <header className="sym-header">
        <div>
          <h1>Symptoms</h1>
          <p className="sym-sub">{symptoms.length} record{symptoms.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add symptom
        </button>
      </header>

      {loading && <div className="sym-state">Loading…</div>}
      {error && <div className="sym-state">{error}</div>}
      {!loading && !error && symptoms.length === 0 && (
        <div className="sym-state">No symptoms yet.</div>
      )}

      {!loading && !error && symptoms.length > 0 && (
        <div className="sym-table-wrap">
          <table className="sym-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Name</th>
                <th>Questions</th>
                <th>Rules</th>
                <th className="sym-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {symptoms.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="sym-name">{s.name}</p>
                  </td>
                  <td>
                    <Link
                      to={`/dashboard/questions?symptomId=${s.id}`}
                      className="sym-questions-link"
                    >
                      {s.questionCount ?? 0} question{(s.questionCount ?? 0) === 1 ? '' : 's'} →
                    </Link>
                  </td>
                  <td>
                    <span className="sym-count">{s.ruleCount ?? 0}</span>
                  </td>
                  <td className="sym-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(s)}>Edit</button>
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
        <SymptomModal
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <SymptomModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function SymptomModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
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
      const payload = { name: name.trim() };
      if (isEdit) await api.updateSymptom(existing.id, payload);
      else await api.createSymptom(payload);
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save symptom.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit symptom' : 'New symptom'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Headache"
              required
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