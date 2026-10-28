const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize, isAssignedDoctorOrAdmin } = require('../middleware/auth');
const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctor.controller');
const { getAvailableSlots } = require('../controllers/availability.controller');
const { getDoctorReviews } = require('../controllers/review.controller');

// ⚠️ Order matters: literal paths BEFORE parameterized ones.
// Otherwise Express matches "/me" as :id = "me".

// GET /doctors/me — the logged-in doctor's own profile
router.get('/me', authenticate, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can access this.' });
  }
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        bio: true,
        yearsExperience: true,
        specialty: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            address: true,
          },
        },
        hospitals: {
          select: { hospital: { select: { id: true, name: true, city: true } } },
        },
      },
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });
    return res.status(200).json({ doctor });
  } catch (err) {
    console.error('getMyDoctorProfile error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Public reads
router.get('/', getAllDoctors);
router.get('/:id/available-slots', getAvailableSlots);
router.get('/:id/reviews', getDoctorReviews);
router.get('/:id', getDoctorById);

// Admin / ownership-protected writes
router.post('/', authenticate, authorize('admin'), createDoctor);
router.patch('/:id', authenticate, isAssignedDoctorOrAdmin, updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

module.exports = router;