const prisma = require('../lib/prisma');
const { summarize } = require('../services/rating.service');

// ---- GET /doctor/overview ----
// Everything the doctor dashboard needs, in one call.
async function getDoctorOverview(req, res) {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this.' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        bio: true,
        yearsExperience: true,
        specialty: { select: { id: true, name: true } },
        user: { select: { name: true } },
        hospitals: {
          select: { hospital: { select: { id: true, name: true } } },
        },
        availability: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
            hospital: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Last 6 months bucket boundaries
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      pendingCount,
      upcomingCount,
      completedCount,
      totalCount,
      statusGroups,
      appointmentsForTrend,
      uniquePatients,
      reviewRows,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { doctorId: doctor.id, status: 'pending' },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          status: { in: ['pending', 'confirmed'] },
          dateTime: { gte: startOfToday },
        },
      }),
      prisma.appointment.count({
        where: { doctorId: doctor.id, status: 'completed' },
      }),
      prisma.appointment.count({ where: { doctorId: doctor.id } }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: { doctorId: doctor.id },
        _count: { _all: true },
      }),
      prisma.appointment.findMany({
        where: { doctorId: doctor.id, dateTime: { gte: sixMonthsAgo } },
        select: { dateTime: true },
      }),
      prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
      prisma.doctorReview.findMany({
        where: { doctorId: doctor.id, status: 'visible' },
        select: { rating: true, createdAt: true },
      }),
    ]);

    // Appointments per month (last 6 months)
    const monthBuckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthBuckets.push({
        key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        value: 0,
      });
    }
    for (const a of appointmentsForTrend) {
      const dt = new Date(a.dateTime);
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBuckets.find((b) => b.key === key);
      if (bucket) bucket.value += 1;
    }

    // Status breakdown
    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
    const statusBreakdown = [
      { status: 'pending', value: statusMap.pending ?? 0 },
      { status: 'confirmed', value: statusMap.confirmed ?? 0 },
      { status: 'completed', value: statusMap.completed ?? 0 },
      { status: 'cancelled', value: statusMap.cancelled ?? 0 },
    ];

    // Rating summary
    const ratingSummary = summarize(reviewRows.map((r) => r.rating));

    // Rating distribution (1..5)
    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      stars: star,
      value: reviewRows.filter((r) => r.rating === star).length,
    }));

    return res.status(200).json({
      doctor: {
        id: doctor.id,
        name: doctor.user?.name,
        specialty: doctor.specialty?.name ?? null,
        bio: doctor.bio,
        yearsExperience: doctor.yearsExperience,
        hospitals: doctor.hospitals.map((h) => h.hospital),
      },
      schedule: doctor.availability,
      counts: {
        pending: pendingCount,
        upcoming: upcomingCount,
        completed: completedCount,
        total: totalCount,
        patients: uniquePatients.length,
        reviews: ratingSummary.count,
      },
      averageRating: ratingSummary.average,
      charts: {
        appointmentsPerMonth: monthBuckets.map(({ key, ...rest }) => rest),
        statusBreakdown,
        ratingDistribution: distribution,
      },
    });
  } catch (err) {
    console.error('getDoctorOverview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getDoctorOverview };