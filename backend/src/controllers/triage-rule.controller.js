const prisma = require('../lib/prisma');
const { SUPPORTED_RULE_KEYS, URGENCY_RANK, keyForQuestion } = require('../services/triage.service');

const URGENCY_LEVELS = Object.keys(URGENCY_RANK); // ['urgent', 'moderate', 'low']

const RULE_SELECT = {
  id: true,
  symptomId: true,
  ruleConditions: true,
  matchedConditionIds: true,
  recommendedSpecialtyId: true,
  urgencyLevel: true,
};

const norm = (v) => String(v).trim().toLowerCase();
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Validates rule_conditions against what the engine can actually evaluate AND
// against the symptom's real answer options. This stops a typo like
// {"severity":"sever"} from being saved as a rule that silently never matches.
// Returns a list of problems (empty list = valid). {} (catch-all) is valid.
// ---------------------------------------------------------------------------
async function conditionProblems(symptomId, ruleConditions) {
  if (!isPlainObject(ruleConditions)) {
    return ['ruleConditions must be a JSON object (use {} for a catch-all rule).'];
  }
  const keys = Object.keys(ruleConditions);
  if (keys.length === 0) return [];

  const questions = await prisma.symptomQuestion.findMany({
    where: { symptomId },
    select: { id: true, questionText: true, questionType: true },
  });
  const options = questions.length
    ? await prisma.symptomQuestionOption.findMany({
        where: { questionId: { in: questions.map((q) => q.id) } },
        select: { questionId: true, optionValue: true },
      })
    : [];

  const valuesByQuestion = new Map();
  for (const o of options) {
    if (!valuesByQuestion.has(o.questionId)) valuesByQuestion.set(o.questionId, []);
    valuesByQuestion.get(o.questionId).push(norm(o.optionValue));
  }

  // key -> Set of values a patient can actually produce for this symptom
  const allowed = new Map();
  const add = (key, values) => {
    if (!allowed.has(key)) allowed.set(key, new Set());
    values.forEach((v) => allowed.get(key).add(v));
  };
  for (const q of questions) {
    const values = valuesByQuestion.get(q.id) || [];
    if (q.questionType === 'multi') {
      add('flags', values);
    } else {
      const key = keyForQuestion(q.questionText);
      if (key) add(key, values);
    }
  }

  const problems = [];
  for (const key of keys) {
    const expected = ruleConditions[key];

    if (!SUPPORTED_RULE_KEYS.includes(key)) {
      problems.push(`"${key}" is not a supported condition key (use: ${SUPPORTED_RULE_KEYS.join(', ')}).`);
      continue;
    }

    const valid = allowed.get(key);
    if (!valid) {
      problems.push(
        `This symptom has no ${key === 'flags' ? 'multi-choice' : 'single-choice'} question that feeds "${key}", so a rule using it could never match.`
      );
      continue;
    }

    const list = key === 'flags' ? expected : Array.isArray(expected) ? expected : [expected];
    if (!Array.isArray(list) || list.length === 0 || list.some((v) => typeof v !== 'string')) {
      problems.push(
        key === 'flags'
          ? '"flags" must be a non-empty array of strings.'
          : `"${key}" must be a string or a non-empty array of strings.`
      );
      continue;
    }

    for (const v of list) {
      if (!valid.has(norm(v))) {
        problems.push(`"${v}" is not a valid ${key} value for this symptom (valid: ${[...valid].join(', ')}).`);
      }
    }
  }

  return problems;
}

// matchedConditionIds: array of integers, all real conditions. Returns { ok, value | error }.
async function checkConditionIds(ids) {
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
    return { ok: false, error: 'matchedConditionIds must be an array of integers.' };
  }
  const unique = [...new Set(ids)];
  if (unique.length > 0) {
    const found = await prisma.condition.count({ where: { id: { in: unique } } });
    if (found !== unique.length) {
      return { ok: false, error: 'matchedConditionIds contains an id that is not a real condition.' };
    }
  }
  return { ok: true, value: unique };
}

// recommendedSpecialtyId: null or an existing specialty id. Returns { ok, value | error }.
async function checkSpecialty(specialtyId) {
  if (specialtyId === null) return { ok: true, value: null };
  if (!Number.isInteger(specialtyId)) {
    return { ok: false, error: 'recommendedSpecialtyId must be an integer or null.' };
  }
  const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
  if (!specialty) {
    return { ok: false, error: 'recommendedSpecialtyId does not match a real specialty.' };
  }
  return { ok: true, value: specialtyId };
}

const NEEDS_OUTCOME =
  'A rule must set recommendedSpecialtyId and/or at least one matchedConditionIds, otherwise it has nothing to recommend.';

