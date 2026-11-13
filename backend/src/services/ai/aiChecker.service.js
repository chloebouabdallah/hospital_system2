const cfg = require('../../config/ai');
const { DISCLAIMER, AI_DISCLAIMER } = require('../../config/disclaimer');
const { FALLBACK_URGENCY, FALLBACK_SPECIALTY_NAME, FALLBACK_MESSAGE } = require('../../config/fallback');
const {
  evaluateRedFlags, mostUrgent, EMERGENCY_MESSAGE, SELF_HARM_MESSAGE,
} = require('./redflags');
const { stepPrompt, assessPrompt } = require('./prompts');
const { validateStepOutput, validateAssessment } = require('./validate');
const llm = require('./llm');
const cache = require('./cache');

// How the hybrid checker decides urgency and warning signs:
//   1. The AI decides. Urgency and red flags come from its assessment, based on the conditions
//      it lists and the patient's actual answers. The keyword screen (redflags.js) only passes
//      "hints" for the AI to confirm or dismiss; it no longer ends the check early.
//   2. AI unavailable -> the closest admin-APPROVED saved response for the same symptom.
//      Because nothing re-checked these exact answers, the keyword screen can raise urgency.
//   3. Nothing approved either -> keyword screen + cautious GP fallback (moderate, or urgent on a hit).
//   Exception: thoughts of self-harm always show the crisis message straight away.

const STATIC_QUESTIONS = [
  {
    text: 'How long have you had this?',
    type: 'single',
    options: ['Less than a day', '1 to 3 days', '4 to 7 days', 'More than a week'],
  },
  { text: 'How severe is it?', type: 'single', options: ['Mild', 'Moderate', 'Severe'] },
  {
    text: 'Are any of these also happening?',
    type: 'multi',
    options: ['Fever', 'Nausea or vomiting', 'Dizziness', 'Unusual tiredness', 'None of these'],
  },
];

const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const normQ = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function staticQuestion(answers = []) {
  const asked = new Set(answers.map((a) => normQ(a.question)));
  const q = STATIC_QUESTIONS.find((sq) => !asked.has(normQ(sq.text)));
  if (!q) return null;
  return { text: q.text, type: q.type, options: q.options.map((t) => ({ text: t, value: slugOf(t) })) };
}

