const prisma = require('../lib/prisma');

// ---- POST /symptoms (admin only) ----
async function createSymptom(req, res) {
  try {
    let { name } = req.body;
    name = typeof name === 'string' ? name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'name must be 100 characters or fewer.' });
    }

    const existing = await prisma.symptom.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A symptom with this name already exists.' });
    }

    const symptom = await prisma.symptom.create({
      data: { name },
      select: { id: true, name: true },
    });

    return res.status(201).json({ symptom });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A symptom with this name already exists.' });
    }
    console.error('createSymptom error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptoms (patient / doctor / admin) ----
// Now includes questionCount and ruleCount for the admin table.
async function getAllSymptoms(req, res) {
  try {
    const symptoms = await prisma.symptom.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            questions: true,
            triageRules: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const shaped = symptoms.map((s) => ({
      id: s.id,
      name: s.name,
      questionCount: s._count.questions,
      ruleCount: s._count.triageRules,
    }));

    return res.status(200).json({ symptoms: shaped });
  } catch (err) {
    console.error('getAllSymptoms error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /symptoms/:id (patient / doctor / admin) ----
async function getSymptomById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid symptom id.' });
    }

    const symptom = await prisma.symptom.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!symptom) {
      return res.status(404).json({ error: 'Symptom not found.' });
    }
    return res.status(200).json({ symptom });
  } catch (err) {
    console.error('getSymptomById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /symptoms/:id (admin only) ----
async function updateSymptom(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid symptom id.' });
    }

    const existing = await prisma.symptom.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Symptom not found.' });
    }

    let { name } = req.body;
    name = typeof name === 'string' ? name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'name must be 100 characters or fewer.' });
    }

    if (name !== existing.name) {
      const nameTaken = await prisma.symptom.findUnique({ where: { name } });
      if (nameTaken) {
        return res.status(409).json({ error: 'A symptom with this name already exists.' });
      }
    }

    const updated = await prisma.symptom.update({
      where: { id },
      data: { name },
      select: { id: true, name: true },
    });

    return res.status(200).json({ symptom: updated });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A symptom with this name already exists.' });
    }
    console.error('updateSymptom error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /symptoms/:id (admin only) ----
async function deleteSymptom(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid symptom id.' });
    }

    const existing = await prisma.symptom.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Symptom not found.' });
    }

    await prisma.symptom.delete({ where: { id } });

    return res.status(200).json({ message: 'Symptom deleted.' });
  } catch (err) {
    console.error('deleteSymptom error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createSymptom,
  getAllSymptoms,
  getSymptomById,
  updateSymptom,
  deleteSymptom,
};