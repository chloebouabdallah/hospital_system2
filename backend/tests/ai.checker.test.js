const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const cfg = require('../src/config/ai');
const { runStep } = require('../src/services/ai/aiChecker.service');
const { validateStepInput, validateStepOutput, validateAssessment } = require('../src/services/ai/validate');
const { extractJson } = require('../src/services/ai/llm');

const SPECIALTIES = [
  { id: 1, name: 'General Practitioner', description: 'gp' },
  { id: 2, name: 'Neurologist', description: 'neuro' },
  { id: 3, name: 'Cardiologist', description: 'cardio' },
];

function makeDeps({ llmReplies = [], llmThrows = false, conditions = new Map() } = {}) {
  const calls = [];
  const store = new Map();
  return {
    calls,
    llm: {
      complete: async (p) => {
        calls.push(p);
        if (llmThrows) throw new Error('down');
        const next = llmReplies.shift();
        if (next === undefined) throw new Error('no more replies');
        return typeof next === 'string' ? next : JSON.stringify(next);
      },
    },
    cache: {
      makeKey: (kind, s, a) => `${kind}|${s}|${a.map((x) => x.question + x.values.map((v) => v.value)).join(',')}`,
      get: async (k) => store.get(k) ?? null,
      set: async (k, _kind, _s, payload) => { store.set(k, payload); },
    },
    db: {
      loadSpecialties: async () => SPECIALTIES,
      loadBookingPolicy: async (level) => ({ urgencyLevel: level }),
      loadConditionsByNames: async () => conditions,
    },
  };
}

const ask = (text = 'How would you describe the pain?') => ({
  action: 'ask',
  question: { text, type: 'single', options: [{ text: 'Dull' }, { text: 'Sharp' }, { text: 'Throbbing' }] },
});
const ASSESSMENT = (over = {}) => ({
  urgency: 'low',
  specialty: 'Neurologist',
  conditions: [{ name: 'Tension headache', description: 'd', causes: 'c', when_to_seek_care: 'w', likelihood: 'more likely' }],
  advice: 'Rest and hydrate.',
  red_flag_detected: false,
  confidence: 'high',
  ...over,
});
const a = (question, text) => ({ question, type: 'single', values: [{ text, value: text }] });
const full = Array.from({ length: cfg.MIN_QUESTIONS }, (_, i) => a(`Q${i + 1}?`, 'x'));

describe('runStep: safety first', () => {
  test('red flag in free text returns URGENT immediately and never calls the AI', async () => {
    const deps = makeDeps();
    const out = await runStep({ symptom: 'chest pain and shortness of breath', answers: [] }, deps);
    assert.equal(out.type, 'result');
    assert.equal(out.result.urgencyLevel, 'urgent');
    assert.equal(deps.calls.length, 0);
    assert.equal(out.result.recommendedSpecialty.name, 'Cardiologist');
    assert.ok(out.result.redFlags.length > 0);
    assert.ok(out.result.disclaimer);
  });

  test('red flag appearing in a later answer stops the flow', async () => {
    const deps = makeDeps();
    const out = await runStep({ symptom: 'headache', answers: [a('Any of these?', 'Confusion')] }, deps);
    assert.equal(out.result.urgencyLevel, 'urgent');
    assert.equal(deps.calls.length, 0);
  });

  test('AI saying "low" can NOT lower a rule-based urgent verdict (rules win)', async () => {
    // assessment path with a red flag in the answers: rules already short-circuit, but also
    // verify the combine step directly.
    const { buildResult } = require('../src/services/ai/aiChecker.service');
    const { evaluateRedFlags } = require('../src/services/ai/redflags');
    const flags = evaluateRedFlags('fever and stiff neck');
    const assessment = validateAssessment(ASSESSMENT({ urgency: 'low' }));
    const r = await buildResult({ flags, assessment, specialties: SPECIALTIES, deps: makeDeps() });
    assert.equal(r.urgencyLevel, 'urgent');
  });

  test('AI can RAISE urgency above what the rules found', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT({ urgency: 'urgent', red_flag_detected: true })] });
    const out = await runStep({ symptom: 'strange pain', answers: full }, deps);
    assert.equal(out.result.urgencyLevel, 'urgent');
  });

  test('low-confidence AI can never produce "low": floored to moderate', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT({ urgency: 'low', confidence: 'low' })] });
    const out = await runStep({ symptom: 'mild headache', answers: full }, deps);
    assert.equal(out.result.urgencyLevel, 'moderate');
  });

  test('confident low stays low', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT()] });
    const out = await runStep({ symptom: 'mild headache', answers: full }, deps);
    assert.equal(out.result.urgencyLevel, 'low');
    assert.equal(out.result.source, 'ai');
    assert.equal(out.result.recommendedSpecialty.name, 'Neurologist');
  });
});

