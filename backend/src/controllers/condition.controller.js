const prisma = require('../lib/prisma');

const CONDITION_SELECT = {
  id: true,
  name: true,
  description: true,
  causes: true,
  whenToSeekCare: true,
  specialty: { select: { id: true, name: true } },
};

// Validates specialtyId. Returns { ok, value, error }.
// Accepts null (condition with no specialty) or an existing specialty id.
async function checkSpecialty(specialtyId) {
  if (specialtyId === null) return { ok: true, value: null };
  if (!Number.isInteger(specialtyId)) {
    return { ok: false, error: 'specialtyId must be an integer or null.' };
  }
  const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
  if (!specialty) {
    return { ok: false, error: 'specialtyId does not match a real specialty.' };
  }
  return { ok: true, value: specialtyId };
}

// ---- POST /conditions (admin only) ----
async function createCondition(req, res) {
  try {
    let { name, description, causes, whenToSeekCare, specialtyId } = req.body;
    name = typeof name === 'string' ? name.trim() : '';

    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }
    if (name.length > 150) {
      return res.status(400).json({ error: 'name must be 150 characters or fewer.' });
    }

    const existing = await prisma.condition.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A condition with this name already exists.' });
    }

    let specialtyValue = null;
    if (specialtyId !== undefined) {
      const check = await checkSpecialty(specialtyId);
      if (!check.ok) return res.status(400).json({ error: check.error });
      specialtyValue = check.value;
    }

    const condition = await prisma.condition.create({
      data: {
        name,
        description: description ?? null,
        causes: causes ?? null,
        whenToSeekCare: whenToSeekCare ?? null,
        specialtyId: specialtyValue,
      },
      select: CONDITION_SELECT,
    });

    return res.status(201).json({ condition });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A condition with this name already exists.' });
    }
    console.error('createCondition error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /conditions (patient / doctor / admin) ----
// Optional filter: ?specialtyId=2
async function getAllConditions(req, res) {
  try {
    const where = {};
    if (req.query.specialtyId) {
      const specialtyId = parseInt(req.query.specialtyId, 10);
      if (Number.isNaN(specialtyId)) {
        return res.status(400).json({ error: 'Invalid specialtyId.' });
      }
      where.specialtyId = specialtyId;
    }

    const conditions = await prisma.condition.findMany({
      where,
      select: CONDITION_SELECT,
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ conditions });
  } catch (err) {
    console.error('getAllConditions error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /conditions/:id (patient / doctor / admin) ----
async function getConditionById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid condition id.' });
    }

    const condition = await prisma.condition.findUnique({
      where: { id },
      select: CONDITION_SELECT,
    });
    if (!condition) {
      return res.status(404).json({ error: 'Condition not found.' });
    }
    return res.status(200).json({ condition });
  } catch (err) {
    console.error('getConditionById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /conditions/:id (admin only) ----
// Only the fields you send are changed. Send specialtyId: null to clear it.
async function updateCondition(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid condition id.' });
    }

    const existing = await prisma.condition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Condition not found.' });
    }

    const { name, description, causes, whenToSeekCare, specialtyId } = req.body;
    const data = {};

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) {
        return res.status(400).json({ error: 'name cannot be empty.' });
      }
      if (trimmed.length > 150) {
        return res.status(400).json({ error: 'name must be 150 characters or fewer.' });
      }
      if (trimmed !== existing.name) {
        const nameTaken = await prisma.condition.findUnique({ where: { name: trimmed } });
        if (nameTaken) {
          return res.status(409).json({ error: 'A condition with this name already exists.' });
        }
        data.name = trimmed;
      }
    }

    if (description !== undefined) data.description = description;
    if (causes !== undefined) data.causes = causes;
    if (whenToSeekCare !== undefined) data.whenToSeekCare = whenToSeekCare;

    if (specialtyId !== undefined) {
      const check = await checkSpecialty(specialtyId);
      if (!check.ok) return res.status(400).json({ error: check.error });
      data.specialtyId = check.value;
    }

    if (Object.keys(data).length === 0 && name === undefined) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const updated = await prisma.condition.update({
      where: { id },
      data,
      select: CONDITION_SELECT,
    });

    return res.status(200).json({ condition: updated });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A condition with this name already exists.' });
    }
    console.error('updateCondition error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /conditions/:id (admin only) ----
async function deleteCondition(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid condition id.' });
    }

    const existing = await prisma.condition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Condition not found.' });
    }

    // condition_symptoms and medical_articles cascade at the DB level.
    // BUT triage_rules.matched_condition_ids is a plain INTEGER[] with no foreign key,
    // so Postgres won't clean it up. We remove this id from any rule that references it
    // so rules never point at a condition that no longer exists. Done in one transaction.
    await prisma.$transaction(async (tx) => {
      const rules = await tx.triageRule.findMany({
        where: { matchedConditionIds: { has: id } },
        select: { id: true, matchedConditionIds: true },
      });

      for (const rule of rules) {
        await tx.triageRule.update({
          where: { id: rule.id },
          data: { matchedConditionIds: rule.matchedConditionIds.filter((cid) => cid !== id) },
        });
      }

      await tx.condition.delete({ where: { id } });
    });

    return res.status(200).json({ message: 'Condition deleted.' });
  } catch (err) {
    console.error('deleteCondition error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createCondition,
  getAllConditions,
  getConditionById,
  updateCondition,
  deleteCondition,
};