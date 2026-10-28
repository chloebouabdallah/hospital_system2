import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const URGENCY_COLORS = {
  low: { bg: '#dcfce7', fg: '#166534' },
  moderate: { bg: '#fef3c7', fg: '#92400e' },
  urgent: { bg: '#fee2e2', fg: '#991b1b' },
};

// ---------- Inline styles ----------
const CSS = `
.atr-page { display: flex; flex-direction: column; gap: 22px; }

.atr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.atr-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.atr-sub { color: var(--mut); font-size: 14px; margin: 0; }

.atr-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.atr-toolbar label {
  font-size: 13px;
  font-weight: 600;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.atr-toolbar select {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
  min-width: 200px;
}

.atr-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}
.atr-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.atr-table th {
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mut);
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}
.atr-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: top;
}
.atr-table tr:last-child td { border-bottom: none; }

.atr-symptom { font-weight: 600; margin: 0; }
.atr-json {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--ink);
  background: var(--soft);
  padding: 6px 10px;
  border-radius: 8px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.atr-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.atr-matches {
  font-size: 13px;
  color: var(--mut);
  margin: 0;
}

.atr-col-actions { text-align: right; white-space: nowrap; }
.atr-col-actions .btn { margin-left: 6px; }
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }

.atr-state {
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
  max-width: 600px;
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
.form-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
}
.form-group select:focus,
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.form-hint {
  font-size: 12px;
  color: var(--mut);
  margin: 4px 0 0;
  line-height: 1.5;
}
.form-hint code {
  background: var(--soft);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}

/* Matched conditions checkboxes */
.cond-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--soft);
}
.cond-check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  padding: 4px 2px;
}
.cond-check input[type='checkbox'] {
  width: 16px; height: 16px;
  accent-color: var(--v);
  cursor: pointer;
  flex-shrink: 0;
}

@media (max-width: 1000px) {
  .atr-table { table-layout: fixed; font-size: 13px; }
  .atr-table th {
    font-size: 10px;
    padding: 12px 8px 10px;
    letter-spacing: 0.03em;
  }
  .atr-table td { padding: 12px 8px; }
  .atr-json { font-size: 11px; padding: 5px 7px; }
  .atr-matches { font-size: 12px; }
  .atr-col-actions .btn { margin: 2px; padding: 5px 7px; font-size: 11px; }
}

@media (max-width: 700px) {
  .atr-page { gap: 18px; }
  .atr-header h1 { font-size: 25px; }
  .atr-header > .btn { padding: 8px 12px; font-size: 13px; }
  .atr-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 7px;
  }
  .atr-toolbar label { font-size: 11px; }
  .atr-toolbar select { width: 100%; min-width: 0; font-size: 16px; }

  .atr-table-wrap {
    background: transparent;
    border: 0;
    border-radius: 0;
    overflow: visible;
  }
  .atr-table,
  .atr-table tbody { display: block; width: 100%; }
  .atr-table thead { display: none; }
  .atr-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
    margin-bottom: 12px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
  }
  .atr-table td {
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
  .atr-table td::before {
    margin-bottom: 3px;
    color: var(--mut);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .atr-table td:nth-child(1)::before { content: 'Symptom'; }
  .atr-table td:nth-child(2) {
    grid-column: 1 / -1;
  }
  .atr-table td:nth-child(2)::before { content: 'Conditions'; }
  .atr-table td:nth-child(3)::before { content: 'Urgency'; }
  .atr-table td:nth-child(4)::before { content: 'Specialty'; }
  .atr-table td:nth-child(5) {
    grid-column: 1 / -1;
  }
  .atr-table td:nth-child(5)::before { content: 'Matches'; }
  .atr-table td:nth-child(6) {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 4px;
    border-bottom: 0;
  }
  .atr-table td:nth-child(6)::before { content: ''; display: none; }
  .atr-symptom { font-size: 12px; }
  .atr-json {
    display: block;
    width: 100%;
    max-width: 100%;
    padding: 7px 9px;
    white-space: normal;
    overflow-wrap: anywhere;
    text-overflow: clip;
    line-height: 1.45;
  }
  .atr-badge { padding: 3px 8px; font-size: 10px; }
  .atr-matches { font-size: 12px; }
  .atr-col-actions .btn { margin: 0; padding: 5px 9px; font-size: 11px; }

  .atr-page .modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }
  .atr-page .modal {
    width: 100%;
    max-width: none;
    max-height: 92vh;
    max-height: 92dvh;
    border-radius: 18px 18px 0 0;
  }
  .atr-page .modal-head { padding: 16px 18px; }
  .atr-page .modal-head h2 { font-size: 17px; }
  .atr-page .modal-body { padding: 18px 18px max(18px, env(safe-area-inset-bottom)); }
  .atr-page .modal-body .form-group textarea { font-size: 16px; }
  .atr-page .modal-actions { position: sticky; bottom: 0; background: var(--card); padding-top: 8px; }
}

@media (max-width: 380px) {
  .atr-table tr { grid-template-columns: minmax(0, 1fr); }
  .atr-table td:nth-child(2),
  .atr-table td:nth-child(5),
  .atr-table td:nth-child(6) { grid-column: auto; }
}
`;

