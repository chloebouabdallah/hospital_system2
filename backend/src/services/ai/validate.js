const cfg = require('../../config/ai');



const URGENCIES = ['low', 'moderate', 'urgent'];

function cleanText(v, max) {
  return String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '') 
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const slug = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'option';


function validateStepInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const symptom = cleanText(body.symptom, cfg.MAX_SYMPTOM_CHARS);
  if (symptom.length < 2) return { ok: false, error: 'Please describe your symptom (at least 2 characters).' };

  const raw = body.answers ?? [];
  if (!Array.isArray(raw)) return { ok: false, error: 'answers must be an array.' };
  if (raw.length > cfg.MAX_QUESTIONS + 1) return { ok: false, error: 'Too many answers.' };

  const answers = [];
  for (const [i, a] of raw.entries()) {
    if (!a || typeof a !== 'object') return { ok: false, error: `answers[${i}] must be an object.` };
    const question = cleanText(a.question, cfg.MAX_QUESTION_CHARS);
    const type = a.type === 'multi' ? 'multi' : 'single';
    if (!question) return { ok: false, error: `answers[${i}].question is required.` };
    if (!Array.isArray(a.values) || a.values.length === 0 || a.values.length > cfg.MAX_OPTIONS) {
      return { ok: false, error: `answers[${i}].values must be a non-empty array.` };
    }
    const values = a.values
      .map((v) => ({ text: cleanText(v?.text ?? v?.value, cfg.MAX_OPTION_CHARS), value: cleanText(v?.value ?? v?.text, 100) }))
      .filter((v) => v.text);
    if (values.length === 0) return { ok: false, error: `answers[${i}].values must contain text.` };
    if (type === 'single' && values.length !== 1) {
      return { ok: false, error: `answers[${i}] is single-choice and needs exactly 1 value.` };
    }
    answers.push({ question, type, values });
  }
  return { ok: true, input: { symptom, answers } };
}

function validateStepOutput(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.action === 'finish') return { action: 'finish' };
  if (obj.action !== 'ask' || !obj.question || typeof obj.question !== 'object') return null;

  const text = cleanText(obj.question.text, cfg.MAX_QUESTION_CHARS);
  const type = obj.question.type === 'multi' ? 'multi' : 'single';
  if (text.length < 5 || !Array.isArray(obj.question.options)) return null;

  const seen = new Set();
  const options = [];
  for (const o of obj.question.options) {
    const t = cleanText(typeof o === 'string' ? o : o?.text, cfg.MAX_OPTION_CHARS);
    if (!t) continue;
    let value = slug(typeof o === 'object' && o?.value ? o.value : t);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, text: t });
    if (options.length === cfg.MAX_OPTIONS) break;
  }
  if (options.length < 2) return null;
  return { action: 'ask', question: { text, type, options } };
}

// ---- model output: assessment ----
function validateAssessment(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const urgency = URGENCIES.includes(obj.urgency) ? obj.urgency : null;
  if (!urgency) return null;

  const conditions = (Array.isArray(obj.conditions) ? obj.conditions : [])
    .slice(0, 4)
    .map((c) => ({
      name: cleanText(c?.name, 150),
      whyItFits: cleanText(c?.why_it_fits ?? c?.whyItFits, 300),
      description: cleanText(c?.description, 500),
      causes: cleanText(c?.causes, 400),
      whenToSeekCare: cleanText(c?.when_to_seek_care ?? c?.whenToSeekCare, 400),
      likelihood: ['most likely', 'more likely', 'possible', 'less likely'].includes(c?.likelihood) ? c.likelihood : 'possible',
    }))
    .filter((c) => c.name);
  if (conditions.length === 0) return null;

  // AI-identified warning signs, each tied to a condition and to the answer it is based on.
  // A missing/unknown "action" is treated as an emergency (the cautious reading).
  const redFlags = (Array.isArray(obj.red_flags) ? obj.red_flags : [])
    .slice(0, 6)
    .map((f) => ({
      flag: cleanText(typeof f === 'string' ? f : f?.flag, 200),
      condition: cleanText(f?.condition, 150),
      basedOn: cleanText(f?.based_on ?? f?.basedOn, 300),
      action: f?.action === 'urgent_visit' ? 'urgent_visit' : 'emergency',
    }))
    .filter((f) => f.flag);

  return {
    urgency,
    specialty: cleanText(obj.specialty, 100),
    conditions,
    redFlags,
    reasoning: cleanText(obj.reasoning, 500),
    advice: cleanText(obj.advice, 600),
    // Older cached entries only carry the boolean; newer ones carry the list.
    redFlag: redFlags.length > 0 || obj.red_flag_detected === true,
    confidence: ['low', 'medium', 'high'].includes(obj.confidence) ? obj.confidence : 'low',
  };
}

module.exports = { cleanText, slug, validateStepInput, validateStepOutput, validateAssessment, URGENCIES };