const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { summarize } = require('../services/rating.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- POST /doctors (admin only) ----
async function createDoctor(req, res) {
  try {
    const { name, email, password, specialtyId, bio, yearsExperience, hospitalIds } = req.body;

    if (!name || !email || !password || !specialtyId) {
      return res.status(400).json({
        error: 'name, email, password, and specialtyId are required.',
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) {
      return res.status(400).json({ error: 'specialtyId does not match a real specialty.' });
    }

    let hospitalIdList = [];
    if (hospitalIds !== undefined) {
      if (!Array.isArray(hospitalIds) || hospitalIds.some((id) => !Number.isInteger(id))) {
        return res.status(400).json({ error: 'hospitalIds must be an array of integers.' });
      }
      hospitalIdList = [...new Set(hospitalIds)];
      if (hospitalIdList.length > 0) {
        const found = await prisma.hospital.count({ where: { id: { in: hospitalIdList } } });
        if (found !== hospitalIdList.length) {
          return res.status(400).json({ error: 'hospitalIds contains an id that is not a real hospital.' });
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: 'doctor' },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialtyId,
          bio: bio ?? null,
          yearsExperience: yearsExperience ?? null,
        },
      });

      if (hospitalIdList.length > 0) {
        await tx.doctorHospital.createMany({
          data: hospitalIdList.map((hospitalId) => ({ doctorId: doctor.id, hospitalId })),
        });
      }

      return { user, doctor };
    });

    return res.status(201).json({
      doctor: {
        id: result.doctor.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        specialtyId: result.doctor.specialtyId,
        bio: result.doctor.bio,
        yearsExperience: result.doctor.yearsExperience,
        hospitalIds: hospitalIdList,
      },
    });
  } catch (err) {
    console.error('createDoctor error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctors (public) ----
async function getAllDoctors(req, res) {
  try {
    const { specialtyId } = req.query;

    const where = {};
    if (specialtyId) where.specialtyId = parseInt(specialtyId, 10);

    const doctors = await prisma.doctor.findMany({
      where,
      select: {
        id: true,
        bio: true,
        yearsExperience: true,
        specialty: { select: { id: true, name: true } },
        user: { select: { name: true } },
        hospitals: {
          select: {
            hospital: { select: { id: true, name: true } },
          },
        },
        doctorReviews: {
          where: { status: 'visible' },
          select: { rating: true },
        },
      },
    });

    const shaped = doctors.map((d) => {
      const summary = summarize(d.doctorReviews.map((r) => r.rating));
      return {
        id: d.id,
        bio: d.bio,
        yearsExperience: d.yearsExperience,
        specialty: d.specialty,
        user: d.user,
        hospitals: d.hospitals,
        avgRating: summary.average,
        reviewCount: summary.count,
      };
    });

    return res.status(200).json({ doctors: shaped });
  } catch (err) {
    console.error('getAllDoctors error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctors/:id (public) ----
async function getDoctorById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        bio: true,
        yearsExperience: true,
        specialty: { select: { id: true, name: true } },
        user: { select: { name: true } },
        hospitals: {
          select: {
            hospital: { select: { id: true, name: true, city: true } },
          },
        },
        availability: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    return res.status(200).json({ doctor });
  } catch (err) {
    console.error('getDoctorById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PATCH /doctors/:id (doctor edits own profile subset, admin edits anything) ----
async function updateDoctor(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { bio, yearsExperience, specialtyId, hospitalIds } = req.body;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const data = {};
    if (bio !== undefined) data.bio = bio;
    if (yearsExperience !== undefined) data.yearsExperience = yearsExperience;

    if (specialtyId !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can change a doctor\'s specialty.' });
      }
      const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
      if (!specialty) {
        return res.status(400).json({ error: 'specialtyId does not match a real specialty.' });
      }
      data.specialtyId = specialtyId;
    }

    let hospitalIdList;
    if (hospitalIds !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can change a doctor\'s hospitals.' });
      }
      if (!Array.isArray(hospitalIds) || hospitalIds.some((id) => !Number.isInteger(id))) {
        return res.status(400).json({ error: 'hospitalIds must be an array of integers.' });
      }
      hospitalIdList = [...new Set(hospitalIds)];
      if (hospitalIdList.length > 0) {
        const found = await prisma.hospital.count({ where: { id: { in: hospitalIdList } } });
        if (found !== hospitalIdList.length) {
          return res.status(400).json({ error: 'hospitalIds contains an id that is not a real hospital.' });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const doc = await tx.doctor.update({
        where: { id },
        data,
        select: {
          id: true,
          bio: true,
          yearsExperience: true,
          specialty: { select: { id: true, name: true } },
        },
      });

      if (hospitalIdList !== undefined) {
        await tx.doctorHospital.deleteMany({ where: { doctorId: id } });
        if (hospitalIdList.length > 0) {
          await tx.doctorHospital.createMany({
            data: hospitalIdList.map((hospitalId) => ({ doctorId: id, hospitalId })),
          });
        }
      }

      return doc;
    });

    return res.status(200).json({ doctor: updated });
  } catch (err) {
    console.error('updateDoctor error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /doctors/:id (admin only) ----
async function deleteDoctor(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    await prisma.doctor.delete({ where: { id } });

    return res.status(200).json({ message: 'Doctor deleted.' });
  } catch (err) {
    console.error('deleteDoctor error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};