// ---------- Page ----------
export default function AdminTriageRules() {
  const [rules, setRules] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [filterSymptom, setFilterSymptom] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const q = filterSymptom ? `?symptomId=${filterSymptom}` : '';
      const [r, s, sp, c] = await Promise.all([
        api.getTriageRules(q),
        api.getSymptoms(),
        api.getSpecialties(),
        api.getConditions(),
      ]);
      setRules(r.rules || []);
      setSymptoms(s.symptoms || []);
      setSpecialties(sp.specialties || []);
      setConditions(c.conditions || []);
    } catch (err) {
      setError(err.data?.error || 'Could not load triage rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterSymptom]);

  async function handleDelete(rule) {
    if (!confirm('Delete this triage rule?')) return;
    setBusyId(rule.id);
    try {
      await api.deleteTriageRule(rule.id);
      await load();
    } catch (err) {
      alert(err.data?.error || 'Could not delete rule.');
    } finally {
      setBusyId(null);
    }
  }

  const symptomName = (id) => symptoms.find((s) => s.id === id)?.name ?? `#${id}`;
  const specialtyName = (id) => specialties.find((s) => s.id === id)?.name ?? (id ? `#${id}` : '—');
  const conditionNames = (ids) => {
    if (!ids || ids.length === 0) return '—';
    return ids.map((id) => conditions.find((c) => c.id === id)?.name ?? `#${id}`).join(', ');
  };

  return (
    <div className="atr-page">
      <style>{CSS}</style>

      <header className="atr-header">
        <div>
          <h1>Triage rules</h1>
          <p className="atr-sub">{rules.length} record{rules.length === 1 ? '' : 's'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add rule
        </button>
      </header>

      <div className="atr-toolbar">
        <label>Filter by symptom</label>
        <select value={filterSymptom} onChange={(e) => setFilterSymptom(e.target.value)}>
          <option value="">All symptoms</option>
          {symptoms.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="atr-state">Loading…</div>}
      {error && <div className="atr-state">{error}</div>}
      {!loading && !error && rules.length === 0 && (
        <div className="atr-state">No triage rules yet.</div>
      )}

      {!loading && !error && rules.length > 0 && (
        <div className="atr-table-wrap">
          <table className="atr-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Symptom</th>
                <th style={{ width: '26%' }}>Conditions (JSON)</th>
                <th style={{ width: '10%' }}>Urgency</th>
                <th style={{ width: '16%' }}>Specialty</th>
                <th>Matches</th>
                <th className="atr-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="atr-symptom">{symptomName(r.symptomId)}</p>
                  </td>
                  <td>
                    <p className="atr-json" title={JSON.stringify(r.ruleConditions)}>
                      {JSON.stringify(r.ruleConditions)}
                    </p>
                  </td>
                  <td>
                    <span
                      className="atr-badge"
                      style={{
                        background: URGENCY_COLORS[r.urgencyLevel]?.bg,
                        color: URGENCY_COLORS[r.urgencyLevel]?.fg,
                      }}
                    >
                      {r.urgencyLevel}
                    </span>
                  </td>
                  <td>{specialtyName(r.recommendedSpecialtyId)}</td>
                  <td>
                    <p className="atr-matches">{conditionNames(r.matchedConditionIds)}</p>
                  </td>
                  <td className="atr-col-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(r)}>Edit</button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === r.id}
                      onClick={() => handleDelete(r)}
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
        <TriageRuleModal
          symptoms={symptoms}
          specialties={specialties}
          conditions={conditions}
          onClose={() => setShowNew(false)}
          onSaved={async () => { setShowNew(false); await load(); }}
        />
      )}

      {editing && (
        <TriageRuleModal
          existing={editing}
          symptoms={symptoms}
          specialties={specialties}
          conditions={conditions}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

// ---------- Create / Edit modal ----------
function TriageRuleModal({ existing, symptoms, specialties, conditions, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    symptomId: existing?.symptomId ?? '',
    ruleConditionsText: existing
      ? JSON.stringify(existing.ruleConditions, null, 2)
      : '{\n  "severity": "severe"\n}',
    urgencyLevel: existing?.urgencyLevel ?? 'moderate',
    recommendedSpecialtyId: existing?.recommendedSpecialtyId ?? '',
    matchedConditionIds: existing?.matchedConditionIds ?? [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleCondition(id) {
    setForm((f) => ({
      ...f,
      matchedConditionIds: f.matchedConditionIds.includes(id)
        ? f.matchedConditionIds.filter((x) => x !== id)
        : [...f.matchedConditionIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isEdit && !form.symptomId) {
      setError('Please pick a symptom.');
      return;
    }

    // Parse rule_conditions JSON
    let ruleConditions;
    try {
      ruleConditions = JSON.parse(form.ruleConditionsText);
    } catch (err) {
      setError('Rule conditions must be valid JSON.');
      return;
    }
    if (typeof ruleConditions !== 'object' || ruleConditions === null || Array.isArray(ruleConditions)) {
      setError('Rule conditions must be a JSON object (use {} for a catch-all).');
      return;
    }

    const payload = {
      ruleConditions,
      urgencyLevel: form.urgencyLevel,
      recommendedSpecialtyId:
        form.recommendedSpecialtyId === '' ? null : Number(form.recommendedSpecialtyId),
      matchedConditionIds: form.matchedConditionIds,
    };

    if (!isEdit) payload.symptomId = Number(form.symptomId);

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateTriageRule(existing.id, payload);
      } else {
        await api.createTriageRule(payload);
      }
      onSaved();
    } catch (err) {
      const details = err.data?.details ? ' ' + err.data.details.join(' ') : '';
      setError((err.data?.error || 'Could not save rule.') + details);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit triage rule' : 'New triage rule'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Symptom</label>
            <select
              value={form.symptomId}
              onChange={(e) => update('symptomId', e.target.value)}
              disabled={isEdit}
              required
            >
              <option value="">Select a symptom…</option>
              {symptoms.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {isEdit && (
              <p className="form-hint">
                Symptom is fixed after creation. Delete and recreate to move a rule.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Rule conditions (JSON)</label>
            <textarea
              rows="5"
              value={form.ruleConditionsText}
              onChange={(e) => update('ruleConditionsText', e.target.value)}
              placeholder='{"severity": "severe", "flags": ["blurred_vision"]}'
              spellCheck={false}
            />
            <p className="form-hint">
              The engine matches strictly against these keys. Use <code>{'{}'}</code> for a
              catch-all rule. Supported keys: <code>severity</code>, <code>duration</code>,
              <code>temperature</code>, <code>location</code>, <code>timing</code>,
              <code>type</code>, <code>flags</code>.
            </p>
          </div>

          <div className="form-group">
            <label>Urgency</label>
            <select
              value={form.urgencyLevel}
              onChange={(e) => update('urgencyLevel', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label>Recommended specialty</label>
            <select
              value={form.recommendedSpecialtyId}
              onChange={(e) => update('recommendedSpecialtyId', e.target.value)}
            >
              <option value="">— none —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Matched conditions</label>
            <div className="cond-checks">
              {conditions.length === 0 ? (
                <p className="form-hint">No conditions yet.</p>
              ) : (
                conditions.map((c) => (
                  <label key={c.id} className="cond-check">
                    <input
                      type="checkbox"
                      checked={form.matchedConditionIds.includes(c.id)}
                      onChange={() => toggleCondition(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="form-hint">
              A rule must set a specialty, at least one condition, or both — otherwise it has
              nothing to recommend.
            </p>
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