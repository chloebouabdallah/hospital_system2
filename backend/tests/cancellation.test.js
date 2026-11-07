const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { patientCancelStatus, cancelDeadline, startOfLocalDay } = require('../src/services/cancellation.service');

const TZ = 'Asia/Beirut'; // UTC+2 in November
// Appointment: Tuesday 10 Nov 2026, 10:00 Beirut time = 08:00Z
const APPT = new Date('2026-11-10T08:00:00Z');
const beirut = (iso) => Date.parse(iso + '+02:00');
const status = (nowIso, appt = APPT) => patientCancelStatus(appt, beirut(nowIso), 1, TZ);

describe('patient cancellation cut-off (calendar days, Beirut time)', () => {
  test('Sunday 23:59:59 (2 days before): allowed', () => assert.equal(status('2026-11-08T23:59:59').allowed, true));
  test('Monday 00:00:01 (the day before): blocked', () => assert.equal(status('2026-11-09T00:00:01').allowed, false));
  test('Monday 09:00 / 18:00 (day before): blocked', () => {
    assert.equal(status('2026-11-09T09:00:00').allowed, false);
    assert.equal(status('2026-11-09T18:00:00').allowed, false);
  });
  test('Tuesday, same day (even 5h before): blocked', () => assert.equal(status('2026-11-10T05:00:00').allowed, false));
  test('already started / past: blocked', () => assert.equal(status('2026-11-10T11:00:00').allowed, false));
  test('a week before: allowed', () => assert.equal(status('2026-11-03T12:00:00').allowed, true));
  test('late appointment (23:30 Tuesday) still counts by calendar day', () => {
    const late = new Date(beirut('2026-11-10T23:30:00'));
    assert.equal(status('2026-11-08T23:59:59', late).allowed, true);
    assert.equal(status('2026-11-09T00:00:01', late).allowed, false);
  });
  test('early appointment (00:30 Tuesday Beirut = Monday 22:30Z) uses the Beirut calendar day', () => {
    const early = new Date(beirut('2026-11-10T00:30:00'));
    assert.equal(status('2026-11-08T23:59:59', early).allowed, true);
    assert.equal(status('2026-11-09T00:00:01', early).allowed, false);
  });
  test('deadline is Sunday 23:59:59.999 Beirut', () => {
    assert.equal(cancelDeadline(APPT, 1, TZ).getTime(), beirut('2026-11-09T00:00:00') - 1);
  });
  test('blocked message is clear; allowed message is null', () => {
    const b = status('2026-11-09T12:00:00');
    assert.match(b.message, /Sunday 8 November/);
    assert.match(b.message, /day before or the same day/);
    assert.equal(status('2026-11-01T12:00:00').message, null);
  });
  test('month boundary: visit on 2 Dec -> deadline is 30 Nov end of day', () => {
    const appt = new Date(beirut('2026-12-02T10:00:00'));
    assert.equal(cancelDeadline(appt, 1, TZ).getTime(), beirut('2026-12-01T00:00:00') - 1);
  });
  test('works across a DST change (Lebanon springs forward Sunday 28 Mar 2027 at 00:00)', () => {
    const appt = new Date('2027-03-29T07:00:00Z'); // Monday morning, after the change (UTC+3)
    // closes at start of Sunday 28 Mar; midnight does not exist -> first valid instant 01:00 local = 22:00Z Mar 27
    assert.equal(startOfLocalDay(2027, 3, 28, TZ), Date.parse('2027-03-27T22:00:00Z'));
    assert.equal(cancelDeadline(appt, 1, TZ).getTime(), Date.parse('2027-03-27T22:00:00Z') - 1);
  });
  test('closedDays=2 closes one day earlier', () => {
    assert.equal(patientCancelStatus(APPT, beirut('2026-11-08T12:00:00'), 2, TZ).allowed, false);
    assert.equal(patientCancelStatus(APPT, beirut('2026-11-07T12:00:00'), 2, TZ).allowed, true);
  });
});