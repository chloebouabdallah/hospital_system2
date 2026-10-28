const prisma = require('../lib/prisma');
const { rankByDistance } = require('../utils/geo');

const HOSPITAL_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  phone: true,
  latitude: true,
  longitude: true,
};

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Accepts 33.89 or "33.89". Anything else (null, "", "abc", NaN, Infinity) -> null.
function toNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

// Reads + validates hospital fields from a request body.
// partial=false (create): name, city, latitude, longitude are required.
// partial=true  (update): only the fields that were sent are checked.
// Returns { data } or { error }.
function readHospitalFields(body, partial) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return { error: 'name is required.' };
    if (name.length > 150) return { error: 'name must be 150 characters or fewer.' };
    data.name = name;
  }

  if (!partial || body.city !== undefined) {
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    if (!city) return { error: 'city is required.' };
    if (city.length > 100) return { error: 'city must be 100 characters or fewer.' };
    data.city = city;
  }

  for (const [field, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
    if (!partial || body[field] !== undefined) {
      const n = toNumber(body[field]);
      if (n === null) return { error: `${field} is required and must be a number.` };
      if (n < min || n > max) return { error: `${field} must be between ${min} and ${max}.` };
      data[field] = n;
    }
  }

  if (body.address !== undefined) {
    if (body.address !== null && typeof body.address !== 'string') {
      return { error: 'address must be a string or null.' };
    }
    data.address = body.address === null ? null : body.address.trim() || null;
  }

  if (body.phone !== undefined) {
    if (body.phone !== null && typeof body.phone !== 'string') {
      return { error: 'phone must be a string or null.' };
    }
    const phone = body.phone === null ? null : body.phone.trim() || null;
    if (phone && phone.length > 30) return { error: 'phone must be 30 characters or fewer.' };
    data.phone = phone;
  }

  return { data };
}

