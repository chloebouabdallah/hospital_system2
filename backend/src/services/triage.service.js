const prisma = require('../lib/prisma');

// =====================================================================
// RULE-MATCHING ENGINE
//
// Pipeline:  normalized submission  ->  facts  ->  match rules  ->  rank
//
// 1. deriveFacts   turns the patient's answers into a flat "facts" object
//                  e.g. { severity: 'severe', duration: '1-3_days',
//                         flags: ['blurred_vision', 'nausea'] }
// 2. evaluateRule  STRICT matching: a rule matches only if EVERY condition in its
//                  rule_conditions JSONB is satisfied by the facts.
// 3. matchRules    keeps the matching rules and ranks them (tie-break below).
//
// The functions below are pure (no DB), so they can be unit-tested directly.
// Only runTriage() touches the database.
// =====================================================================

// ---- Ranking constants (change here to change behaviour) ----
// Tie-break order when several rules match at once:
//   1. highest urgency wins            (safety first)
//   2. then the most specific rule     (more satisfied conditions)
//   3. then the lowest rule id         (so the result is always deterministic)
const URGENCY_RANK = { urgent: 3, moderate: 2, low: 1 };

// ---- Which single-choice question feeds which rule key? ----
// The schema doesn't tag questions with a key, so we infer it from the question text.
// Checked in order; first match wins. Multi-choice questions are different: ALL their
// selected values go into facts.flags, regardless of text.
const SINGLE_QUESTION_KEYS = [
  ['severity', /severe|severity/i],        // "How severe is it?"
  ['duration', /how long/i],               // "How long have you had it?"
  ['temperature', /temperature/i],         // "What is your temperature range?"
  ['location', /^where\b/i],               // "Where is the pain?"
  ['timing', /^when\b/i],                  // "When does it happen?"
  ['type', /what type|feel like/i],        // "What type of cough is it?" / "What does the pain feel like?"
];

// Keys a rule's rule_conditions may use (exported for the Day 7 rule-admin validation).
const SUPPORTED_RULE_KEYS = ['flags', ...SINGLE_QUESTION_KEYS.map(([key]) => key)];

const norm = (v) => String(v).trim().toLowerCase();
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function keyForQuestion(questionText) {
  for (const [key, pattern] of SINGLE_QUESTION_KEYS) {
    if (pattern.test(questionText)) return key;
  }
  return null;
}

// ---- 1. answers -> facts ----
function deriveFacts(normalized) {
  const facts = { flags: [] };

  for (const answer of normalized.answers) {
    const values = answer.values.map((v) => norm(v.optionValue));

    if (answer.questionType === 'multi') {
      facts.flags.push(...values);
      continue;
    }

    const key = keyForQuestion(answer.questionText);
    if (key && !has(facts, key)) facts[key] = values[0];
  }

  facts.flags = [...new Set(facts.flags)];
  return facts;
}

// ---- 2. one rule vs the facts (strict: all conditions must match) ----
// Condition forms supported in rule_conditions:
//   "severity": "severe"                 -> facts.severity must equal "severe"
//   "severity": ["moderate", "severe"]   -> facts.severity must be ANY of these
//   "flags": ["a", "b"]                  -> facts.flags must contain ALL of these
//   {}                                   -> no conditions: matches every submission for the
//                                           symptom, with specificity 0 (acts as a catch-all)
// Malformed conditions never throw; the rule just doesn't match.
function evaluateRule(ruleConditions, facts) {
  if (!isPlainObject(ruleConditions)) return { matches: false };

  let specificity = 0;
  const matchedOn = {};

  for (const [key, expected] of Object.entries(ruleConditions)) {
    if (key === 'flags') {
      if (!Array.isArray(expected) || expected.some((f) => typeof f !== 'string')) {
        return { matches: false };
      }
      const needed = expected.map(norm);
      if (!needed.every((f) => facts.flags.includes(f))) return { matches: false };
      specificity += needed.length;
      matchedOn.flags = needed;
      continue;
    }

    if (!has(facts, key)) return { matches: false }; // patient didn't answer that question

    const allowed = Array.isArray(expected) ? expected : [expected];
    if (allowed.length === 0 || allowed.some((e) => typeof e !== 'string')) {
      return { matches: false };
    }
    if (!allowed.map(norm).includes(facts[key])) return { matches: false };

    specificity += 1;
    matchedOn[key] = facts[key];
  }

  return { matches: true, specificity, matchedOn };
}

// ---- 3. all rules -> ranked matches ----
function matchRules(facts, rules) {
  const matches = [];

  for (const rule of rules) {
    const result = evaluateRule(rule.ruleConditions, facts);
    if (!result.matches) continue;

    matches.push({
      ruleId: rule.id,
      urgencyLevel: rule.urgencyLevel,
      specificity: result.specificity,
      matchedOn: result.matchedOn,
      recommendedSpecialtyId: rule.recommendedSpecialtyId ?? null,
      matchedConditionIds: rule.matchedConditionIds ?? [],
    });
  }

  matches.sort(
    (a, b) =>
      (URGENCY_RANK[b.urgencyLevel] || 0) - (URGENCY_RANK[a.urgencyLevel] || 0) ||
      b.specificity - a.specificity ||
      a.ruleId - b.ruleId
  );

  return matches;
}

// ---- DB runner: normalized submission -> triage result ----
async function runTriage(normalized) {
  const facts = deriveFacts(normalized);

  const rules = await prisma.triageRule.findMany({
    where: { symptomId: normalized.symptomId },
    select: {
      id: true,
      ruleConditions: true,
      matchedConditionIds: true,
      recommendedSpecialtyId: true,
      urgencyLevel: true,
    },
  });

  const matches = matchRules(facts, rules);

  return {
    facts,
    evaluatedRules: rules.length,
    matches,                    // every matching rule, best first
    primary: matches[0] || null, // the winner (null = nothing matched; Day 6 adds the fallback)
  };
}

module.exports = {
  runTriage,
  keyForQuestion,   // ← add this line
  deriveFacts,
  evaluateRule,
  matchRules,
  URGENCY_RANK,
  SUPPORTED_RULE_KEYS,
};
