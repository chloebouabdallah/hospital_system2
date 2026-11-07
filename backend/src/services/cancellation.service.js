const { CANCEL_CLOSED_DAYS_BEFORE, APP_TIMEZONE } = require('../config/booking');


function tzOffsetMs(instantMs, tz) {
  const secMs = instantMs - (((instantMs % 1000) + 1000) % 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(secMs));
  const v = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - secMs;
}

// The calendar date (y, m, d) of an instant in `tz`.
function localYMD(instantMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(instantMs));
  const v = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  return { y: v.year, m: v.month, d: v.day };
}

// The instant when calendar day (y, m, d) STARTS in `tz` (00:00 local; first valid instant if DST skips it).
function startOfLocalDay(y, m, d, tz) {
  const guess = Date.UTC(y, m - 1, d);            // 00:00 "as if UTC"
  const r1 = guess - tzOffsetMs(guess, tz);
  return guess - tzOffsetMs(r1, tz);              // second pass fixes DST changes
}

// The last moment a patient can still cancel (inclusive), as a Date.
function cancelDeadline(dateTime, closedDays = CANCEL_CLOSED_DAYS_BEFORE, tz = APP_TIMEZONE) {
  const { y, m, d } = localYMD(new Date(dateTime).getTime(), tz);
  // Cancellation closes when day (appointment date - closedDays) starts...
  const closesAt = startOfLocalDay(y, m, d - closedDays, tz); // Date.UTC handles d <= 0 by rolling back
  // ...so the last allowed moment is 1 ms earlier.
  return new Date(closesAt - 1);
}

// Can a patient cancel an appointment that starts at `dateTime`?
// Returns { allowed, deadline (ISO), message | null }.
function patientCancelStatus(dateTime, now = Date.now(), closedDays = CANCEL_CLOSED_DAYS_BEFORE, tz = APP_TIMEZONE) {
  const deadline = cancelDeadline(dateTime, closedDays, tz);
  const allowed = now <= deadline.getTime();
  const lastDay = deadline.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
  return {
    allowed,
    deadline: deadline.toISOString(),
    message: allowed
      ? null
      : `You can't cancel this appointment online. Cancellations must be made by the end of ${lastDay} ` +
        '(at least two days before the appointment, never on the day before or the same day), and that time has passed. ' +
        'Please contact the clinic if you cannot attend.',
  };
}

module.exports = { cancelDeadline, patientCancelStatus, startOfLocalDay, localYMD, tzOffsetMs };