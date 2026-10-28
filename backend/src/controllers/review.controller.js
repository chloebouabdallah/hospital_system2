const prisma = require('../lib/prisma');
const { parseRating, summarize } = require('../services/rating.service');

const REVIEW_SELECT = {
  id: true,
  appointmentId: true,
  rating: true,
  comment: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

async function getOwnDoctor(userId) {
  return prisma.doctor.findUnique({ where: { userId } });
}

// Privacy: "Sara Khalil" -> "Sara K.", single name stays as-is.
function displayName(fullName) {
  if (!fullName) return 'Verified patient';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ---- POST /appointments/:id/review ----
async function createReview(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (Number.isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment id.' });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, patientId: true, doctorId: true, status: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    if (req.user.role !== 'patient' || appt.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Only the patient who had this appointment can review it.' });
    }

    if (appt.status !== 'completed') {
      return res.status(409).json({ error: 'You can only review a completed appointment.' });
    }

    const existing = await prisma.doctorReview.findUnique({
      where: { appointmentId },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'This appointment already has a review.' });
    }

    const rating = parseRating(req.body.rating);
    if (rating === null) {
      return res.status(400).json({ error: 'rating must be an integer from 1 to 5.' });
    }

    const comment =
      typeof req.body.comment === 'string' && req.body.comment.trim()
        ? req.body.comment.trim().slice(0, 2000)
        : null;

    const review = await prisma.doctorReview.create({
      data: {
        appointmentId,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        rating,
        comment,
      },
      select: REVIEW_SELECT,
    });

    return res.status(201).json({ review });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This appointment already has a review.' });
    }
    console.error('createReview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /appointments/:id/review (owner patient, assigned doctor, or admin) ----
async function getReviewForAppointment(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (Number.isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment id.' });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, patientId: true, doctorId: true },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    const allowed =
      req.user.role === 'admin' ||
      (req.user.role === 'patient' && appt.patientId === req.user.id) ||
      (req.user.role === 'doctor' && (await getOwnDoctor(req.user.id))?.id === appt.doctorId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    const review = await prisma.doctorReview.findUnique({
      where: { appointmentId },
      select: REVIEW_SELECT,
    });
    if (!review) return res.status(404).json({ error: 'This appointment has no review yet.' });
    return res.status(200).json({ review });
  } catch (err) {
    console.error('getReviewForAppointment error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PUT /appointments/:id/review (owning patient) ----
async function updateReview(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (Number.isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment id.' });
    }

    const review = await prisma.doctorReview.findUnique({ where: { appointmentId } });
    if (!review) return res.status(404).json({ error: 'This appointment has no review yet.' });

    if (req.user.role !== 'patient' || review.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Only the patient who wrote this review can edit it.' });
    }

    const data = {};
    if (req.body.rating !== undefined) {
      const rating = parseRating(req.body.rating);
      if (rating === null) {
        return res.status(400).json({ error: 'rating must be an integer from 1 to 5.' });
      }
      data.rating = rating;
    }
    if (req.body.comment !== undefined) {
      data.comment =
        typeof req.body.comment === 'string' && req.body.comment.trim()
          ? req.body.comment.trim().slice(0, 2000)
          : null;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    const updated = await prisma.doctorReview.update({
      where: { appointmentId },
      data,
      select: REVIEW_SELECT,
    });
    return res.status(200).json({ review: updated });
  } catch (err) {
    console.error('updateReview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /appointments/:id/review (owning patient or admin) ----
async function deleteReview(req, res) {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (Number.isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment id.' });
    }

    const review = await prisma.doctorReview.findUnique({ where: { appointmentId } });
    if (!review) return res.status(404).json({ error: 'This appointment has no review yet.' });

    const isOwner = req.user.role === 'patient' && review.patientId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }

    await prisma.doctorReview.delete({ where: { appointmentId } });
    return res.status(200).json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('deleteReview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /doctors/:id/reviews (public) ----
async function getDoctorReviews(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (Number.isNaN(doctorId)) return res.status(400).json({ error: 'Invalid doctor id.' });

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const [reviews, total, allRatings] = await Promise.all([
      prisma.doctorReview.findMany({
        where: { doctorId, status: 'visible' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          patient: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.doctorReview.count({ where: { doctorId, status: 'visible' } }),
      prisma.doctorReview.findMany({
        where: { doctorId, status: 'visible' },
        select: { rating: true },
      }),
    ]);

    const summary = summarize(allRatings.map((r) => r.rating));

    return res.status(200).json({
      doctorId,
      summary: { average: summary.average, count: summary.count },
      pagination: { limit, offset, total },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        authorDisplay: displayName(r.patient?.name),
      })),
    });
  } catch (err) {
    console.error('getDoctorReviews error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /admin/reviews (admin only) ----
// Returns every review, visible AND hidden, with patient + doctor resolved.
async function getAllReviews(req, res) {
  try {
    const reviews = await prisma.doctorReview.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
        appointmentId: true,
        patient: { select: { id: true, name: true } },
        doctor: {
          select: {
            id: true,
            user: { select: { name: true } },
            specialty: { select: { name: true } },
          },
        },
      },
    });

    const shaped = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
      appointmentId: r.appointmentId,
      patient: r.patient,
      doctor: {
        id: r.doctor.id,
        name: r.doctor.user?.name ?? 'Unknown',
        specialty: r.doctor.specialty?.name ?? null,
      },
    }));

    return res.status(200).json({ reviews: shaped });
  } catch (err) {
    console.error('getAllReviews error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PATCH /doctor-reviews/:id/hide (admin) ----
async function moderateReview(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid review id.' });

    const review = await prisma.doctorReview.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    if (typeof req.body.hidden !== 'boolean') {
      return res.status(400).json({ error: 'hidden must be true or false.' });
    }
    const status = req.body.hidden ? 'hidden' : 'visible';

    const updated = await prisma.doctorReview.update({
      where: { id },
      data: { status },
      select: REVIEW_SELECT,
    });
    return res.status(200).json({ review: updated });
  } catch (err) {
    console.error('moderateReview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = {
  createReview,
  getReviewForAppointment,
  updateReview,
  deleteReview,
  getDoctorReviews,
  getAllReviews,
  moderateReview,
};