import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

// ---------- Inline styles ----------
const CSS = `
.aq-page { display: flex; flex-direction: column; gap: 22px; }

.aq-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.aq-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* Symptom selector bar */
.aq-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.aq-toolbar label {
  font-size: 13px;
  font-weight: 600;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.aq-toolbar select {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
  min-width: 220px;
}
.aq-toolbar select:focus { border-color: var(--p); box-shadow: 0 0 0 3px #008cfd22; }

/* Two-panel layout */
.aq-split {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 18px;
  align-items: start;
}
@media (max-width: 960px) {
  .aq-split { grid-template-columns: 1fr; }
}

.aq-panel {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}
.aq-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.aq-panel-head h2 {
  font-family: var(--font-head);
  font-size: 15px;
  margin: 0;
}
.aq-panel-body { padding: 6px 0; }

/* Question row */
.aq-row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.15s;
}
.aq-row:last-child { border-bottom: none; }
.aq-row:hover { background: var(--soft); }
.aq-row.is-active {
  background: linear-gradient(90deg, #7b5cf010, transparent);
  border-left: 3px solid var(--v);
  padding-left: 17px;
}
.aq-row-num {
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 13px;
  color: var(--mut);
  text-align: center;
}
.aq-row.is-active .aq-row-num { color: var(--v); }

.aq-q-text { font-weight: 600; margin: 0 0 2px; font-size: 14px; }
.aq-q-meta { font-size: 12px; color: var(--mut); margin: 0; }

.aq-row-actions { display: flex; gap: 6px; }
.aq-row-actions .btn { padding: 4px 10px; font-size: 12px; }

/* Question type badge */
.aq-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.aq-type-single { background: #dbeafe; color: #1d4ed8; }
.aq-type-multi  { background: #ede9fe; color: #6d28d9; }

/* Options list */
.aq-opt {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
}
.aq-opt:last-child { border-bottom: none; }

.aq-opt-text { font-weight: 500; font-size: 14px; margin: 0; }
.aq-opt-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--mut);
  margin: 2px 0 0;
}
.aq-opt-actions { display: flex; gap: 6px; }
.aq-opt-actions .btn { padding: 4px 10px; font-size: 12px; }

.aq-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--mut);
  font-size: 14px;
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
.btn-danger { color: #dc2626; border-color: #fecaca; background: #fff; }
.btn-danger:hover { background: #fef2f2; }
`;

