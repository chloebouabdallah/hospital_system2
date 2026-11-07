const { SLOT_MINUTES, overlaps } = require('./availability.service');

// "Show me every free slot for this doctor in the booking window" in one go, so the patient
// never has to hunt through a calendar.
//
// generateBookableSlots is pure (no DB): it takes the doctor's weekly schedule blocks and the
// already-booked appointment times and returns the free slots inside [fromMs, toMs].
// Slots follow the same rules as availability.service.listSlots / createAppointment:
//   - 45-minute slots snapped to the global grid (00:00, 00:45, ...), all times UTC
//   - the doctor's schedule blocks decide which weekdays/hours/hospitals exist
//   - pending + confirmed appointments (any hospital) block overlapping slots

const DAY_MS = 24 * 60 * 60 * 1000;

// blocks: [{ hospitalId, dayOfWeek, startTime: Date, endTime: Date }]  (isAvailable already filtered)
// taken:  [Date]
// returns [{ dateTime: ISO string, hospitalId }] sorted by time
function generateBookableSlots({ blocks, taken, fromMs, toMs }) {
  const slots = [];
  const firstDay = Date.UTC(
    new Date(fromMs).getUTCFullYear(), new Date(fromMs).getUTCMonth(), new Date(fromMs).getUTCDate()
  );

  for (let dayStart = firstDay; dayStart <= toMs; dayStart += DAY_MS) {
    const dow = new Date(dayStart).getUTCDay();

    for (const b of blocks) {
      if (b.dayOfWeek !== dow) continue;
      const startMins = b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes();
      const endMins = b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes();
      const firstAligned = Math.ceil(startMins / SLOT_MINUTES) * SLOT_MINUTES;

      for (let t = firstAligned; t + SLOT_MINUTES <= endMins; t += SLOT_MINUTES) {
        const slotMs = dayStart + t * 60 * 1000;
        if (slotMs < fromMs || slotMs > toMs) continue;
        const slot = new Date(slotMs);
        if (taken.some((a) => overlaps(a, slot))) continue;
        slots.push({ dateTime: slot.toISOString(), hospitalId: b.hospitalId });
      }
    }
  }

  // de-duplicate (same time + hospital from overlapping blocks) and sort
  const seen = new Set();
  return slots
    .filter((s) => { const k = `${s.dateTime}|${s.hospitalId}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime) || a.hospitalId - b.hospitalId);
}

// DB wrapper. hospitalId optional: omitted = every hospital the doctor has schedule blocks at.
async function listBookableSlots({ doctorId, hospitalId, fromMs, toMs }) {
  const prisma = require('../lib/prisma');
  const where = { doctorId, isAvailable: true };
  if (hospitalId) where.hospitalId = hospitalId;

  const blocks = await prisma.doctorAvailability.findMany({
    where,
    select: { hospitalId: true, dayOfWeek: true, startTime: true, endTime: true },
  });
  if (blocks.length === 0) return [];

  const takenRows = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: ['pending', 'confirmed'] },
      dateTime: { gte: new Date(fromMs - SLOT_MINUTES * 60 * 1000), lte: new Date(toMs + SLOT_MINUTES * 60 * 1000) },
    },
    select: { dateTime: true },
  });

  return generateBookableSlots({ blocks, taken: takenRows.map((r) => r.dateTime), fromMs, toMs });
}

module.exports = { generateBookableSlots, listBookableSlots };