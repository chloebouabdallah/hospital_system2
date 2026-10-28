const prisma = require('../lib/prisma');

// ---- GET /patient/overview ----
// One call returns everything the patient dashboard needs:
//   - KPI counts (upcoming, completed, total, doctors, hospitals)
//   - the next upcoming appointment (with doctor + hospital details)
//   - a live list of symptoms for the quick-pick row
//   - chart data: appointments per month, status breakdown, doctors seen
async function getPatientOverview(req, res) {
  try {
    const patientId = req.user.id;
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // Last 6 months (including current) for the trend chart
    const sixMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)
    );

    const [
      upcomingCount,
      completedCount,
      totalAppointments,
      nextAppointment,
      symptoms,
      doctorCount,
      hospitalCount,
      statusGroups,
      appointmentsForTrend,
      appointmentsForDoctors,
    ] = await Promise.all([
      // Upcoming: pending or confirmed, in the future
      prisma.appointment.count({
        where: {
          patientId,
          status: { in: ['pending', 'confirmed'] },
          dateTime: { gte: startOfToday },
        },
      }),
      // Completed visits
      prisma.appointment.count({ where: { patientId, status: 'completed' } }),
      // Total (any status)
      prisma.appointment.count({ where: { patientId } }),

      // Next upcoming appointment
      prisma.appointment.findFirst({
        where: {
          patientId,
          status: { in: ['pending', 'confirmed'] },
          dateTime: { gte: startOfToday },
        },
        orderBy: { dateTime: 'asc' },
        select: {
          id: true,
          dateTime: true,
          status: true,
          doctor: {
            select: {
              id: true,
              user: { select: { name: true } },
              specialty: { select: { name: true } },
            },
          },
          hospital: { select: { id: true, name: true, city: true } },
        },
      }),

      // Symptoms for the quick-pick row
      prisma.symptom.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),

      // Public counts (doctors + hospitals)
      prisma.doctor.count(),
      prisma.hospital.count(),

      // Status breakdown (all time)
      prisma.appointment.groupBy({
        by: ['status'],
        where: { patientId },
        _count: { _all: true },
      }),

      // Raw appointment times for the last-6-months trend
      prisma.appointment.findMany({
        where: { patientId, dateTime: { gte: sixMonthsAgo } },
        select: { dateTime: true },
      }),

      // Completed visits joined with doctor info
      prisma.appointment.findMany({
        where: { patientId, status: 'completed' },
        select: {
          doctor: {
            select: {
              id: true,
              user: { select: { name: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // ---- Chart 1: appointments per month (last 6 months) ----
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

    // ---- Chart 2: status breakdown ----
    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
    const statusBreakdown = [
      { status: 'pending', value: statusMap.pending ?? 0 },
      { status: 'confirmed', value: statusMap.confirmed ?? 0 },
      { status: 'completed', value: statusMap.completed ?? 0 },
      { status: 'cancelled', value: statusMap.cancelled ?? 0 },
    ];

    // ---- Chart 3: doctors you've seen (completed visits) ----
    const doctorCounts = new Map();
    for (const a of appointmentsForDoctors) {
      const d = a.doctor;
      if (!d) continue;
      if (!doctorCounts.has(d.id)) {
        doctorCounts.set(d.id, {
          name: d.user?.name || `Doctor #${d.id}`,
          specialty: d.specialty?.name || null,
          count: 0,
        });
      }
      doctorCounts.get(d.id).count += 1;
    }
    const doctorsSeen = [...doctorCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.status(200).json({
      counts: {
        upcoming: upcomingCount,
        completed: completedCount,
        total: totalAppointments,
        doctors: doctorCount,
        hospitals: hospitalCount,
      },
      nextAppointment,
      symptoms,
      charts: {
        appointmentsPerMonth: monthBuckets.map(({ key, ...rest }) => rest),
        statusBreakdown,
        doctorsSeen,
      },
    });
  } catch (err) {
    console.error('getPatientOverview error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getPatientOverview };