// ---------- Page ----------
export default function AdminQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSymptomId = Number(searchParams.get('symptomId')) || null;

  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptomId, setSelectedSymptomId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [options, setOptions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingO, setLoadingO] = useState(false);
  const [error, setError] = useState('');

  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [showOModal, setShowOModal] = useState(false);
  const [editingO, setEditingO] = useState(null);

  // Load symptoms once — prefer ?symptomId=X from the URL if present.
  useEffect(() => {
    api.getSymptoms()
      .then((r) => {
        const list = r.symptoms || [];
        setSymptoms(list);
        if (initialSymptomId && list.some((s) => s.id === initialSymptomId)) {
          setSelectedSymptomId(initialSymptomId);
        } else if (list.length > 0) {
          setSelectedSymptomId(list[0].id);
        }
      })
      .catch((err) => setError(err.data?.error || 'Could not load symptoms.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load questions when symptom changes
  async function loadQuestions() {
    if (!selectedSymptomId) return;
    setLoadingQ(true);
    setError('');
    try {
      const r = await api.getSymptomQuestions(selectedSymptomId);
      const qs = r.questions || [];
      setQuestions(qs);
      setSelectedQuestionId(qs.length > 0 ? qs[0].id : null);
    } catch (err) {
      setError(err.data?.error || 'Could not load questions.');
    } finally {
      setLoadingQ(false);
    }
  }
  useEffect(() => { loadQuestions(); /* eslint-disable-next-line */ }, [selectedSymptomId]);

  // Load options when question changes
  async function loadOptions() {
    if (!selectedQuestionId) { setOptions([]); return; }
    setLoadingO(true);
    try {
      const r = await api.getOptions(`?questionId=${selectedQuestionId}`);
      setOptions(r.options || []);
    } catch (err) {
      setOptions([]);
    } finally {
      setLoadingO(false);
    }
  }
  useEffect(() => { loadOptions(); /* eslint-disable-next-line */ }, [selectedQuestionId]);

  // Change symptom: update state + keep the URL in sync
  function handleSymptomChange(newId) {
    setSelectedSymptomId(newId);
    setSearchParams({ symptomId: newId });
  }

  async function handleDeleteQuestion(q) {
    if (!confirm(`Delete "${q.questionText}"? Its options will also be deleted.`)) return;
    try {
      await api.deleteQuestion(q.id);
      await loadQuestions();
    } catch (err) {
      alert(err.data?.error || 'Could not delete question.');
    }
  }

  async function handleDeleteOption(o) {
    if (!confirm(`Delete option "${o.optionText}"?`)) return;
    try {
      await api.deleteOption(o.id);
      await loadOptions();
    } catch (err) {
      alert(err.data?.error || 'Could not delete option.');
    }
  }

  const selectedSymptom = symptoms.find((s) => s.id === selectedSymptomId);

  return (
    <div className="aq-page">
      <style>{CSS}</style>

      <header className="aq-header">
        <h1>Questions</h1>
        <p className="aq-sub">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          {selectedSymptom ? ` for ${selectedSymptom.name}` : ''}
        </p>
      </header>

      <div className="aq-toolbar">
        <label>Symptom</label>
        <select
          value={selectedSymptomId ?? ''}
          onChange={(e) => handleSymptomChange(Number(e.target.value))}
        >
          {symptoms.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="aq-empty">{error}</div>}

      <div className="aq-split">
        {/* LEFT: Questions */}
        <div className="aq-panel">
          <div className="aq-panel-head">
            <h2>Questions</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowQModal(true)}
              disabled={!selectedSymptomId}
            >
              + Add question
            </button>
          </div>
          <div className="aq-panel-body">
            {loadingQ && <div className="aq-empty">Loading…</div>}
            {!loadingQ && questions.length === 0 && (
              <div className="aq-empty">No questions yet for this symptom.</div>
            )}
            {!loadingQ && questions.map((q, idx) => (
              <div
                key={q.id}
                className={`aq-row${q.id === selectedQuestionId ? ' is-active' : ''}`}
                onClick={() => setSelectedQuestionId(q.id)}
              >
                <span className="aq-row-num">{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <p className="aq-q-text">{q.questionText}</p>
                  <p className="aq-q-meta">
                    <span className={`aq-type aq-type-${q.questionType}`}>{q.questionType}</span>
                  </p>
                </div>
                <div className="aq-row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn" onClick={() => setEditingQ(q)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDeleteQuestion(q)}>Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Options */}
        <div className="aq-panel">
          <div className="aq-panel-head">
            <h2>Options</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowOModal(true)}
              disabled={!selectedQuestionId}
            >
              + Add option
            </button>
          </div>
          <div className="aq-panel-body">
            {!selectedQuestionId && (
              <div className="aq-empty">Select a question to edit its options.</div>
            )}
            {loadingO && <div className="aq-empty">Loading…</div>}
            {!loadingO && selectedQuestionId && options.length === 0 && (
              <div className="aq-empty">No options yet.</div>
            )}
            {!loadingO && options.map((o) => (
              <div key={o.id} className="aq-opt">
                <div>
                  <p className="aq-opt-text">{o.optionText}</p>
                  <p className="aq-opt-value">value: {o.optionValue}</p>
                </div>
                <div className="aq-opt-actions">
                  <button className="btn" onClick={() => setEditingO(o)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDeleteOption(o)}>Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showQModal && (
        <QuestionModal
          symptomId={selectedSymptomId}
          onClose={() => setShowQModal(false)}
          onSaved={async () => { setShowQModal(false); await loadQuestions(); }}
        />
      )}

      {editingQ && (
        <QuestionModal
          existing={editingQ}
          onClose={() => setEditingQ(null)}
          onSaved={async () => { setEditingQ(null); await loadQuestions(); }}
        />
      )}

      {showOModal && selectedQuestionId && (
        <OptionModal
          questionId={selectedQuestionId}
          onClose={() => setShowOModal(false)}
          onSaved={async () => { setShowOModal(false); await loadOptions(); }}
        />
      )}

      {editingO && (
        <OptionModal
          existing={editingO}
          questionId={selectedQuestionId}
          onClose={() => setEditingO(null)}
          onSaved={async () => { setEditingO(null); await loadOptions(); }}
        />
      )}
    </div>
  );
}

// ---------- Question create/edit ----------
function QuestionModal({ existing, symptomId, onClose, onSaved }) {
  const isEdit = !!existing;
  const [text, setText] = useState(existing?.questionText ?? '');
  const [type, setType] = useState(existing?.questionType ?? 'single');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!text.trim()) {
      setError('Question text is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateQuestion(existing.id, { questionText: text.trim(), questionType: type });
      } else {
        await api.createQuestion({
          symptomId,
          questionText: text.trim(),
          questionType: type,
        });
      }
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save question.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit question' : 'New question'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Question text</label>
            <textarea
              rows="2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. How severe is it?"
              required
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="single">Single choice (patient picks one)</option>
              <option value="multi">Multiple choice (patient picks several)</option>
            </select>
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

// ---------- Option create/edit ----------
function OptionModal({ existing, questionId, onClose, onSaved }) {
  const isEdit = !!existing;
  const [text, setText] = useState(existing?.optionText ?? '');
  const [value, setValue] = useState(existing?.optionValue ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!text.trim()) {
      setError('Option text is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { optionText: text.trim() };
      if (value.trim()) payload.optionValue = value.trim();

      if (isEdit) {
        await api.updateOption(existing.id, payload);
      } else {
        await api.createOption({ questionId, ...payload });
      }
      onSaved();
    } catch (err) {
      setError(err.data?.error || 'Could not save option.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{isEdit ? 'Edit option' : 'New option'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Option text</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Severe"
              required
            />
          </div>
          <div className="form-group">
            <label>Option value (optional)</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. severe"
            />
            <p style={{ fontSize: 12, color: 'var(--mut)', margin: '4px 0 0' }}>
              Used internally by the triage engine. If left blank, it's generated automatically
              from the text (e.g. "Severe" → <code>severe</code>).
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