const prisma = require('../lib/prisma');
const {
  isAlignedToSlot,
  findMatchingAvailability,
  findConflictingAppointment,
} = require('../services/availability.service');

const APPT_SELECT = {
  id: true,
  dateTime: true,
  status: true,
  notes: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      medicalNotes: true,
    },
  },
  doctor: {
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      user: { select: { name: true } },
      specialty: { select: { id: true, name: true } },
    },
  },
  hospital: { select: { id: true, name: true, city: true } },
};

// Status transition guards:
//   pending   -> confirmed | cancelled
//   confirmed -> completed | cancelled
//   cancelled -> (terminal)
//   completed -> (terminal)
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
};

// Reused by list + get + status changes.
// Returns the doctor row for a logged-in doctor user, or null.
async function getDoctorRowForUser(userId) {
  return prisma.doctor.findUnique({ where: { userId } });
}

// ---- POST /appointments ----
// Patient books own appointment. Admin can book for any patient.
async function createAppointment(req, res) {
  try {
    const { doctorId, hospitalId, dateTime } = req.body;
    let { patientId } = req.body;

    // Who is the patient? Self by default; admin can override.
    if (req.user.role === 'admin') {
      patientId = patientId !== undefined ? patientId : req.user.id;
    } else if (req.user.role === 'patient') {
      patientId = req.user.id;
    } else {
      return res.status(403).json({ error: 'Only patients and admins can create appointments.' });
    }

    if (
      !Number.isInteger(doctorId) ||
      !Number.isInteger(hospitalId) ||
      !dateTime ||
      !Number.isInteger(patientId)
    ) {
      return res.status(400).json({
        error: 'doctorId, hospitalId (integers), dateTime (ISO), and a valid patient are required.',
      });
    }

    const when = new Date(dateTime);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'dateTime is not a valid ISO date.' });
    }
    if (when.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'dateTime must be in the future.' });
    }
    if (!isAlignedToSlot(when)) {
      return res.status(400).json({
        error: 'dateTime must be aligned to a 45-minute slot (e.g. 09:00, 09:45, 10:30).',
      });
    }

    const [patient, doctor, hospital] = await Promise.all([
      prisma.user.findUnique({ where: { id: patientId } }),
      prisma.doctor.findUnique({ where: { id: doctorId } }),
      prisma.hospital.findUnique({ where: { id: hospitalId } }),
    ]);
    if (!patient || patient.role !== 'patient') {
      return res.status(400).json({ error: 'patientId does not match a real patient.' });
    }
    if (!doctor) return res.status(400).json({ error: 'doctorId does not match a real doctor.' });
    if (!hospital) return res.status(400).json({ error: 'hospitalId does not match a real hospital.' });

    const block = await findMatchingAvailability({ doctorId, hospitalId, dateTime: when });
    if (!block) {
      return res.status(400).json({ error: 'The doctor is not available at this hospital on this day/time.' });
    }

    const clash = await findConflictingAppointment({ doctorId, dateTime: when });
    if (clash) {
      return res.status(409).json({ error: 'That slot is already booked for this doctor.' });
    }

    const appt = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        hospitalId,
        dateTime: when,
        status: 'pending',
        notes: typeof req.body.notes === 'string' ? req.body.notes : null,
      },
      select: APPT_SELECT,
    });

    return res.status(201).json({ appointment: appt });
  } catch (err) {
    console.error('createAppointment error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /appointments ----
// Role-scoped: patient = own, doctor = assigned to them, admin = all.
// Query: ?status=, ?upcoming=true
async function listAppointments(req, res) {
  try {
    const where = {};

    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await getDoctorRowForUser(req.user.id);
      if (!doctor) return res.status(403).json({ error: 'No doctor profile linked to this account.' });
      where.doctorId = doctor.id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}.` });
      }
      where.status = req.query.status;
    }

    const upcoming = req.query.upcoming === 'true' || req.query.upcoming === '1';
    if (upcoming) where.dateTime = { gte: new Date() };

    const orderBy = { dateTime: upcoming ? 'asc' : 'desc' };

    const appointments = await prisma.appointment.findMany({
      where,
      select: APPT_SELECT,
      orderBy,
    });
    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('listAppointments error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /appointments/:id ----
// Owner check: patient who booked it, assigned doctor, or admin.
async function getAppointmentById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid appointment id.' });

    const appt = await prisma.appointment.findUnique({ where: { id }, select: APPT_SELECT });
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    if (req.user.role === 'admin') return res.status(200).json({ appointment: appt });

    if (req.user.role === 'patient') {
      if (appt.patient.id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to do this.' });
      }
      return res.status(200).json({ appointment: appt });
    }

    if (req.user.role === 'doctor') {
      const doctor = await getDoctorRowForUser(req.user.id);
      if (!doctor || doctor.id !== appt.doctor.id) {
        return res.status(403).json({ error: 'You do not have permission to do this.' });
      }
      return res.status(200).json({ appointment: appt });
    }

    return res.status(403).json({ error: 'You do not have permission to do this.' });
  } catch (err) {
    console.error('getAppointmentById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// Shared helper: load appt, check the caller is allowed, check transition.
async function transitionStatus(req, res, targetStatus) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid appointment id.' });

  const appt = await prisma.appointment.findUnique({ where: { id }, select: APPT_SELECT });
  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

  // Who can perform which transition?
  //   cancel  : owning patient OR the doctor OR admin
  //   confirm : the doctor OR admin
  //   complete: the doctor OR admin
  const isAdmin = req.user.role === 'admin';
  const isOwningPatient = req.user.role === 'patient' && appt.patient.id === req.user.id;
  let isAssignedDoctor = false;
  if (req.user.role === 'doctor') {
    const doctor = await getDoctorRowForUser(req.user.id);
    isAssignedDoctor = !!doctor && doctor.id === appt.doctor.id;
  }

  if (targetStatus === 'cancelled') {
    if (!isAdmin && !isOwningPatient && !isAssignedDoctor) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }
  } else {
    // confirmed / completed → doctor or admin only
    if (!isAdmin && !isAssignedDoctor) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }
  }

  const allowed = ALLOWED_TRANSITIONS[appt.status] || [];
  if (!allowed.includes(targetStatus)) {
    return res.status(409).json({
      error: `Cannot change status from "${appt.status}" to "${targetStatus}".`,
    });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: targetStatus },
    select: APPT_SELECT,
  });

  return res.status(200).json({ appointment: updated });
}

async function cancelAppointment(req, res) {
  return transitionStatus(req, res, 'cancelled');
}

async function confirmAppointment(req, res) {
  return transitionStatus(req, res, 'confirmed');
}

async function completeAppointment(req, res) {
  return transitionStatus(req, res, 'completed');
}

module.exports = {
  createAppointment,
  listAppointments,
  getAppointmentById,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
};