function defaultDeps() {
  const prisma = require('../../lib/prisma');
  const { loadBookingPolicy } = require('../response.service');
  return {
    llm,
    cache,
    db: {
      loadSpecialties: () => prisma.specialty.findMany({ select: { id: true, name: true, description: true } }),
      loadBookingPolicy,
      async loadConditionsByNames(names) {
        const rows = await prisma.condition.findMany({
          where: { OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' } })) },
          select: {
            id: true, name: true, description: true, causes: true, whenToSeekCare: true,
            medicalArticles: { select: { id: true, title: true, content: true, source: true }, orderBy: { id: 'asc' } },
          },
        });
        return new Map(rows.map((r) => [r.name.toLowerCase(), r]));
      },
    },
  };
}

const alreadyAsked = (step, answers) =>
  step?.action === 'ask' && answers.some((a) => normQ(a.question) === normQ(step.question.text));

async function nextQuestion(input, deps, hints = []) {
  const { symptom, answers } = input;
  const key = deps.cache.makeKey('question', symptom, answers);

  let step = null;

  const cached = await deps.cache.get(key);
  if (cached) step = validateStepOutput(cached);

  if (!step) {
    try {
      const raw = await deps.llm.complete(stepPrompt(symptom, answers, hints));
      step = validateStepOutput(llm.extractJson(raw));
      if (step) await deps.cache.set(key, 'question', symptom, step, answers);
    } catch (err) {
      console.error('AI step failed:', err.message);
    }
  }

  // AI unavailable or unusable: try an admin-approved question for the same symptom and step.
  if (!step && deps.cache.findApproved) {
    const approved = validateStepOutput(await deps.cache.findApproved('question', symptom, answers));
    if (approved && !alreadyAsked(approved, answers)) step = approved;
  }

  if (alreadyAsked(step, answers)) step = null;

  // Possible warning signs and no AI to ask about them: go straight to the result.
  if (!step && hints.length > 0) return { action: 'finish', ai: false };

  // Finishing early is only allowed when the keyword screen saw a possible warning sign.
  if (!step || (step.action === 'finish' && answers.length < cfg.MIN_QUESTIONS && hints.length === 0)) {
    const q = answers.length < STATIC_QUESTIONS.length ? staticQuestion(answers) : null;
    return q ? { action: 'ask', question: q, ai: false } : { action: 'finish', ai: false };
  }

  return { ...step, ai: true };
}

function toCachePayload(a) {
  return {
    urgency: a.urgency,
    specialty: a.specialty,
    advice: a.advice,
    red_flags: a.redFlags.map((f) => ({
      flag: f.flag, condition: f.condition, based_on: f.basedOn, action: f.action,
    })),
    red_flag_detected: a.redFlag,
    confidence: a.confidence,
    reasoning: a.reasoning,
    conditions: a.conditions.map((c) => ({
      name: c.name, why_it_fits: c.whyItFits, description: c.description, causes: c.causes,
      when_to_seek_care: c.whenToSeekCare, likelihood: c.likelihood,
    })),
  };
}

// Returns { assessment, source } where source is 'ai' (made for these exact answers, fresh or
// cached), 'approved' (an admin-approved result for similar answers) or 'fallback' (none).
async function assess(input, deps, specialties, hints = []) {
  const { symptom, answers } = input;
  const key = deps.cache.makeKey('assessment', symptom, answers);

  const cached = await deps.cache.get(key);
  if (cached) {
    const a = validateAssessment(cached);
    if (a) return { assessment: a, source: 'ai' };
  }

  try {
    let a = null;
    for (let attempt = 1; attempt <= 2 && !a; attempt++) {
      const raw = await deps.llm.complete(assessPrompt(symptom, answers, specialties.map((s) => s.name), hints));
      a = validateAssessment(llm.extractJson(raw));
      if (!a) {
        const r = String(raw);
        console.error(`AI assessment unusable (attempt ${attempt}, ${r.length} chars). Start: ${r.slice(0, 150)} ... End: ${r.slice(-150)}`);
      }
    }
    if (a) {
      await deps.cache.set(key, 'assessment', symptom, toCachePayload(a), answers);
      return { assessment: a, source: 'ai' };
    }
  } catch (err) {
    console.error('AI assessment failed:', err.message);
  }

  if (deps.cache.findApproved) {
    const approved = validateAssessment(await deps.cache.findApproved('assessment', symptom, answers));
    if (approved) return { assessment: approved, source: 'approved' };
  }
  return { assessment: null, source: 'fallback' };
}

function matchSpecialty(name, specialties) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return (
    specialties.find((s) => s.name.toLowerCase() === n) ||
    specialties.find((s) => n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n)) ||
    null
  );
}