describe('runStep: adaptive questioning', () => {
  test('returns the AI question with normalised options', async () => {
    const deps = makeDeps({ llmReplies: [ask()] });
    const out = await runStep({ symptom: 'headache', answers: [] }, deps);
    assert.equal(out.type, 'question');
    assert.equal(out.question.options.length, 3);
    assert.ok(out.question.options.every((o) => o.value && o.text));
    assert.equal(out.ai, true);
  });

  test('a second identical request is served from cache (no 2nd LLM call)', async () => {
    const deps = makeDeps({ llmReplies: [ask()] });
    await runStep({ symptom: 'headache', answers: [] }, deps);
    await runStep({ symptom: 'headache', answers: [] }, deps);
    assert.equal(deps.calls.length, 1);
  });

  test('asking at the question cap goes straight to the assessment', async () => {
    const answers = Array.from({ length: cfg.MAX_QUESTIONS }, (_, i) => a(`Q${i}?`, 'x'));
    const deps = makeDeps({ llmReplies: [ASSESSMENT()] });
    const out = await runStep({ symptom: 'headache', answers }, deps);
    assert.equal(out.type, 'result');
  });

  test('AI repeating an already-asked question is replaced by a static one', async () => {
    const deps = makeDeps({ llmReplies: [ask('How long have you had this?')] });
    const out = await runStep({ symptom: 'headache', answers: [a('How long have you had this?', '1 to 3 days')] }, deps);
    assert.equal(out.type, 'question');
    assert.notEqual(out.question.text, 'How long have you had this?');
    assert.equal(out.ai, false);
  });

  test('AI finishing before the minimum question count is overridden while static questions remain', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }] });
    const out = await runStep({ symptom: 'headache', answers: [a('Q1?', 'x'), a('Q2?', 'y')] }, deps);
    assert.equal(out.type, 'question');
  });

  test('the step prompt forbids finishing before the minimum', async () => {
    const deps = makeDeps({ llmReplies: [ask()] });
    await runStep({ symptom: 'headache', answers: [] }, deps);
    assert.match(deps.calls[0].user, /MUST ask another question/);
  });

  test('result exposes reasoning and why-it-fits for the top condition', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT({ reasoning: 'Because of X.', conditions: [{ name: 'Migraine', why_it_fits: 'Throbbing and light sensitivity.', description: 'd', causes: 'c', when_to_seek_care: 'w', likelihood: 'most likely' }] })] });
    const out = await runStep({ symptom: 'x', answers: full }, deps);
    assert.equal(out.result.reasoning, 'Because of X.');
    assert.equal(out.result.conditions[0].whyItFits, 'Throbbing and light sensitivity.');
    assert.equal(out.result.conditions[0].likelihood, 'most likely');
  });

  test('AI trying to finish with 0 answers is overridden with a question', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }] });
    const out = await runStep({ symptom: 'headache', answers: [] }, deps);
    assert.equal(out.type, 'question');
  });
});

describe('runStep: AI failure -> safe fallback', () => {
  test('AI down: static questions, then moderate GP fallback', async () => {
    const deps = makeDeps({ llmThrows: true });
    const first = await runStep({ symptom: 'headache', answers: [] }, deps);
    assert.equal(first.type, 'question');
    assert.equal(first.ai, false);

    const done = await runStep({ symptom: 'headache', answers: full }, deps);
    assert.equal(done.type, 'result');
    assert.equal(done.result.matched, false);
    assert.equal(done.result.source, 'fallback');
    assert.equal(done.result.urgencyLevel, 'moderate');
    assert.equal(done.result.recommendedSpecialty.name, 'General Practitioner');
    assert.ok(done.result.message);
  });

  test('garbage model output is rejected', async () => {
    const deps = makeDeps({ llmReplies: ['I am sorry, I cannot help', 'not json at all'] });
    const out = await runStep({ symptom: 'headache', answers: full }, deps);
    assert.equal(out.result.source, 'fallback');
  });

  test('unknown specialty from the AI maps to the GP', async () => {
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT({ specialty: 'Astrologer' })] });
    const out = await runStep({ symptom: 'x', answers: full }, deps);
    assert.equal(out.result.recommendedSpecialty.name, 'General Practitioner');
  });

  test('curated DB condition text/articles are preferred over AI text', async () => {
    const conditions = new Map([['tension headache', { id: 9, name: 'Tension headache', description: 'CURATED', causes: null, whenToSeekCare: null, medicalArticles: [{ id: 1, title: 'T', content: 'c', source: 's' }] }]]);
    const deps = makeDeps({ llmReplies: [{ action: 'finish' }, ASSESSMENT()], conditions });
    const out = await runStep({ symptom: 'x', answers: full }, deps);
    const c = out.result.conditions[0];
    assert.equal(c.id, 9);
    assert.equal(c.description, 'CURATED');
    assert.equal(c.causes, 'c'); // gaps filled from the AI
    assert.equal(c.articles.length, 1);
    assert.equal(c.curated, true);
  });
});

describe('validation', () => {
  test('input: needs a symptom, strips markup, enforces single-choice', () => {
    assert.equal(validateStepInput({ symptom: '' }).ok, false);
    const ok = validateStepInput({ symptom: '<b>headache</b>', answers: [] });
    assert.equal(ok.input.symptom, 'bheadache/b');
    const bad = validateStepInput({ symptom: 'x1', answers: [{ question: 'Q?', type: 'single', values: [{ text: 'a' }, { text: 'b' }] }] });
    assert.equal(bad.ok, false);
  });
  test('model step output: rejects <2 options and bad shapes', () => {
    assert.equal(validateStepOutput({ action: 'ask', question: { text: 'Question here?', options: [{ text: 'only' }] } }), null);
    assert.equal(validateStepOutput(null), null);
    assert.equal(validateStepOutput({ action: 'nope' }), null);
  });
  test('model assessment: rejects bad urgency / no conditions', () => {
    assert.equal(validateAssessment({ urgency: 'critical', conditions: [{ name: 'x' }] }), null);
    assert.equal(validateAssessment({ urgency: 'low', conditions: [] }), null);
  });
  test('extractJson tolerates fences', () => {
    assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.equal(extractJson('nothing'), null);
  });
});
