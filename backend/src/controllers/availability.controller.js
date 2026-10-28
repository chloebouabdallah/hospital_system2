const prisma = require('../lib/prisma');
const { listSlots, SLOT_MINUTES } = require('../services/availability.service');

const AVAIL_SELECT = {
  id: true,
  doctorId: true,
  hospitalId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  isAvailable: true,
  doctor: {
    select: {
      id: true,
      user: { select: { name: true } },
      specialty: { select: { id: true, name: true } },
    },
  },
  hospital: { select: { id: true, name: true, city: true } },
};

// Parses "HH:MM" into a Date on 1970-01-01 UTC. Returns null if invalid.
function parseTime(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  const d = new Date('1970-01-01T00:00:00Z');
  d.setUTCHours(h, min, 0, 0);
  return d;
}

// Returns the doctor row owned by this user (used for ownership checks), or null.
async function getOwnDoctor(userId) {
  return prisma.doctor.findUnique({ where: { userId } });
}

// Admin or the owning doctor.
async function callerCanManageAvailability(req, doctorId) {
  if (req.user.role === 'admin') return true;
  if (req.user.role !== 'doctor') return false;
  const own = await getOwnDoctor(req.user.id);
  return !!own && own.id === doctorId;
}

// ---- POST /doctor-availability (admin or the doctor themselves) ----
async function createAvailability(req, res) {
  try {
    const { doctorId, hospitalId, dayOfWeek, startTime, endTime, isAvailable } = req.body;

    if (
      !Number.isInteger(doctorId) ||
      !Number.isInteger(hospitalId) ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      return res.status(400).json({ error: 'doctorId, hospitalId (integers), and dayOfWeek (0-6) are required.' });
    }

    if (!(await callerCanManageAvailability(req, doctorId))) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (!start || !end) {
      return res.status(400).json({ error: 'startTime and endTime must be "HH:MM".' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endTime must be after startTime.' });
    }

    const [doctor, hospital] = await Promise.all([
      prisma.doctor.findUnique({ where: { id: doctorId } }),
      prisma.hospital.findUnique({ where: { id: hospitalId } }),
    ]);
    if (!doctor) return res.status(400).json({ error: 'doctorId does not match a real doctor.' });
    if (!hospital) return res.status(400).json({ error: 'hospitalId does not match a real hospital.' });

    const row = await prisma.doctorAvailability.create({
      data: {
        doctorId,
        hospitalId,
        dayOfWeek,
        startTime: start,
        endTime: end,
        isAvailable: isAvailable !== false,
      },
      select: AVAIL_SELECT,
    });

    return res.status(201).json({ availability: row });
  } catch (err) {
    console.error('createAvailability error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctor-availability (any logged-in role) ----
// Optional filters: ?doctorId=, ?hospitalId=
async function listAvailability(req, res) {
  try {
    const where = {};
    if (req.query.doctorId !== undefined) {
      const id = parseInt(req.query.doctorId, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid doctorId.' });
      where.doctorId = id;
    }
    if (req.query.hospitalId !== undefined) {
      const id = parseInt(req.query.hospitalId, 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid hospitalId.' });
      where.hospitalId = id;
    }

    const rows = await prisma.doctorAvailability.findMany({
      where,
      select: AVAIL_SELECT,
      orderBy: [{ doctorId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return res.status(200).json({ availability: rows });
  } catch (err) {
    console.error('listAvailability error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctor-availability/:id (any logged-in role) ----
async function getAvailabilityById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid availability id.' });

    const row = await prisma.doctorAvailability.findUnique({ where: { id }, select: AVAIL_SELECT });
    if (!row) return res.status(404).json({ error: 'Availability block not found.' });
    return res.status(200).json({ availability: row });
  } catch (err) {
    console.error('getAvailabilityById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /doctor-availability/:id (admin or owning doctor) ----
async function updateAvailability(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid availability id.' });

    const existing = await prisma.doctorAvailability.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Availability block not found.' });

    if (!(await callerCanManageAvailability(req, existing.doctorId))) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    const { dayOfWeek, startTime, endTime, isAvailable, hospitalId } = req.body;
    const data = {};

    if (dayOfWeek !== undefined) {
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: 'dayOfWeek must be an integer between 0 and 6.' });
      }
      data.dayOfWeek = dayOfWeek;
    }

    if (hospitalId !== undefined) {
      if (!Number.isInteger(hospitalId)) {
        return res.status(400).json({ error: 'hospitalId must be an integer.' });
      }
      const h = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (!h) return res.status(400).json({ error: 'hospitalId does not match a real hospital.' });
      data.hospitalId = hospitalId;
    }

    if (startTime !== undefined) {
      const t = parseTime(startTime);
      if (!t) return res.status(400).json({ error: 'startTime must be "HH:MM".' });
      data.startTime = t;
    }
    if (endTime !== undefined) {
      const t = parseTime(endTime);
      if (!t) return res.status(400).json({ error: 'endTime must be "HH:MM".' });
      data.endTime = t;
    }
    if (isAvailable !== undefined) {
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ error: 'isAvailable must be true or false.' });
      }
      data.isAvailable = isAvailable;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const finalStart = data.startTime || existing.startTime;
    const finalEnd = data.endTime || existing.endTime;
    if (finalEnd <= finalStart) {
      return res.status(400).json({ error: 'endTime must be after startTime.' });
    }

    const updated = await prisma.doctorAvailability.update({
      where: { id },
      data,
      select: AVAIL_SELECT,
    });
    return res.status(200).json({ availability: updated });
  } catch (err) {
    console.error('updateAvailability error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /doctor-availability/:id (admin or owning doctor) ----
async function deleteAvailability(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid availability id.' });

    const existing = await prisma.doctorAvailability.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Availability block not found.' });

    if (!(await callerCanManageAvailability(req, existing.doctorId))) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    await prisma.doctorAvailability.delete({ where: { id } });
    return res.status(200).json({ message: 'Availability block deleted.' });
  } catch (err) {
    console.error('deleteAvailability error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctors/:id/available-slots?date=YYYY-MM-DD&hospitalId=N ----
// Public (or authenticated — pick one; keeping it public since doctors are public).
// Returns the bookable 45-min slots for that doctor on that date at that hospital.
async function getAvailableSlots(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (Number.isNaN(doctorId)) {
      return res.status(400).json({ error: 'Invalid doctor id.' });
    }

    const { date, hospitalId } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query parameter is required, format YYYY-MM-DD.' });
    }
    const hid = parseInt(hospitalId, 10);
    if (Number.isNaN(hid)) {
      return res.status(400).json({ error: 'hospitalId query parameter is required.' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const hospital = await prisma.hospital.findUnique({ where: { id: hid } });
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });

    const day = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) {
      return res.status(400).json({ error: 'Invalid date.' });
    }

    const slots = await listSlots({ doctorId, hospitalId: hid, date: day });

    return res.status(200).json({
      doctorId,
      hospitalId: hid,
      date,
      slotMinutes: SLOT_MINUTES,
      slots,
    });
  } catch (err) {
    console.error('getAvailableSlots error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createAvailability,
  listAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  getAvailableSlots,
};