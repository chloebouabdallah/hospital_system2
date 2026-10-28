// Unit tests for the rule-matching engine. Pure functions only: no database needed.
// Run with:  npm test   (which runs `node --test`)

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { deriveFacts, evaluateRule, matchRules } = require('../src/services/triage.service');

// Builds a normalized submission by hand: [[questionText, questionType, [values]], ...]
function sub(answers) {
  return {
    symptomId: 1,
    symptomName: 'Test',
    answers: answers.map(([questionText, questionType, values], i) => ({
      questionId: i + 1,
      questionText,
      questionType,
      values: values.map((v, j) => ({ optionId: j + 1, optionValue: v, optionText: v })),
    })),
    unansweredQuestionIds: [],
  };
}

const rule = (id, ruleConditions, urgencyLevel, extra = {}) => ({
  id,
  ruleConditions,
  urgencyLevel,
  matchedConditionIds: [],
  recommendedSpecialtyId: null,
  ...extra,
});

describe('deriveFacts', () => {
  test('maps severity, duration and multi-choice flags', () => {
    const facts = deriveFacts(
      sub([
        ['How severe is it?', 'single', ['severe']],
        ['How long have you had it?', 'single', ['1-3_days']],
        ['Do you also have any of the following?', 'multi', ['blurred_vision', 'nausea']],
      ])
    );
    assert.deepEqual(facts, {
      severity: 'severe',
      duration: '1-3_days',
      flags: ['blurred_vision', 'nausea'],
    });
  });

  test('maps location, type, timing and temperature questions', () => {
    const facts = deriveFacts(
      sub([
        ['Where is the pain?', 'single', ['one_side']],
        ['What does the pain feel like?', 'single', ['pressure']],
        ['When does it happen?', 'single', ['at_rest']],
        ['What is your temperature range?', 'single', ['>39c']],
      ])
    );
    assert.equal(facts.location, 'one_side');
    assert.equal(facts.type, 'pressure');
    assert.equal(facts.timing, 'at_rest');
    assert.equal(facts.temperature, '>39c');
  });

  test('merges and de-duplicates flags from several multi-choice questions', () => {
    const facts = deriveFacts(
      sub([
        ['Any of these?', 'multi', ['fever', 'cough']],
        ['And these?', 'multi', ['cough', 'chills']],
      ])
    );
    assert.deepEqual(facts.flags, ['fever', 'cough', 'chills']);
  });

  test('ignores single-choice questions it has no key for', () => {
    const facts = deriveFacts(sub([['What is your favourite colour?', 'single', ['blue']]]));
    assert.deepEqual(facts, { flags: [] });
  });

  test('lowercases values', () => {
    const facts = deriveFacts(sub([['How severe is it?', 'single', ['SEVERE']]]));
    assert.equal(facts.severity, 'severe');
  });
});

describe('evaluateRule', () => {
  const facts = { severity: 'severe', duration: '1-3_days', flags: ['blurred_vision', 'nausea'] };

  test('matches only when EVERY condition is satisfied', () => {
    const r = { severity: 'severe', flags: ['blurred_vision'] };
    assert.equal(evaluateRule(r, facts).matches, true);
    assert.equal(evaluateRule(r, { ...facts, severity: 'mild' }).matches, false);
    assert.equal(evaluateRule(r, { ...facts, flags: ['nausea'] }).matches, false);
  });

  test('flags must ALL be present', () => {
    assert.equal(evaluateRule({ flags: ['nausea', 'blurred_vision'] }, facts).matches, true);
    assert.equal(evaluateRule({ flags: ['nausea', 'vomiting'] }, facts).matches, false);
  });

  test('specificity counts each condition, and each required flag', () => {
    const res = evaluateRule({ severity: 'severe', flags: ['blurred_vision', 'nausea'] }, facts);
    assert.equal(res.specificity, 3);
    assert.deepEqual(res.matchedOn, { severity: 'severe', flags: ['blurred_vision', 'nausea'] });
  });

  test('comparison ignores case and whitespace', () => {
    assert.equal(evaluateRule({ severity: ' SEVERE ', flags: ['Nausea'] }, facts).matches, true);
  });

  test('an array value means "any of"', () => {
    assert.equal(evaluateRule({ severity: ['moderate', 'severe'] }, facts).matches, true);
    assert.equal(evaluateRule({ severity: ['mild', 'moderate'] }, facts).matches, false);
  });

  test('does not match when the patient never answered that question', () => {
    assert.equal(evaluateRule({ timing: 'at_rest' }, facts).matches, false);
  });

  test('an empty rule is a catch-all with specificity 0', () => {
    const res = evaluateRule({}, facts);
    assert.equal(res.matches, true);
    assert.equal(res.specificity, 0);
  });

  test('malformed rule_conditions never throw and never match', () => {
    const bad = [
      null,
      undefined,
      'severe',
      42,
      ['severe'],
      { flags: 'nausea' },
      { flags: [1, 2] },
      { severity: 5 },
      { severity: [] },
      { severity: [null] },
      { constructor: 'x' },
    ];
    for (const conditions of bad) {
      assert.doesNotThrow(() => evaluateRule(conditions, facts));
      assert.equal(evaluateRule(conditions, facts).matches, false, JSON.stringify(conditions));
    }
  });
});

describe('matchRules ranking', () => {
  const facts = { severity: 'severe', flags: ['blurred_vision', 'nausea'] };

  test('urgency beats specificity (a very specific LOW rule cannot outrank an URGENT one)', () => {
    const matches = matchRules(facts, [
      rule(1, { severity: 'severe', flags: ['blurred_vision', 'nausea'] }, 'low'),
      rule(2, { severity: 'severe' }, 'urgent'),
      rule(3, { flags: ['nausea'] }, 'moderate'),
    ]);
    assert.deepEqual(matches.map((m) => m.ruleId), [2, 3, 1]);
    assert.equal(matches[0].urgencyLevel, 'urgent');
  });

  test('with equal urgency, the more specific rule wins', () => {
    const matches = matchRules(facts, [
      rule(1, { severity: 'severe' }, 'moderate'),
      rule(2, { severity: 'severe', flags: ['nausea'] }, 'moderate'),
    ]);
    assert.deepEqual(matches.map((m) => m.ruleId), [2, 1]);
  });

  test('with equal urgency and specificity, the lowest rule id wins', () => {
    const matches = matchRules(facts, [
      rule(7, { severity: 'severe' }, 'urgent'),
      rule(3, { flags: ['nausea'] }, 'urgent'),
    ]);
    assert.deepEqual(matches.map((m) => m.ruleId), [3, 7]);
  });

  test('rules that do not match are excluded; no matches gives an empty list', () => {
    assert.deepEqual(matchRules(facts, [rule(1, { severity: 'mild' }, 'low')]), []);
    assert.deepEqual(matchRules(facts, []), []);
  });

  test('a catch-all rule matches but ranks below a more specific rule of equal urgency', () => {
    const matches = matchRules(facts, [rule(1, {}, 'moderate'), rule(2, { severity: 'severe' }, 'moderate')]);
    assert.deepEqual(matches.map((m) => m.ruleId), [2, 1]);
  });

  test('null matchedConditionIds / specialty are normalized', () => {
    const [m] = matchRules(facts, [
      { id: 1, ruleConditions: {}, urgencyLevel: 'low', matchedConditionIds: null, recommendedSpecialtyId: undefined },
    ]);
    assert.deepEqual(m.matchedConditionIds, []);
    assert.equal(m.recommendedSpecialtyId, null);
  });
});