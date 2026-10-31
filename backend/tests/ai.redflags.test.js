const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRedFlags, mostUrgent } = require('../src/services/ai/redflags');

const ans = (question, ...texts) => ({ question, values: texts.map((t) => ({ text: t, value: t })) });
const ids = (r) => r.matches.map((m) => m.id);

describe('red flags: should escalate', () => {
  test('chest pain + shortness of breath typed in free text', () => {
    assert.ok(ids(evaluateRedFlags('chest pain and shortness of breath')).includes('chest_pain_with_breathlessness'));
  });
  test('chest pain typed, breathlessness confirmed with a Yes answer', () => {
    const r = evaluateRedFlags('I have chest pain', [ans('Are you short of breath?', 'Yes')]);
    assert.ok(r.urgent);
  });
  test('chest pain + selected multi-choice option', () => {
    const r = evaluateRedFlags('chest tightness', [ans('Anything else?', 'Shortness of breath', 'Nausea')]);
    assert.ok(r.urgent);
  });
  test('chest pain spreading to the arm', () => {
    assert.ok(ids(evaluateRedFlags('chest pain going down my left arm')).includes('chest_pain_radiating'));
  });
  test('vomiting blood', () => assert.ok(evaluateRedFlags('I am vomiting blood').urgent));
  test('stroke signs', () => assert.ok(evaluateRedFlags('slurred speech and my face is drooping').urgent));
  test('confusion / fainting', () => assert.ok(evaluateRedFlags('I fainted this morning').urgent));
  test('fever + stiff neck', () => assert.ok(evaluateRedFlags('fever and stiff neck').urgent));
  test('suicidal thoughts', () => assert.ok(evaluateRedFlags('I want to die').urgent));
  test('worst headache of life', () => assert.ok(evaluateRedFlags('worst headache of my life').urgent));
  test('Arabic chest pain + breathlessness', () => assert.ok(evaluateRedFlags('ألم في الصدر وضيق في التنفس').urgent));
  test('flag appearing only in a later answer still escalates', () => {
    const r = evaluateRedFlags('headache', [
      ans('How long?', '1 to 3 days'),
      ans('Any of these?', 'Confusion', 'Nausea'),
    ]);
    assert.ok(r.urgent);
  });
  test('each match carries a human-readable reason', () => {
    const r = evaluateRedFlags('vomiting blood');
    assert.ok(r.matches[0].reason.length > 5);
  });
});

describe('red flags: should NOT escalate', () => {
  test('plain mild headache', () => assert.equal(evaluateRedFlags('mild headache since yesterday').urgent, false));
  test('chest pain alone does not trigger the combo rules', () => {
    assert.equal(evaluateRedFlags('sharp chest pain when I press on it').urgent, false);
  });
  test('negated: no shortness of breath', () => {
    assert.equal(evaluateRedFlags('chest pain, no shortness of breath').urgent, false);
  });
  test('negated via a No answer to a yes/no question', () => {
    const r = evaluateRedFlags('chest pain', [ans('Are you short of breath?', 'No')]);
    assert.equal(r.urgent, false);
  });
  test('"None of these" selects nothing', () => {
    const r = evaluateRedFlags('cough', [ans('Any of these?', 'None of these')]);
    assert.equal(r.urgent, false);
  });
  test('negation does not leak across clauses: "no energy and chest pain"... still needs the 2nd pattern', () => {
    // "no energy" must not negate "shortness of breath" that comes after "and"
    assert.ok(evaluateRedFlags('no energy and chest pain and shortness of breath').urgent);
  });
  test('negated suicide wording is not triggered by "no thoughts of suicide"', () => {
    assert.equal(evaluateRedFlags('stressed but no thoughts of suicide').urgent, false);
  });
});

describe('mostUrgent', () => {
  test('returns the most cautious level', () => {
    assert.equal(mostUrgent('low', 'urgent', 'moderate'), 'urgent');
    assert.equal(mostUrgent('low', null, undefined), 'low');
    assert.equal(mostUrgent('moderate', 'low'), 'moderate');
  });
  test('ignores unknown values; null when nothing valid', () => {
    assert.equal(mostUrgent('banana', null), null);
  });
});
