const { DEFAULT_WINDOW, MAX_WINDOW_DAYS } = require('../config/booking');

// Booking window per urgency level, read from the admin-editable urgency_booking_rules table.
// (Prisma is loaded lazily so the pure helpers can be unit-tested without a database.)

const LEVELS = ['urgent', 'moderate', 'low'];
const levelFor = (urgency) => (LEVELS.includes(urgency) ? urgency : 'no_triage');

async function loadWindow(urgency) {
  const level = levelFor(urgency);
  let rule = null;
  try {
    rule = await require('../lib/prisma').urgencyBookingRule.findUnique({ where: { urgencyLevel: level } });
  } catch (err) {
    console.error('loadWindow error (using defaults):', err.message);
  }
  return {
    urgencyLevel: level,
    minHoursAhead: rule?.minHoursAhead ?? DEFAULT_WINDOW.minHoursAhead,
    maxDaysAhead: Math.min(rule?.maxDaysAhead ?? DEFAULT_WINDOW.maxDaysAhead, MAX_WINDOW_DAYS),
    message: rule?.message ?? null,
  };
}

// [from, to] in epoch ms for a window, relative to `now`.
function windowBounds(win, now = Date.now()) {
  return {
    fromMs: now + win.minHoursAhead * 3600 * 1000,
    toMs: now + win.maxDaysAhead * 24 * 3600 * 1000,
  };
}

function isWithinWindow(when, win, now = Date.now()) {
  const t = new Date(when).getTime();
  const { fromMs, toMs } = windowBounds(win, now);
  return t >= fromMs && t <= toMs;
}

module.exports = { levelFor, loadWindow, windowBounds, isWithinWindow };