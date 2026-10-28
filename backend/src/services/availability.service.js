// Pure logic for the 45-minute slot model plus a small DB helper.

const prisma = require('../lib/prisma');

const SLOT_MINUTES = 45;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

// ---- time helpers (all times handled as UTC) ----

// Returns "HH:MM" for a Date, in UTC.
function timeHHMM(date) {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Build a Date on 1970-01-01 with the given HH:MM in UTC.
// Used only for comparing against doctor_availability.start_time / end_time,
// which Prisma returns as Date objects with 1970-01-01 as the date part.
function timeOnEpoch(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date('1970-01-01T00:00:00Z');
  d.setUTCHours(h, m, 0, 0);
  return d;
}

// Is `date` aligned to a 45-minute boundary from midnight UTC?
// 00:00, 00:45, 01:30, ... yes. 00:15 no.
function isAlignedToSlot(date) {
  const minutesSinceMidnight = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (
    minutesSinceMidnight % SLOT_MINUTES === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

// Does the slot [date, date + 45min) fit entirely within [start, end]?
// start/end are Date objects from doctor_availability (1970-01-01 HH:MM).
// We compare HH:MM strings, so this works even if the schedule blocks aren't
// aligned to the global 45-min grid.
function slotFitsInWindow(date, start, end) {
  const slotEnd = new Date(date.getTime() + SLOT_MS);
  const hhmm = timeHHMM(date);
  const hhmmEnd = timeHHMM(slotEnd);
  const startHHMM = timeHHMM(start);
  const endHHMM = timeHHMM(end);
  return hhmm >= startHHMM && hhmmEnd <= endHHMM;
}

// Do two 45-min slots overlap? |a - b| < 45min.
function overlaps(a, b) {
  return Math.abs(a.getTime() - b.getTime()) < SLOT_MS;
}

// Does a doctor have a matching availability block for this (doctor, hospital, datetime)?
// Returns the matching block or null.
async function findMatchingAvailability({ doctorId, hospitalId, dateTime }) {
  const dow = dateTime.getUTCDay(); // 0..6
  const blocks = await prisma.doctorAvailability.findMany({
    where: { doctorId, hospitalId, dayOfWeek: dow, isAvailable: true },
  });
  for (const b of blocks) {
    if (slotFitsInWindow(dateTime, b.startTime, b.endTime)) return b;
  }
  return null;
}

// Does the doctor already have an appointment overlapping this slot?
// Pending and confirmed block; cancelled and completed do not.
// Considers all hospitals (a doctor can't be in two places at once).
async function findConflictingAppointment({ doctorId, dateTime, excludeAppointmentId }) {
  const windowStart = new Date(dateTime.getTime() - SLOT_MS + 1);
  const windowEnd = new Date(dateTime.getTime() + SLOT_MS - 1);
  const where = {
    doctorId,
    status: { in: ['pending', 'confirmed'] },
    dateTime: { gte: windowStart, lte: windowEnd },
  };
  if (excludeAppointmentId) where.id = { not: excludeAppointmentId };
  return prisma.appointment.findFirst({ where });
}

// Enumerate all bookable 45-min slots for a doctor on a given date at a hospital,
// excluding times already taken. Returns an array of ISO strings.
//
// IMPORTANT: slots are snapped to the global 45-min grid (00:00, 00:45, 01:30, ...).
// The create endpoint validates with isAlignedToSlot, which requires this. Without
// snapping, a doctor whose schedule starts at 10:00 would produce 10:00, 10:45, ...
// — 10:00 is not aligned (600 % 45 !== 0), so the create endpoint would reject it.
async function listSlots({ doctorId, hospitalId, date }) {
  const dow = date.getUTCDay();
  const blocks = await prisma.doctorAvailability.findMany({
    where: { doctorId, hospitalId, dayOfWeek: dow, isAvailable: true },
    orderBy: { startTime: 'asc' },
  });
  if (blocks.length === 0) return [];

  // Same-day appointments for this doctor (pending/confirmed), any hospital.
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const taken = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: ['pending', 'confirmed'] },
      dateTime: { gte: dayStart, lt: dayEnd },
    },
    select: { dateTime: true },
  });

  const now = Date.now();
  const slots = [];

  for (const b of blocks) {
    const startMins = b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes();
    const endMins = b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes();

    // Snap the first slot to the next 45-min boundary from midnight UTC.
    const firstAligned = Math.ceil(startMins / SLOT_MINUTES) * SLOT_MINUTES;

    for (let t = firstAligned; t + SLOT_MINUTES <= endMins; t += SLOT_MINUTES) {
      const slot = new Date(dayStart);
      slot.setUTCHours(0, t, 0, 0);

      // Skip past slots (only for today).
      if (slot.getTime() <= now) continue;

      // Skip slots that clash with an existing pending/confirmed appointment.
      const clash = taken.some((a) => overlaps(a.dateTime, slot));
      if (!clash) slots.push(slot.toISOString());
    }
  }

  // In case multiple blocks produce the same time.
  return [...new Set(slots)].sort();
}

module.exports = {
  SLOT_MINUTES,
  isAlignedToSlot,
  slotFitsInWindow,
  overlaps,
  findMatchingAvailability,
  findConflictingAppointment,
  listSlots,
};