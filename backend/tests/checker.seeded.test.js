// Integration tests for the symptom checker against your SEEDED database.
// They call the real service layer (validate -> engine -> response builder) with real DB data.
//
// Before running: make sure the DB was seeded with seed.js (fresh seed, no extra triage rules).
// Run with:  npm test      (runs `node --test`)
//
// Tests that need extra rules create them temporarily and delete them straight afterwards.
// If a run is killed half-way, check Prisma Studio for stray triage rules.

require('dotenv').config();
const { describe, test, after } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const { validateAndNormalize } = require('../src/services/checker.service');
const { runTriage } = require('../src/services/triage.service');
const { buildTriageResponse } = require('../src/services/response.service');

after(async () => {
  await prisma.$disconnect();
});

// ---------- helpers ----------

async function getByName(model, name) {
  const row = await prisma[model].findUnique({ where: { name } });
  assert.ok(row, `Seed data missing: ${model} "${name}". Run the seed first.`);
  return row;
}

// Builds a request body by matching questions on a fragment of their text,
// so tests read like the questionnaire: [['how severe', ['severe']], ...]
async function buildBody(symptomName, picks) {
  const symptom = await getByName('symptom', symptomName);
  const questions = await prisma.symptomQuestion.findMany({ where: { symptomId: symptom.id } });
  return {
    symptom_id: symptom.id,
    answers: picks.map(([fragment, values]) => {
      const q = questions.find((x) => x.questionText.toLowerCase().includes(fragment.toLowerCase()));
      assert.ok(q, `No question containing "${fragment}" for symptom "${symptomName}"`);
      return { question_id: q.id, values };
    }),
  };
}

// Full pipeline, exactly as the controller runs it.
async function run(symptomName, picks) {
  const body = await buildBody(symptomName, picks);
  const validated = await validateAndNormalize(body);
  assert.ok(validated.ok, `Validation failed: ${JSON.stringify(validated)}`);
  const triage = await runTriage(validated.normalized);
  const result = await buildTriageResponse(triage, validated.normalized);
  return { body, normalized: validated.normalized, triage, result };
}

// Creates temporary triage rules for one test, always cleans them up.
async function withRules(rules, fn) {
  const ids = [];
  try {
    for (const data of rules) ids.push((await prisma.triageRule.create({ data })).id);
    return await fn(ids);
  } finally {
    if (ids.length) await prisma.triageRule.deleteMany({ where: { id: { in: ids } } });
  }
}

const names = (conditions) => conditions.map((c) => c.name);

// ---------- 1. Happy path: each seeded symptom category ----------

describe('seeded symptom categories', () => {
  test('Headache: severe + blurred vision -> Migraine / urgent / Neurologist', async () => {
    const { result } = await run('Headache', [
      ['how severe', ['severe']],
      ['also have', ['blurred_vision']],
    ]);
    assert.equal(result.matched, true);
    assert.equal(result.urgencyLevel, 'urgent');
    assert.equal(result.recommendedSpecialty.name, 'Neurologist');
    assert.deepEqual(names(result.conditions), ['Migraine']);
    assert.ok(Array.isArray(result.conditions[0].articles));
    assert.equal(result.message, null);
    assert.ok(result.disclaimer.length > 0);
  });

  test('Headache: mild + less than a day -> Tension Headache / low / General Practitioner', async () => {
    const { result } = await run('Headache', [
      ['how severe', ['mild']],
      ['how long', ['less_than_a_day']],
    ]);
    assert.equal(result.matched, true);
    assert.equal(result.urgencyLevel, 'low');
    assert.equal(result.recommendedSpecialty.name, 'General Practitioner');
    assert.deepEqual(names(result.conditions), ['Tension Headache']);
  });

  test('Chest Pain: shortness of breath + sweating -> Angina / urgent / Cardiologist', async () => {
    const { result } = await run('Chest Pain', [['also have', ['shortness_of_breath', 'sweating']]]);
    assert.equal(result.matched, true);
    assert.equal(result.urgencyLevel, 'urgent');
    assert.equal(result.recommendedSpecialty.name, 'Cardiologist');
    assert.deepEqual(names(result.conditions), ['Angina']);
  });

  test('Stomach Pain: moderate -> Gastritis / moderate / Gastroenterologist', async () => {
    const { result } = await run('Stomach Pain', [['how severe', ['moderate']]]);
    assert.equal(result.matched, true);
    assert.equal(result.urgencyLevel, 'moderate');
    assert.equal(result.recommendedSpecialty.name, 'Gastroenterologist');
    assert.deepEqual(names(result.conditions), ['Gastritis']);
  });
});

