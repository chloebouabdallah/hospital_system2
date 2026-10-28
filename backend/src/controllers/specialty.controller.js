const prisma = require('../lib/prisma');

// ---- POST /specialties (admin only) ----
async function createSpecialty(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const existing = await prisma.specialty.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A specialty with this name already exists.' });
    }

    const specialty = await prisma.specialty.create({
      data: { name, description: description ?? null },
    });

    return res.status(201).json({ specialty });
  } catch (err) {
    console.error('createSpecialty error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /specialties (public) ----
async function getAllSpecialties(req, res) {
  try {
    const specialties = await prisma.specialty.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ specialties });
  } catch (err) {
    console.error('getAllSpecialties error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /specialties/:id (public) ----
async function getSpecialtyById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const specialty = await prisma.specialty.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    });
    if (!specialty) {
      return res.status(404).json({ error: 'Specialty not found.' });
    }
    return res.status(200).json({ specialty });
  } catch (err) {
    console.error('getSpecialtyById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PATCH /specialties/:id (admin only) ----
async function updateSpecialty(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;

    const existing = await prisma.specialty.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Specialty not found.' });
    }

    const data = {};

    if (name !== undefined && name !== existing.name) {
      const nameTaken = await prisma.specialty.findUnique({ where: { name } });
      if (nameTaken) {
        return res.status(409).json({ error: 'A specialty with this name already exists.' });
      }
      data.name = name;
    }
    if (description !== undefined) data.description = description;

    const updated = await prisma.specialty.update({
      where: { id },
      data,
      select: { id: true, name: true, description: true },
    });

    return res.status(200).json({ specialty: updated });
  } catch (err) {
    console.error('updateSpecialty error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /specialties/:id (admin only) ----
async function deleteSpecialty(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.specialty.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Specialty not found.' });
    }

    // Guard rail: your schema has doctors.specialty_id and conditions.specialty_id
    // as nullable FKs with NO ACTION (not CASCADE) — so Postgres will reject this
    // delete anyway if doctors/conditions still reference it. We check first so
    // the error is clear instead of a raw Prisma FK-violation message.
    const [doctorCount, conditionCount] = await Promise.all([
      prisma.doctor.count({ where: { specialtyId: id } }),
      prisma.condition.count({ where: { specialtyId: id } }),
    ]);

    if (doctorCount > 0 || conditionCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${doctorCount} doctor(s) and ${conditionCount} condition(s) still reference this specialty. Reassign them first.`,
      });
    }

    await prisma.specialty.delete({ where: { id } });

    return res.status(200).json({ message: 'Specialty deleted.' });
  } catch (err) {
    console.error('deleteSpecialty error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createSpecialty,
  getAllSpecialties,
  getSpecialtyById,
  updateSpecialty,
  deleteSpecialty,
};