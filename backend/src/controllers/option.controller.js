const prisma = require('../lib/prisma');

const OPTION_SELECT = { id: true, questionId: true, optionText: true, optionValue: true };

// Same transformation your seed.js uses, so manually-added options look identical
// to seeded ones: "Less than a day" -> "less_than_a_day".
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '_');
}

// optionValue must be unique within a question (the DB has no constraint for this,
// but the submission endpoint in Day 3 matches answers by optionValue, so duplicates
// would make answers ambiguous). excludeId lets an update skip the row being edited.
async function valueTaken(questionId, optionValue, excludeId) {
  const found = await prisma.symptomQuestionOption.findFirst({
    where: {
      questionId,
      optionValue,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!found;
}

// ---- POST /symptom-question-options (admin only) ----
async function createOption(req, res) {
  try {
    const { questionId } = req.body;
    let { optionText, optionValue } = req.body;
    optionText = typeof optionText === 'string' ? optionText.trim() : '';

    if (!Number.isInteger(questionId) || !optionText) {
      return res.status(400).json({ error: 'questionId (integer) and optionText are required.' });
    }
    if (optionText.length > 150) {
      return res.status(400).json({ error: 'optionText must be 150 characters or fewer.' });
    }

    if (optionValue === undefined || optionValue === null || optionValue === '') {
      optionValue = slugify(optionText);
    } else if (typeof optionValue === 'string') {
      optionValue = optionValue.trim();
    } else {
      return res.status(400).json({ error: 'optionValue must be a string.' });
    }
    if (!optionValue || optionValue.length > 100) {
      return res.status(400).json({ error: 'optionValue must be 1-100 characters.' });
    }

    const question = await prisma.symptomQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(400).json({ error: 'questionId does not match a real question.' });
    }

    if (await valueTaken(questionId, optionValue)) {
      return res.status(409).json({ error: 'This question already has an option with that optionValue.' });
    }

    const option = await prisma.symptomQuestionOption.create({
      data: { questionId, optionText, optionValue },
      select: OPTION_SELECT,
    });

    return res.status(201).json({ option });
  } catch (err) {
    console.error('createOption error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptom-question-options (admin only) ----
// Optional filter: ?questionId=3
async function getAllOptions(req, res) {
  try {
    const where = {};
    if (req.query.questionId) {
      const questionId = parseInt(req.query.questionId, 10);
      if (Number.isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid questionId.' });
      }
      where.questionId = questionId;
    }

    const options = await prisma.symptomQuestionOption.findMany({
      where,
      select: OPTION_SELECT,
      orderBy: [{ questionId: 'asc' }, { id: 'asc' }],
    });
    return res.status(200).json({ options });
  } catch (err) {
    console.error('getAllOptions error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptom-question-options/:id (admin only) ----
async function getOptionById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid option id.' });
    }

    const option = await prisma.symptomQuestionOption.findUnique({
      where: { id },
      select: OPTION_SELECT,
    });
    if (!option) {
      return res.status(404).json({ error: 'Option not found.' });
    }
    return res.status(200).json({ option });
  } catch (err) {
    console.error('getOptionById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /symptom-question-options/:id (admin only) ----
// Partial update. An option cannot be moved to a different question.
async function updateOption(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid option id.' });
    }

    const existing = await prisma.symptomQuestionOption.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Option not found.' });
    }

    const { optionText, optionValue } = req.body;
    const data = {};

    if (optionText !== undefined) {
      const trimmed = typeof optionText === 'string' ? optionText.trim() : '';
      if (!trimmed) {
        return res.status(400).json({ error: 'optionText cannot be empty.' });
      }
      if (trimmed.length > 150) {
        return res.status(400).json({ error: 'optionText must be 150 characters or fewer.' });
      }
      data.optionText = trimmed;
    }

    if (optionValue !== undefined) {
      const trimmed = typeof optionValue === 'string' ? optionValue.trim() : '';
      if (!trimmed || trimmed.length > 100) {
        return res.status(400).json({ error: 'optionValue must be 1-100 characters.' });
      }
      if (trimmed !== existing.optionValue) {
        if (await valueTaken(existing.questionId, trimmed, id)) {
          return res.status(409).json({ error: 'This question already has an option with that optionValue.' });
        }
        data.optionValue = trimmed;
      }
    }

    if (Object.keys(data).length === 0 && optionText === undefined && optionValue === undefined) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const updated = await prisma.symptomQuestionOption.update({
      where: { id },
      data,
      select: OPTION_SELECT,
    });

    return res.status(200).json({ option: updated });
  } catch (err) {
    console.error('updateOption error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /symptom-question-options/:id (admin only) ----
async function deleteOption(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid option id.' });
    }

    const existing = await prisma.symptomQuestionOption.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Option not found.' });
    }

    await prisma.symptomQuestionOption.delete({ where: { id } });

    return res.status(200).json({ message: 'Option deleted.' });
  } catch (err) {
    console.error('deleteOption error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createOption,
  getAllOptions,
  getOptionById,
  updateOption,
  deleteOption,
};