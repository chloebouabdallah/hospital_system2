const prisma = require('../lib/prisma');
const { loadWindow, windowBounds } = require('../services/booking-policy.service');
const { listBookableSlots } = require('../services/bookable.service');
const { SLOT_MINUTES } = require('../services/availability.service');


async function getBookableSlots(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (Number.isNaN(doctorId)) return res.status(400).json({ error: 'Invalid doctor id.' });

    let hospitalId;
    if (req.query.hospitalId !== undefined && req.query.hospitalId !== '') {
      hospitalId = parseInt(req.query.hospitalId, 10);
      if (Number.isNaN(hospitalId)) return res.status(400).json({ error: 'Invalid hospitalId.' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const policy = await loadWindow(req.query.urgency);
    const { fromMs, toMs } = windowBounds(policy);
    const slots = await listBookableSlots({ doctorId, hospitalId, fromMs, toMs });

    return res.status(200).json({
      doctorId,
      policy,
      window: { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() },
      slotMinutes: SLOT_MINUTES,
      slots,
    });
  } catch (err) {
    console.error('getBookableSlots error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getBookableSlots };