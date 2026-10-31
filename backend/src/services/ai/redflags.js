

const URGENCY_RANK = { low: 1, moderate: 2, urgent: 3 };

const CHEST_PAIN = /chest (pain|pressure|tightness|discomfort)|pain in (my |the )?chest|tight(ness)? in (my |the )?chest|ألم (في )?الصدر|وجع (في )?الصدر/i;
const BREATHLESS =
  /short(ness)? of breath|can'?t (catch my )?breath|cannot breathe|can'?t breathe|difficulty breathing|trouble breathing|hard to breathe|struggling to breathe|breathless|gasping|ضيق (في )?التنفس|صعوبة (في )?التنفس/i;

const RED_FLAG_RULES = [
  {
    id: 'chest_pain_with_breathlessness',
    reason: 'Chest pain together with shortness of breath',
    specialty: 'Cardiologist',
    all: [CHEST_PAIN, BREATHLESS],
  },
  {
    id: 'chest_pain_radiating',
    reason: 'Chest pain spreading to the arm, jaw or neck',
    specialty: 'Cardiologist',
    all: [CHEST_PAIN, /\b(left )?arm\b|\bjaw\b|\bneck\b|\bback\b|\bsweat/i],
  },
  {
    id: 'severe_breathing_difficulty',
    reason: 'Severe difficulty breathing',
    specialty: 'Pulmonologist',
    all: [/can'?t (catch my )?breath|cannot breathe|can'?t breathe|struggling to breathe|gasping|blue lips|bluish (lips|skin)|ضيق شديد في التنفس/i],
  },
  {
    id: 'vomiting_blood',
    reason: 'Vomiting or coughing up blood',
    specialty: 'Gastroenterologist',
    all: [/vomit(ing)? (of )?blood|blood in (my |the )?vomit|throwing up blood|coughing (up )?blood|cough(ing)? up blood|bloody vomit|تقيؤ دم/i],
  },
  {
    id: 'black_or_bloody_stool',
    reason: 'Black, tarry or bloody stool',
    specialty: 'Gastroenterologist',
    all: [/black (tarry )?stool|tarry stool|blood in (my |the )?(stool|poop|bowel)|bloody (stool|diarrh)|rectal bleeding/i],
  },
  {
    id: 'stroke_signs',
    reason: 'Possible stroke signs (face, arm or speech)',
    specialty: 'Neurologist',
    all: [
      /face (is )?droop|drooping (face|of (the )?face)|slurred speech|trouble speaking|can'?t speak|sudden (weakness|numbness)|weakness (on|in) one side|one side of (my |the )?(body|face)|sudden (loss of vision|vision loss)|can'?t move (my )?(arm|leg)/i,
    ],
  },
  {
    id: 'altered_consciousness',
    reason: 'Confusion, fainting, seizure or loss of consciousness',
    specialty: 'Neurologist',
    all: [/confus(ed|ion)|disorient|unresponsive|passed out|pass(ing)? out|fainted|faint(ing)?\b|lost consciousness|loss of consciousness|blacked out|seizure|convulsion|فقدان الوعي|إغماء|تشنج/i],
  },
  {
    id: 'thunderclap_headache',
    reason: 'Sudden, worst-ever headache',
    specialty: 'Neurologist',
    all: [/worst headache|thunderclap|sudden (severe |intense )?headache|headache (came|started) (suddenly|out of nowhere)/i],
  },
  {
    id: 'meningitis_signs',
    reason: 'Fever with stiff neck',
    specialty: 'Neurologist',
    all: [/stiff neck|neck stiffness|can'?t (bend|touch) (my )?(neck|chin)/i, /fever|high temperature|temperature/i],
  },
  {
    id: 'anaphylaxis',
    reason: 'Signs of a severe allergic reaction',
    specialty: null,
    all: [/throat (is )?(swelling|closing|tight)|swollen (tongue|lips|throat)|swelling of (the )?(tongue|lips|throat|face)|anaphyla|difficulty swallowing/i],
  },
  {
    id: 'severe_bleeding',
    reason: 'Heavy bleeding that will not stop',
    specialty: null,
    all: [/heavy bleeding|severe bleeding|(won'?t|will not|doesn'?t|does not|can'?t) stop bleeding|bleeding (a lot|heavily)|soaking through/i],
  },
  {
    id: 'self_harm',
    reason: 'Thoughts of suicide or self-harm',
    specialty: null,
    all: [/suicid|kill myself|end (it all|my life)|want to die|hurt myself|self[- ]?harm|أريد أن أموت|انتحار/i],
  },
];

const EMERGENCY_MESSAGE =
  'Some of your answers describe warning signs that can be serious. Please seek urgent medical care now: ' +
  'go to the nearest emergency department or call your local emergency number. ' +
  'Do not wait for an appointment, and do not drive yourself if you feel unwell.';

const SELF_HARM_MESSAGE =
  'You mentioned thoughts of harming yourself. You deserve support right now. Please contact your local emergency ' +
  'number or a crisis line, or go to the nearest emergency department. If you can, tell someone you trust that you ' +
  'need company right now.';

const YES_LIKE = /^(yes|yeah|yep|sometimes|a little|a lot|definitely|i do|i have|نعم)\b/i;
const NO_LIKE = /^(no|nope|none|never|not really|nothing|neither|none of (these|the above)|i don'?t|i do not|لا)\b/i;

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function affirmedMatch(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  const re = new RegExp(pattern.source, flags);
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '') { re.lastIndex++; continue; }
    const before = text.slice(0, m.index);
    const clause = before.split(/[.,;:!?\n|]|\band\b|\bbut\b|\bor\b|\bhowever\b|\bwith\b/i).pop().trim();
    const negated = /^(no|not|without|never|denies|denied|none|free of|don'?t have|do not have|didn'?t have|hasn'?t|haven'?t|لا|بدون)\b(\s+\S+){0,3}$/i.test(clause);
    if (!negated) return true;
  }
  return false;
}


function affirmedStatements(symptom, answers = []) {
  const out = [];
  if (clean(symptom)) out.push(clean(symptom));

  for (const a of answers) {
    const q = clean(a?.question);
    for (const v of a?.values || []) {
      const text = clean(v?.text ?? v?.value);
      if (!text) continue;
      if (NO_LIKE.test(text)) continue;
      if (YES_LIKE.test(text) && text.length <= 20) {
        if (q) out.push(q.replace(/\?+$/, ''));
        continue;
      }
      out.push(text);
    }
  }
  return out;
}

function evaluateRedFlags(symptom, answers = []) {
  const text = affirmedStatements(symptom, answers).join(' | ');
  const matches = [];
  for (const rule of RED_FLAG_RULES) {
    if (rule.all.every((p) => affirmedMatch(text, p))) {
      matches.push({ id: rule.id, reason: rule.reason, specialty: rule.specialty });
    }
  }
  return { urgent: matches.length > 0, matches };
}

function mostUrgent(...levels) {
  let best = null;
  for (const l of levels) {
    if (URGENCY_RANK[l] && (!best || URGENCY_RANK[l] > URGENCY_RANK[best])) best = l;
  }
  return best;
}

module.exports = {
  RED_FLAG_RULES,
  EMERGENCY_MESSAGE,
  SELF_HARM_MESSAGE,
  URGENCY_RANK,
  affirmedStatements,
  evaluateRedFlags,
  mostUrgent,
};
