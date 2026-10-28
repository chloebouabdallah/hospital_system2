const prisma = require('../lib/prisma');

const QUESTION_TYPES = ['single', 'multi'];

const QUESTION_SELECT = {
  id: true,
  symptomId: true,
  questionText: true,
  questionType: true,
  displayOrder: true,
};

const OPTION_SELECT = { id: true, questionId: true, optionText: true, optionValue: true };

// Fetch options for a list of question ids and return them grouped by questionId.
// Done as a second query (rather than a nested include) so this doesn't depend on
// relation field names in schema.prisma.
async function optionsByQuestion(questionIds) {
  const grouped = {};
  if (questionIds.length === 0) return grouped;

  const options = await prisma.symptomQuestionOption.findMany({
    where: { questionId: { in: questionIds } },
    select: { id: true, questionId: true, optionText: true, optionValue: true },
    orderBy: { id: 'asc' },
  });

  for (const opt of options) {
    if (!grouped[opt.questionId]) grouped[opt.questionId] = [];
    grouped[opt.questionId].push({
      id: opt.id,
      optionText: opt.optionText,
      optionValue: opt.optionValue,
    });
  }
  return grouped;
}

// ---- GET /symptoms/:id/questions (patient / doctor / admin) ----
// The full question tree for one symptom, in one call.
async function getSymptomQuestions(req, res) {
  try {
    const symptomId = parseInt(req.params.id, 10);
    if (Number.isNaN(symptomId)) {
      return res.status(400).json({ error: 'Invalid symptom id.' });
    }

    const symptom = await prisma.symptom.findUnique({
      where: { id: symptomId },
      select: { id: true, name: true },
    });
    if (!symptom) {
      return res.status(404).json({ error: 'Symptom not found.' });
    }

    const questions = await prisma.symptomQuestion.findMany({
      where: { symptomId },
      select: QUESTION_SELECT,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });

    const grouped = await optionsByQuestion(questions.map((q) => q.id));

    return res.status(200).json({
      symptom,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        displayOrder: q.displayOrder,
        options: grouped[q.id] || [],
      })),
    });
  } catch (err) {
    console.error('getSymptomQuestions error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- POST /symptom-questions (admin only) ----
async function createQuestion(req, res) {
  try {
    const { symptomId, questionType } = req.body;
    let { questionText, displayOrder } = req.body;
    questionText = typeof questionText === 'string' ? questionText.trim() : '';

    if (!Number.isInteger(symptomId) || !questionText || !questionType) {
      return res.status(400).json({
        error: 'symptomId (integer), questionText, and questionType are required.',
      });
    }
    if (!QUESTION_TYPES.includes(questionType)) {
      return res.status(400).json({ error: `questionType must be one of: ${QUESTION_TYPES.join(', ')}.` });
    }
    if (displayOrder !== undefined && !Number.isInteger(displayOrder)) {
      return res.status(400).json({ error: 'displayOrder must be an integer.' });
    }

    const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
    if (!symptom) {
      return res.status(400).json({ error: 'symptomId does not match a real symptom.' });
    }

    // If no displayOrder is given, put the question at the end.
    if (displayOrder === undefined) {
      const agg = await prisma.symptomQuestion.aggregate({
        where: { symptomId },
        _max: { displayOrder: true },
      });
      displayOrder = (agg._max.displayOrder ?? -1) + 1;
    }

    const question = await prisma.symptomQuestion.create({
      data: { symptomId, questionText, questionType, displayOrder },
      select: QUESTION_SELECT,
    });

    return res.status(201).json({ question });
  } catch (err) {
    console.error('createQuestion error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptom-questions (admin only) ----
// Optional filter: ?symptomId=1  (flat list, no options — for the admin panel)
async function getAllQuestions(req, res) {
  try {
    const where = {};
    if (req.query.symptomId) {
      const symptomId = parseInt(req.query.symptomId, 10);
      if (Number.isNaN(symptomId)) {
        return res.status(400).json({ error: 'Invalid symptomId.' });
      }
      where.symptomId = symptomId;
    }

    const questions = await prisma.symptomQuestion.findMany({
      where,
      select: QUESTION_SELECT,
      orderBy: [{ symptomId: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    });
    return res.status(200).json({ questions });
  } catch (err) {
    console.error('getAllQuestions error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptom-questions/:id (admin only) — question with its options ----
async function getQuestionById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid question id.' });
    }

    const question = await prisma.symptomQuestion.findUnique({
      where: { id },
      select: QUESTION_SELECT,
    });
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const grouped = await optionsByQuestion([id]);
    return res.status(200).json({ question: { ...question, options: grouped[id] || [] } });
  } catch (err) {
    console.error('getQuestionById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /symptom-questions/:id (admin only) ----
// Partial update. A question cannot be moved to a different symptom.
async function updateQuestion(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid question id.' });
    }

    const existing = await prisma.symptomQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const { questionText, questionType, displayOrder } = req.body;
    const data = {};

    if (questionText !== undefined) {
      const trimmed = typeof questionText === 'string' ? questionText.trim() : '';
      if (!trimmed) {
        return res.status(400).json({ error: 'questionText cannot be empty.' });
      }
      data.questionText = trimmed;
    }
    if (questionType !== undefined) {
      if (!QUESTION_TYPES.includes(questionType)) {
        return res.status(400).json({ error: `questionType must be one of: ${QUESTION_TYPES.join(', ')}.` });
      }
      data.questionType = questionType;
    }
    if (displayOrder !== undefined) {
      if (!Number.isInteger(displayOrder)) {
        return res.status(400).json({ error: 'displayOrder must be an integer.' });
      }
      data.displayOrder = displayOrder;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const updated = await prisma.symptomQuestion.update({
      where: { id },
      data,
      select: QUESTION_SELECT,
    });

    return res.status(200).json({ question: updated });
  } catch (err) {
    console.error('updateQuestion error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /symptom-questions/:id (admin only) ----
async function deleteQuestion(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid question id.' });
    }

    const existing = await prisma.symptomQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    // symptom_question_options cascade at the DB level.
    await prisma.symptomQuestion.delete({ where: { id } });

    return res.status(200).json({ message: 'Question deleted.' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  getSymptomQuestions,
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};