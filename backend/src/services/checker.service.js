const prisma = require('../lib/prisma');

const MAX_ANSWERS = 50;

// Accepts 3 or "3", rejects everything else (floats, "abc", null, objects...).
function toInt(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

// Validates a raw submission body against the real questions/options in the DB
// and returns a normalized version.
//
// Returns either:
//   { ok: false, status, error, details? }
//   { ok: true, normalized }
//
// Expected body:
//   {
//     "symptom_id": 1,
//     "answers": [
//       { "question_id": 2, "values": ["severe"] },
//       { "question_id": 4, "values": ["blurred_vision", "nausea"] }
//     ]
//   }
// (camelCase aliases symptomId / questionId, and "value": "x" as shorthand
//  for "values": ["x"], are also accepted.)
async function validateAndNormalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object.' };
  }

  // ---- symptom_id ----
  const symptomId = toInt(body.symptom_id ?? body.symptomId);
  if (symptomId === null) {
    return { ok: false, status: 400, error: 'symptom_id (integer) is required.' };
  }

  // ---- answers (shape only) ----
  const { answers } = body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return { ok: false, status: 400, error: 'answers must be a non-empty array.' };
  }
  if (answers.length > MAX_ANSWERS) {
    return { ok: false, status: 400, error: `answers cannot contain more than ${MAX_ANSWERS} items.` };
  }

  // ---- symptom exists? ----
  const symptom = await prisma.symptom.findUnique({
    where: { id: symptomId },
    select: { id: true, name: true },
  });
  if (!symptom) {
    return { ok: false, status: 400, error: 'symptom_id does not match a real symptom.' };
  }

  // ---- load this symptom's questions + options ----
  const questions = await prisma.symptomQuestion.findMany({
    where: { symptomId },
    select: { id: true, questionText: true, questionType: true, displayOrder: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const optionsByQuestion = new Map(); // questionId -> Map(optionValue -> option)

  if (questions.length > 0) {
    const options = await prisma.symptomQuestionOption.findMany({
      where: { questionId: { in: questions.map((q) => q.id) } },
      select: { id: true, questionId: true, optionText: true, optionValue: true },
    });
    for (const opt of options) {
      if (!optionsByQuestion.has(opt.questionId)) optionsByQuestion.set(opt.questionId, new Map());
      optionsByQuestion.get(opt.questionId).set(opt.optionValue, opt);
    }
  }

  // ---- validate each answer, collecting ALL problems ----
  const details = [];
  const seenQuestionIds = new Set();
  const normalizedAnswers = [];

  answers.forEach((raw, i) => {
    const where = `answers[${i}]`;

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      details.push(`${where}: must be an object.`);
      return;
    }

    const questionId = toInt(raw.question_id ?? raw.questionId);
    if (questionId === null) {
      details.push(`${where}: question_id (integer) is required.`);
      return;
    }

    const question = questionById.get(questionId);
    if (!question) {
      details.push(`${where}: question ${questionId} does not belong to symptom ${symptomId}.`);
      return;
    }

    if (seenQuestionIds.has(questionId)) {
      details.push(`${where}: question ${questionId} is answered more than once.`);
      return;
    }
    seenQuestionIds.add(questionId);

    // values: accept "values": [...] or "value": "x"
    let values = raw.values;
    if (values === undefined && typeof raw.value === 'string') values = [raw.value];
    if (!Array.isArray(values) || values.length === 0) {
      details.push(`${where}: values must be a non-empty array of option values.`);
      return;
    }
    if (values.some((v) => typeof v !== 'string')) {
      details.push(`${where}: every value must be a string.`);
      return;
    }

    // trim + dedupe, keep order
    const cleaned = [...new Set(values.map((v) => v.trim()))];

    if (question.questionType === 'single' && cleaned.length !== 1) {
      details.push(`${where}: question ${questionId} is single-choice and needs exactly 1 value.`);
      return;
    }

    const optionMap = optionsByQuestion.get(questionId) || new Map();
    const resolved = [];
    for (const v of cleaned) {
      const opt = optionMap.get(v);
      if (!opt) {
        details.push(`${where}: "${v}" is not a valid option for question ${questionId}.`);
      } else {
        resolved.push({ optionId: opt.id, optionValue: opt.optionValue, optionText: opt.optionText });
      }
    }
    if (resolved.length !== cleaned.length) return;

    normalizedAnswers.push({
      questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      displayOrder: question.displayOrder,
      values: resolved,
    });
  });

  if (details.length > 0) {
    return { ok: false, status: 400, error: 'Invalid submission.', details };
  }

  // Order answers the same way the questionnaire is displayed.
  normalizedAnswers.sort((a, b) => a.displayOrder - b.displayOrder || a.questionId - b.questionId);

  return {
    ok: true,
    normalized: {
      symptomId: symptom.id,
      symptomName: symptom.name,
      answers: normalizedAnswers.map(({ displayOrder, ...rest }) => rest),
      // Partial submissions are allowed; this tells the caller what was skipped.
      unansweredQuestionIds: questions.filter((q) => !seenQuestionIds.has(q.id)).map((q) => q.id),
    },
  };
}

module.exports = { validateAndNormalize };