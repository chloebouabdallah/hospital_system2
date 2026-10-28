const prisma = require('../lib/prisma');
const { summarize } = require('../services/rating.service');

// ---- GET /admin/overview (admin only) ----
// One request returns everything the admin dashboard needs:
// totals, appointments by status, doctors by specialty,
// recent appointments, and top-rated doctors.
async function getOverview(req, res) {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalHospitals,
      totalAppointments,
      totalReviews,
      statusGroups,
      specialties,
      doctors,
      recentAppointments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'patient' } }),
      prisma.doctor.count(),
      prisma.hospital.count(),
      prisma.appointment.count(),
      prisma.doctorReview.count(),
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.specialty.findMany({ select: { id: true, name: true } }),
      prisma.doctor.findMany({
        select: {
          id: true,
          specialtyId: true,
          user: { select: { name: true } },
          specialty: { select: { name: true } },
          doctorReviews: { select: { rating: true } },
        },
      }),
      prisma.appointment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          dateTime: true,
          status: true,
          patient: { select: { name: true } },
          doctor: { select: { user: { select: { name: true } } } },
          hospital: { select: { name: true } },
        },
      }),
    ]);

    // Appointments by status — always include all four, even if zero.
    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
    const appointmentsByStatus = {
      pending: statusMap.pending ?? 0,
      confirmed: statusMap.confirmed ?? 0,
      completed: statusMap.completed ?? 0,
      cancelled: statusMap.cancelled ?? 0,
    };

    // Doctors per specialty — one row per specialty, even if 0 doctors.
    const doctorsBySpecialty = specialties.map((s) => ({
      specialty: s.name,
      count: doctors.filter((d) => d.specialtyId === s.id).length,
    }));

    // Top-rated doctors: summarize each, sort by average then count, take top 5.
    const topDoctors = doctors
      .map((d) => {
        const ratings = d.doctorReviews.map((r) => r.rating);
        const summary = summarize(ratings);
        return {
          id: d.id,
          name: d.user?.name ?? 'Unknown',
          specialty: d.specialty?.name ?? null,
          avgRating: summary.average,
          reviewCount: summary.count,
        };
      })
      .filter((d) => d.reviewCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 5);

    return res.status(200).json({
      totals: {
        users: totalUsers,
        patients: totalPatients,
        doctors: totalDoctors,
        hospitals: totalHospitals,
        appointments: totalAppointments,
        reviews: totalReviews,
      },
      appointmentsByStatus,
      doctorsBySpecialty,
      recentAppointments,
      topDoctors,
    });
  } catch (err) {
    console.error('getOverview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getOverview };