async function buildResult({ flags, assessment, source = assessment ? 'ai' : 'fallback', specialties, deps }) {
  const aiDown = !assessment;
  const checkedByAi = source === 'ai'; // the AI looked at exactly these answers
  const selfHarm = flags.matches.some((m) => m.id === 'self_harm');
  // Keyword hits only count when the AI did not check these exact answers itself.
  const keywordFloor = !checkedByAi && flags.matches.some((m) => m.id !== 'self_harm');

  const aiFlags = assessment?.redFlags || [];
  const aiEmergency =
    aiFlags.some((f) => f.action === 'emergency') || (assessment?.redFlag === true && aiFlags.length === 0);

  const urgencyLevel = mostUrgent(
    assessment?.urgency,
    aiEmergency ? 'urgent' : null,
    aiFlags.length > 0 ? 'moderate' : null,               // any warning sign rules out "low"
    assessment?.confidence === 'low' ? 'moderate' : null, // an unsure AI can never say "low"
    keywordFloor ? 'urgent' : null,
    selfHarm ? 'urgent' : null,
    aiDown ? FALLBACK_URGENCY : null
  );

  const gp = specialties.find((s) => s.name === FALLBACK_SPECIALTY_NAME) || null;
  const flagHint = flags.matches.map((m) => m.specialty).find(Boolean);
  const specialty =
    matchSpecialty(assessment?.specialty, specialties) ||
    (keywordFloor ? matchSpecialty(flagHint, specialties) : null) ||
    gp;

  let conditions = [];
  if (assessment) {
    let known = new Map();
    try {
      known = await deps.db.loadConditionsByNames(assessment.conditions.map((c) => c.name));
    } catch (err) {
      console.error('condition lookup failed:', err.message);
    }
    conditions = assessment.conditions.map((c, i) => {
      const db = known.get(c.name.toLowerCase());
      return {
        id: db?.id ?? `ai-${i}`,
        name: db?.name ?? c.name,
        description: db?.description || c.description,
        causes: db?.causes || c.causes,
        whenToSeekCare: db?.whenToSeekCare || c.whenToSeekCare,
        likelihood: c.likelihood,
        whyItFits: c.whyItFits,
        curated: !!db,
        articles: db?.medicalArticles ?? [],
      };
    });
  }

  // Warning signs shown to the patient: { reason, condition, basedOn, action, source }.
  const redFlags = aiFlags.map((f) => ({
    reason: f.flag, condition: f.condition || null, basedOn: f.basedOn || null, action: f.action, source: 'ai',
  }));
  for (const m of flags.matches) {
    if (m.id === 'self_harm' || keywordFloor) {
      redFlags.push({ reason: m.reason, condition: null, basedOn: null, action: 'emergency', source: 'screen' });
    }
  }

  let message;
  if (selfHarm) message = SELF_HARM_MESSAGE;
  else if (urgencyLevel === 'urgent' && (aiEmergency || keywordFloor)) message = EMERGENCY_MESSAGE;
  else if (aiDown) message = FALLBACK_MESSAGE;
  else message = assessment.advice || null;

  const triaged = !!assessment || keywordFloor || selfHarm;
  const booking = await deps.db.loadBookingPolicy(triaged ? urgencyLevel : 'no_triage');

  return {
    matched: !!assessment,
    source,
    urgencyLevel,
    recommendedSpecialty: specialty ? { id: specialty.id, name: specialty.name, description: specialty.description } : null,
    conditions,
    message,
    reasoning: assessment?.reasoning || null,
    redFlags,
    incomplete: false,
    aiGenerated: !!assessment,
    aiDisclaimer: assessment ? AI_DISCLAIMER : null,
    disclaimer: DISCLAIMER,
    booking,
  };
}

async function runStep(input, deps = defaultDeps()) {
  const { symptom, answers } = input;

  // Keyword screen: hints for the AI, plus the always-on self-harm check.
  const flags = evaluateRedFlags(symptom, answers);
  const specialties = await deps.db.loadSpecialties();

  if (flags.matches.some((m) => m.id === 'self_harm')) {
    return { type: 'result', result: await buildResult({ flags, assessment: null, specialties, deps }) };
  }

  const hints = flags.matches.map((m) => m.reason);

  if (answers.length < cfg.MAX_QUESTIONS) {
    const step = await nextQuestion(input, deps, hints);
    if (step.action === 'ask') {
      return {
        type: 'question',
        question: { id: `q${answers.length + 1}`, ...step.question },
        progress: { answered: answers.length, max: cfg.MAX_QUESTIONS },
        ai: step.ai,
      };
    }
  }

  const { assessment, source } = await assess(input, deps, specialties, hints);
  return { type: 'result', result: await buildResult({ flags, assessment, source, specialties, deps }) };
}

module.exports = { runStep, buildResult, matchSpecialty, staticQuestion };