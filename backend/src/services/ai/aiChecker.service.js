const cfg = require('../../config/ai');
const { DISCLAIMER } = require('../../config/disclaimer');
const { FALLBACK_URGENCY, FALLBACK_SPECIALTY_NAME, FALLBACK_MESSAGE } = require('../../config/fallback');
const {
  evaluateRedFlags, mostUrgent, EMERGENCY_MESSAGE, SELF_HARM_MESSAGE,
} = require('./redflags');
const { stepPrompt, assessPrompt } = require('./prompts');
const { validateStepOutput, validateAssessment } = require('./validate');
const llm = require('./llm');
const cache = require('./cache');


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

function staticQuestion(answers = []) {
  const asked = new Set(answers.map((a) => normQ(a.question)));
  const q = STATIC_QUESTIONS.find((sq) => !asked.has(normQ(sq.text)));
  if (!q) return null;
  return { text: q.text, type: q.type, options: q.options.map((t) => ({ text: t, value: slugOf(t) })) };
}

const normQ = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

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

async function nextQuestion(input, deps) {
  const { symptom, answers } = input;
  const key = deps.cache.makeKey('question', symptom, answers);

  let step = null;
  let fromAi = false;

  const cached = await deps.cache.get(key);
  if (cached) {
    step = validateStepOutput(cached);
    fromAi = !!step;
  }

  if (!step) {
    try {
      const raw = await deps.llm.complete(stepPrompt(symptom, answers));
      step = validateStepOutput(llm.extractJson(raw));
      if (step) {
        fromAi = true;
        await deps.cache.set(key, 'question', symptom, step);
      }
    } catch (err) {
      console.error('AI step failed, using static question:', err.message);
    }
  }

  if (step?.action === 'ask') {
    const asked = new Set(answers.map((a) => normQ(a.question)));
    if (asked.has(normQ(step.question.text))) step = null;
  }

  if (!step || (step.action === 'finish' && answers.length < cfg.MIN_QUESTIONS)) {
    const q = answers.length < STATIC_QUESTIONS.length ? staticQuestion(answers) : null;
    return q ? { action: 'ask', question: q, ai: false } : { action: 'finish', ai: false };
  }

  return { ...step, ai: fromAi };
}

async function assess(input, deps, specialties) {
  const { symptom, answers } = input;
  const key = deps.cache.makeKey('assessment', symptom, answers);

  const cached = await deps.cache.get(key);
  if (cached) {
    const a = validateAssessment(cached);
    if (a) return a;
  }

  try {
    let a = null;
    for (let attempt = 1; attempt <= 2 && !a; attempt++) {
      const raw = await deps.llm.complete(assessPrompt(symptom, answers, specialties.map((s) => s.name)));
      a = validateAssessment(llm.extractJson(raw));
      if (!a) {
        const r = String(raw);
        console.error(`AI assessment unusable (attempt ${attempt}, ${r.length} chars). Start: ${r.slice(0, 150)} ... End: ${r.slice(-150)}`);
      }
    }
    if (a) {
      await deps.cache.set(key, 'assessment', symptom, {
        urgency: a.urgency,
        specialty: a.specialty,
        advice: a.advice,
        red_flag_detected: a.redFlag,
        confidence: a.confidence,
        reasoning: a.reasoning,
        conditions: a.conditions.map((c) => ({
          name: c.name, why_it_fits: c.whyItFits, description: c.description, causes: c.causes,
          when_to_seek_care: c.whenToSeekCare, likelihood: c.likelihood,
        })),
      });
    }
    return a;
  } catch (err) {
    console.error('AI assessment failed, using fallback:', err.message);
    return null;
  }
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

async function buildResult({ flags, assessment, specialties, deps }) {
  const redFlagUrgent = flags.urgent;
  const aiDown = !assessment;

  const urgencyLevel = mostUrgent(
    redFlagUrgent ? 'urgent' : null,
    assessment?.urgency,
    assessment?.redFlag ? 'urgent' : null,
    assessment?.confidence === 'low' ? 'moderate' : null, // unsure AI can never say "low"
    aiDown ? FALLBACK_URGENCY : null
  );

  const gp = specialties.find((s) => s.name === FALLBACK_SPECIALTY_NAME) || null;
  const flagHint = flags.matches.map((m) => m.specialty).find(Boolean);
  const specialty =
    matchSpecialty(assessment?.specialty, specialties) ||
    matchSpecialty(flagHint, specialties) ||
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

  let message = null;
  if (flags.matches.some((m) => m.id === 'self_harm')) message = SELF_HARM_MESSAGE;
  else if (urgencyLevel === 'urgent' && (redFlagUrgent || assessment?.redFlag)) message = EMERGENCY_MESSAGE;
  else if (aiDown) message = FALLBACK_MESSAGE;
  else message = assessment.advice || null;

  const booking = await deps.db.loadBookingPolicy(redFlagUrgent || assessment ? urgencyLevel : 'no_triage');

  return {
    matched: !!assessment,
    source: assessment ? 'ai' : 'fallback',
    urgencyLevel,
    recommendedSpecialty: specialty ? { id: specialty.id, name: specialty.name, description: specialty.description } : null,
    conditions,
    message,
    reasoning: assessment?.reasoning || null,
    redFlags: flags.matches.map((m) => m.reason),
    incomplete: false,
    disclaimer: DISCLAIMER,
    booking,
  };
}

async function runStep(input, deps = defaultDeps()) {
  const { symptom, answers } = input;

  // 1. Safety rules first. A hit ends the flow immediately with an urgent result (no AI call).
  const flags = evaluateRedFlags(symptom, answers);
  const specialties = await deps.db.loadSpecialties();

  if (flags.urgent) {
    return { type: 'result', result: await buildResult({ flags, assessment: null, specialties, deps }) };
  }

  if (answers.length < cfg.MAX_QUESTIONS) {
    const step = await nextQuestion(input, deps);
    if (step.action === 'ask') {
      return {
        type: 'question',
        question: { id: `q${answers.length + 1}`, ...step.question },
        progress: { answered: answers.length, max: cfg.MAX_QUESTIONS },
        ai: step.ai,
      };
    }
  }

  // 3. Enough information: assess, then let the rules + AI combine into the final urgency.
  const assessment = await assess(input, deps, specialties);
  return { type: 'result', result: await buildResult({ flags, assessment, specialties, deps }) };
}

module.exports = { runStep, buildResult, matchSpecialty, staticQuestion };