// ---- POST /hospitals (admin only) ----
async function createHospital(req, res) {
  try {
    const { data, error } = readHospitalFields(req.body, false);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.hospital.findUnique({
      where: { name_city: { name: data.name, city: data.city } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A hospital with this name already exists in this city.' });
    }

    const hospital = await prisma.hospital.create({ data, select: HOSPITAL_SELECT });
    return res.status(201).json({ hospital });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A hospital with this name already exists in this city.' });
    }
    console.error('createHospital error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /hospitals (public) ----
// Optional filter: ?city=Beirut (case-insensitive)
async function getAllHospitals(req, res) {
  try {
    const where = {};
    if (typeof req.query.city === 'string' && req.query.city.trim()) {
      where.city = { equals: req.query.city.trim(), mode: 'insensitive' };
    }

    const rows = await prisma.hospital.findMany({
      where,
      select: { ...HOSPITAL_SELECT, _count: { select: { doctors: true } } },
      orderBy: { name: 'asc' },
    });

    const hospitals = rows.map(({ _count, ...h }) => ({ ...h, doctorCount: _count.doctors }));
    return res.status(200).json({ hospitals });
  } catch (err) {
    console.error('getAllHospitals error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /hospitals/nearby (public) ----
// ?lat=33.89&lng=35.50            required
// &radiusKm=25                    optional (default 25, max 500)
// &limit=20                       optional (default 20, max 100)
// &specialtyId=2                  optional: only hospitals that have a doctor of this specialty
// Returns hospitals sorted nearest-first, each with distanceKm and doctorCount
// (doctorCount only counts doctors of that specialty when specialtyId is given).
async function getNearbyHospitals(req, res) {
  try {
    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    if (lat === null || lng === null) {
      return res.status(400).json({ error: 'lat and lng query parameters are required and must be numbers.' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'lat must be between -90 and 90, and lng between -180 and 180.' });
    }

    let radiusKm = DEFAULT_RADIUS_KM;
    if (req.query.radiusKm !== undefined) {
      radiusKm = toNumber(req.query.radiusKm);
      if (radiusKm === null || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
        return res.status(400).json({ error: `radiusKm must be a number greater than 0 and at most ${MAX_RADIUS_KM}.` });
      }
    }

    let limit = DEFAULT_LIMIT;
    if (req.query.limit !== undefined) {
      limit = toNumber(req.query.limit);
      if (limit === null || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res.status(400).json({ error: `limit must be a whole number between 1 and ${MAX_LIMIT}.` });
      }
    }

    let specialtyId;
    if (req.query.specialtyId !== undefined) {
      specialtyId = toNumber(req.query.specialtyId);
      if (specialtyId === null || !Number.isInteger(specialtyId)) {
        return res.status(400).json({ error: 'specialtyId must be an integer.' });
      }
    }

    const doctorFilter = specialtyId !== undefined ? { doctor: { specialtyId } } : {};

    const rows = await prisma.hospital.findMany({
      where: specialtyId !== undefined ? { doctors: { some: doctorFilter } } : {},
      select: HOSPITAL_SELECT,
    });

    const nearby = rankByDistance(rows, lat, lng, radiusKm, limit);

    // Doctor counts for just the hospitals we are returning (one grouped query).
    const counts = nearby.length
      ? await prisma.doctorHospital.groupBy({
          by: ['hospitalId'],
          where: { hospitalId: { in: nearby.map((h) => h.id) }, ...doctorFilter },
          _count: { _all: true },
        })
      : [];
    const countByHospital = new Map(counts.map((c) => [c.hospitalId, c._count._all]));

    return res.status(200).json({
      searchedFrom: { lat, lng, radiusKm },
      hospitals: nearby.map((h) => ({ ...h, doctorCount: countByHospital.get(h.id) || 0 })),
    });
  } catch (err) {
    console.error('getNearbyHospitals error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /hospitals/:id (public) ----
// The hospital plus the doctors who work there. Optional filter: ?specialtyId=2
// Emails/password hashes are never exposed (same rule as GET /doctors).
async function getHospitalById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hospital id.' });
    }

    let doctorWhere = {};
    if (req.query.specialtyId !== undefined) {
      const specialtyId = toNumber(req.query.specialtyId);
      if (specialtyId === null || !Number.isInteger(specialtyId)) {
        return res.status(400).json({ error: 'specialtyId must be an integer.' });
      }
      doctorWhere = { doctor: { specialtyId } };
    }

    const row = await prisma.hospital.findUnique({
      where: { id },
      select: {
        ...HOSPITAL_SELECT,
        doctors: {
          where: doctorWhere,
          select: {
            doctor: {
              select: {
                id: true,
                bio: true,
                yearsExperience: true,
                specialty: { select: { id: true, name: true } },
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!row) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    const { doctors, ...hospital } = row;
    return res.status(200).json({
      hospital: {
        ...hospital,
        doctors: doctors.map(({ doctor }) => ({
          id: doctor.id,
          name: doctor.user?.name ?? null,
          bio: doctor.bio,
          yearsExperience: doctor.yearsExperience,
          specialty: doctor.specialty,
        })),
      },
    });
  } catch (err) {
    console.error('getHospitalById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /hospitals/:id (admin only) ----
// Partial update: only the fields you send change. Send address/phone as null to clear them.
async function updateHospital(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hospital id.' });
    }

    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    const { data, error } = readHospitalFields(req.body, true);
    if (error) return res.status(400).json({ error });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const newName = data.name ?? existing.name;
    const newCity = data.city ?? existing.city;
    if (newName !== existing.name || newCity !== existing.city) {
      const taken = await prisma.hospital.findUnique({
        where: { name_city: { name: newName, city: newCity } },
      });
      if (taken && taken.id !== id) {
        return res.status(409).json({ error: 'A hospital with this name already exists in this city.' });
      }
    }

    const updated = await prisma.hospital.update({ where: { id }, data, select: HOSPITAL_SELECT });
    return res.status(200).json({ hospital: updated });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A hospital with this name already exists in this city.' });
    }
    console.error('updateHospital error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /hospitals/:id (admin only) ----
async function deleteHospital(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid hospital id.' });
    }

    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    // Guard rail (same idea as deleteSpecialty): appointments.hospital_id has no cascade, so
    // Postgres would reject the delete anyway. Check first for a clear message.
    const appointmentCount = await prisma.appointment.count({ where: { hospitalId: id } });
    if (appointmentCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${appointmentCount} appointment(s) are booked at this hospital.`,
      });
    }

    // doctor_hospitals and this hospital's availability rows cascade at the DB level.
    await prisma.hospital.delete({ where: { id } });

    return res.status(200).json({ message: 'Hospital deleted.' });
  } catch (err) {
    console.error('deleteHospital error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createHospital,
  getAllHospitals,
  getNearbyHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
};