// ---- POST /triage-rules (admin only) ----
async function createRule(req, res) {
  try {
    const { symptomId, ruleConditions, urgencyLevel } = req.body;
    let { matchedConditionIds, recommendedSpecialtyId } = req.body;

    if (!Number.isInteger(symptomId) || ruleConditions === undefined || !urgencyLevel) {
      return res.status(400).json({ error: 'symptomId (integer), ruleConditions, and urgencyLevel are required.' });
    }
    if (!URGENCY_LEVELS.includes(urgencyLevel)) {
      return res.status(400).json({ error: `urgencyLevel must be one of: ${URGENCY_LEVELS.join(', ')}.` });
    }

    const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
    if (!symptom) {
      return res.status(400).json({ error: 'symptomId does not match a real symptom.' });
    }

    const problems = await conditionProblems(symptomId, ruleConditions);
    if (problems.length > 0) {
      return res.status(400).json({ error: 'Invalid ruleConditions.', details: problems });
    }

    const ids = await checkConditionIds(matchedConditionIds === undefined ? [] : matchedConditionIds);
    if (!ids.ok) return res.status(400).json({ error: ids.error });

    const spec = await checkSpecialty(recommendedSpecialtyId === undefined ? null : recommendedSpecialtyId);
    if (!spec.ok) return res.status(400).json({ error: spec.error });

    if (spec.value === null && ids.value.length === 0) {
      return res.status(400).json({ error: NEEDS_OUTCOME });
    }

    const rule = await prisma.triageRule.create({
      data: {
        symptomId,
        ruleConditions,
        matchedConditionIds: ids.value,
        recommendedSpecialtyId: spec.value,
        urgencyLevel,
      },
      select: RULE_SELECT,
    });

    return res.status(201).json({ rule });
  } catch (err) {
    console.error('createRule error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /triage-rules (admin only) ----
// Optional filter: ?symptomId=1
async function getAllRules(req, res) {
  try {
    const where = {};
    if (req.query.symptomId) {
      const symptomId = parseInt(req.query.symptomId, 10);
      if (Number.isNaN(symptomId)) {
        return res.status(400).json({ error: 'Invalid symptomId.' });
      }
      where.symptomId = symptomId;
    }

    const rules = await prisma.triageRule.findMany({
      where,
      select: RULE_SELECT,
      orderBy: [{ symptomId: 'asc' }, { id: 'asc' }],
    });
    return res.status(200).json({ rules });
  } catch (err) {
    console.error('getAllRules error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /triage-rules/:id (admin only) ----
async function getRuleById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule id.' });
    }

    const rule = await prisma.triageRule.findUnique({ where: { id }, select: RULE_SELECT });
    if (!rule) {
      return res.status(404).json({ error: 'Triage rule not found.' });
    }
    return res.status(200).json({ rule });
  } catch (err) {
    console.error('getRuleById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /triage-rules/:id (admin only) ----
// Partial update. A rule cannot be moved to a different symptom (delete + recreate instead).
async function updateRule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule id.' });
    }

    const existing = await prisma.triageRule.findUnique({ where: { id }, select: RULE_SELECT });
    if (!existing) {
      return res.status(404).json({ error: 'Triage rule not found.' });
    }

    const { symptomId, ruleConditions, matchedConditionIds, recommendedSpecialtyId, urgencyLevel } = req.body;
    const data = {};

    if (symptomId !== undefined && symptomId !== existing.symptomId) {
      return res.status(400).json({ error: 'symptomId cannot be changed. Delete the rule and create a new one.' });
    }

    if (urgencyLevel !== undefined) {
      if (!URGENCY_LEVELS.includes(urgencyLevel)) {
        return res.status(400).json({ error: `urgencyLevel must be one of: ${URGENCY_LEVELS.join(', ')}.` });
      }
      data.urgencyLevel = urgencyLevel;
    }

    if (ruleConditions !== undefined) {
      const problems = await conditionProblems(existing.symptomId, ruleConditions);
      if (problems.length > 0) {
        return res.status(400).json({ error: 'Invalid ruleConditions.', details: problems });
      }
      data.ruleConditions = ruleConditions;
    }

    if (matchedConditionIds !== undefined) {
      const ids = await checkConditionIds(matchedConditionIds);
      if (!ids.ok) return res.status(400).json({ error: ids.error });
      data.matchedConditionIds = ids.value;
    }

    if (recommendedSpecialtyId !== undefined) {
      const spec = await checkSpecialty(recommendedSpecialtyId);
      if (!spec.ok) return res.status(400).json({ error: spec.error });
      data.recommendedSpecialtyId = spec.value;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    // After the update the rule must still recommend something.
    const finalSpecialty =
      data.recommendedSpecialtyId !== undefined ? data.recommendedSpecialtyId : existing.recommendedSpecialtyId;
    const finalConditionIds =
      data.matchedConditionIds !== undefined ? data.matchedConditionIds : existing.matchedConditionIds || [];
    if (finalSpecialty === null && finalConditionIds.length === 0) {
      return res.status(400).json({ error: NEEDS_OUTCOME });
    }

    const updated = await prisma.triageRule.update({ where: { id }, data, select: RULE_SELECT });

    return res.status(200).json({ rule: updated });
  } catch (err) {
    console.error('updateRule error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /triage-rules/:id (admin only) ----
async function deleteRule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule id.' });
    }

    const existing = await prisma.triageRule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Triage rule not found.' });
    }

    await prisma.triageRule.delete({ where: { id } });

    return res.status(200).json({ message: 'Triage rule deleted.' });
  } catch (err) {
    console.error('deleteRule error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  conditionProblems, // exported for testing
};