// ---------- 2. No rule matches -> fallback, never an error or an empty result ----------

describe('fallback when no rule matches', () => {
  function assertFallback(result) {
    assert.equal(result.matched, false);
    assert.equal(result.urgencyLevel, 'moderate'); // cautious, never "low"
    assert.equal(result.recommendedSpecialty?.name, 'General Practitioner');
    assert.deepEqual(result.conditions, []);
    assert.equal(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
    assert.ok(result.disclaimer.length > 0);
  }

  test('Cough has no seeded rules at all', async () => {
    const { result, triage } = await run('Cough', [
      ['what type', ['dry']],
      ['how long', ['more_than_2_weeks']],
    ]);
    assert.equal(triage.evaluatedRules, 0);
    assertFallback(result);
  });

  test('Fever has no seeded rules at all', async () => {
    const { result } = await run('Fever', [['temperature', ['>39c']]]);
    assertFallback(result);
  });

  test('Headache answers that fit none of its rules (moderate, 1-3 days)', async () => {
    const { result, triage } = await run('Headache', [
      ['how severe', ['moderate']],
      ['how long', ['1-3_days']],
    ]);
    assert.ok(triage.evaluatedRules > 0);
    assert.equal(triage.matches.length, 0);
    assertFallback(result);
  });

  test('a catch-all rule ({}) for the symptom replaces the generic fallback', async () => {
    const cough = await getByName('symptom', 'Cough');
    const gp = await getByName('specialty', 'General Practitioner');

    await withRules(
      [{ symptomId: cough.id, ruleConditions: {}, matchedConditionIds: [], recommendedSpecialtyId: gp.id, urgencyLevel: 'low' }],
      async () => {
        const { result } = await run('Cough', [['what type', ['dry']]]);
        assert.equal(result.matched, true);
        assert.equal(result.urgencyLevel, 'low');
      }
    );
  });
});

// ---------- 3. Partial answers ----------

describe('partial answers', () => {
  test('severe headache but flags question skipped -> fallback, flagged incomplete', async () => {
    const { result, normalized } = await run('Headache', [['how severe', ['severe']]]);
    assert.ok(normalized.unansweredQuestionIds.length > 0);
    assert.equal(result.matched, false);
    assert.equal(result.incomplete, true);
    assert.equal(result.urgencyLevel, 'moderate');
  });

  test('a fully matching partial submission still matches (only needed questions answered)', async () => {
    const { result } = await run('Stomach Pain', [['how severe', ['moderate']]]);
    assert.equal(result.matched, true);
    assert.equal(result.incomplete, true); // other questions were skipped
  });
});

// ---------- 4. Multiple rules, different urgency: highest urgency always wins ----------

describe('multiple matching rules', () => {
  test('urgent rule wins over a moderate rule that also matches; both conditions are returned', async () => {
    const headache = await getByName('symptom', 'Headache');
    const gp = await getByName('specialty', 'General Practitioner');
    const tension = await getByName('condition', 'Tension Headache');

    await withRules(
      [{ symptomId: headache.id, ruleConditions: { flags: ['nausea'] }, matchedConditionIds: [tension.id], recommendedSpecialtyId: gp.id, urgencyLevel: 'moderate' }],
      async () => {
        const { triage, result } = await run('Headache', [
          ['how severe', ['severe']],
          ['also have', ['blurred_vision', 'nausea']],
        ]);
        assert.equal(triage.matches.length, 2);
        assert.equal(result.urgencyLevel, 'urgent');
        assert.equal(result.recommendedSpecialty.name, 'Neurologist'); // from the winning rule
        assert.deepEqual(names(result.conditions), ['Migraine', 'Tension Headache']); // best rule first
      }
    );
  });

  test('a more specific LOW rule cannot outrank an URGENT rule', async () => {
    const headache = await getByName('symptom', 'Headache');
    const gp = await getByName('specialty', 'General Practitioner');
    const tension = await getByName('condition', 'Tension Headache');

    await withRules(
      [{ symptomId: headache.id, ruleConditions: { severity: 'severe', flags: ['blurred_vision', 'nausea'] }, matchedConditionIds: [tension.id], recommendedSpecialtyId: gp.id, urgencyLevel: 'low' }],
      async () => {
        const { triage, result } = await run('Headache', [
          ['how severe', ['severe']],
          ['also have', ['blurred_vision', 'nausea']],
        ]);
        assert.equal(triage.matches.length, 2);
        assert.ok(triage.matches[1].specificity > triage.matches[0].specificity); // low rule is more specific...
        assert.equal(result.urgencyLevel, 'urgent'); // ...and still loses
      }
    );
  });
});

// ---------- 5. Malformed submissions are rejected with clear errors ----------

describe('malformed submissions', () => {
  async function validBody() {
    return buildBody('Headache', [['how severe', ['severe']]]);
  }

  async function expectRejected(body, expectedStatus = 400) {
    const res = await validateAndNormalize(body);
    assert.equal(res.ok, false);
    assert.equal(res.status, expectedStatus);
    assert.equal(typeof res.error, 'string');
    return res;
  }

  test('body is not an object', async () => {
    await expectRejected(null);
    await expectRejected(undefined);
    await expectRejected([]);
    await expectRejected('hello');
  });

  test('missing or invalid symptom_id', async () => {
    const body = await validBody();
    await expectRejected({ answers: body.answers });
    await expectRejected({ ...body, symptom_id: 'abc' });
    await expectRejected({ ...body, symptom_id: 1.5 });
    await expectRejected({ ...body, symptom_id: null });
  });

  test('symptom_id that does not exist', async () => {
    const body = await validBody();
    await expectRejected({ ...body, symptom_id: 999999 });
  });

  test('answers missing, empty, or not an array', async () => {
    const body = await validBody();
    await expectRejected({ symptom_id: body.symptom_id });
    await expectRejected({ ...body, answers: [] });
    await expectRejected({ ...body, answers: 'severe' });
    await expectRejected({ ...body, answers: { question_id: 1 } });
  });

  test('an answer that is not an object, or lacks a question_id', async () => {
    const body = await validBody();
    const res = await expectRejected({ ...body, answers: ['severe', { values: ['x'] }] });
    assert.equal(res.details.length, 2);
  });

  test('option value that does not belong to the question reports it in details', async () => {
    const body = await validBody();
    body.answers[0].values = ['banana'];
    const res = await expectRejected(body);
    assert.ok(res.details[0].includes('banana'));
  });

  test('values empty, or containing non-strings', async () => {
    const body = await validBody();
    await expectRejected({ ...body, answers: [{ question_id: body.answers[0].question_id, values: [] }] });
    await expectRejected({ ...body, answers: [{ question_id: body.answers[0].question_id, values: [5] }] });
  });

  test('single-choice question given two values', async () => {
    const body = await buildBody('Headache', [['how severe', ['mild', 'severe']]]);
    await expectRejected(body);
  });

  test('the same question answered twice', async () => {
    const body = await validBody();
    await expectRejected({ ...body, answers: [body.answers[0], body.answers[0]] });
  });

  test('a question that belongs to a different symptom', async () => {
    const body = await validBody();
    const fever = await buildBody('Fever', [['temperature', ['>39c']]]);
    await expectRejected({ symptom_id: body.symptom_id, answers: fever.answers });
  });

  test('too many answers', async () => {
    const body = await validBody();
    await expectRejected({ ...body, answers: Array(51).fill(body.answers[0]) });
  });

  test('several problems are all reported at once', async () => {
    const body = await validBody();
    const res = await expectRejected({
      ...body,
      answers: [{ question_id: body.answers[0].question_id, values: ['banana'] }, { question_id: 999999, values: ['x'] }],
    });
    assert.equal(res.details.length, 2);
  });

  test('lenient inputs are accepted and normalized (numeric string ids, "value" shorthand, duplicates, whitespace)', async () => {
    const body = await validBody();
    const res = await validateAndNormalize({
      symptomId: String(body.symptom_id),
      answers: [{ questionId: String(body.answers[0].question_id), value: ' severe ' }],
    });
    assert.equal(res.ok, true);
    assert.equal(res.normalized.answers[0].values[0].optionValue, 'severe');

    const dup = await buildBody('Headache', [['also have', ['nausea', 'nausea', 'fever']]]);
    const res2 = await validateAndNormalize(dup);
    assert.equal(res2.ok, true);
    assert.equal(res2.normalized.answers[0].values.length, 2);
  });
});