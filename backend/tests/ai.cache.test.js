const { test } = require('node:test');
const assert = require('node:assert/strict');
const { overlap, signature, makeKey } = require('../src/services/ai/cache');

const ans = (q, ...v) => ({ question: q, values: v.map((x) => ({ value: x, text: x })) });

test('overlap: identical answers score 1, unrelated answers 0', () => {
  const a = signature([ans('How long?', '1-3 days'), ans('How severe?', 'Mild')]);
  assert.equal(overlap(a, a), 1);
  assert.equal(overlap(a, signature([ans('Fever?', 'Yes')])), 0);
});

test('overlap: one different answer out of four is below the 0.75 reuse threshold', () => {
  const base = [ans('Q1', 'a'), ans('Q2', 'b'), ans('Q3', 'c'), ans('Q4', 'd')];
  const changed = [...base.slice(0, 3), ans('Q4', 'severe')];
  assert.ok(overlap(signature(base), signature(changed)) < 0.75);
});

test('makeKey ignores case, punctuation and answer order', () => {
  const k1 = makeKey('assessment', 'Headache!', [ans('Any of these?', 'Fever', 'Nausea')]);
  const k2 = makeKey('assessment', 'headache', [ans('any of these', 'nausea', 'fever')]);
  assert.equal(k1, k2);
});