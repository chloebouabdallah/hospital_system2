const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { generateBookableSlots } = require('../src/services/bookable.service');
const { isWithinWindow, windowBounds, levelFor } = require('../src/services/booking-policy.service');

const tm = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date('1970-01-01T00:00:00Z'); d.setUTCHours(h, m, 0, 0); return d; };
const NOW = Date.parse('2026-11-09T06:00:00Z');
const DAY = 24 * 3600 * 1000;
const block = (dayOfWeek, start, end, hospitalId = 1) => ({ hospitalId, dayOfWeek, startTime: tm(start), endTime: tm(end) });

describe('generateBookableSlots', () => {
  test('only weekdays the doctor works; 45-min grid slots', () => {
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '11:15')], taken: [], fromMs: NOW, toMs: NOW + 7 * DAY });
    assert.deepEqual(s.map((x) => x.dateTime.slice(0, 16)), ['2026-11-09T09:00', '2026-11-09T09:45', '2026-11-09T10:30']);
  });

  test('repeats weekly across the window', () => {
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '09:45')], taken: [], fromMs: NOW, toMs: NOW + 15 * DAY });
    assert.deepEqual(s.map((x) => x.dateTime.slice(0, 10)), ['2026-11-09', '2026-11-16', '2026-11-23']);
  });

  test('schedule start not on the grid is snapped up (10:00 -> 10:15 grid)', () => {
    const s = generateBookableSlots({ blocks: [block(1, '10:00', '12:00')], taken: [], fromMs: NOW, toMs: NOW + DAY });
    assert.ok(s.every((x) => { const d = new Date(x.dateTime); return (d.getUTCHours() * 60 + d.getUTCMinutes()) % 45 === 0; }));
    assert.ok(!s.some((x) => x.dateTime.includes('T10:00')));
  });

  test('booked (pending/confirmed) slots and overlaps are removed', () => {
    const taken = [new Date('2026-11-09T09:45:00Z')];
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '11:15')], taken, fromMs: NOW, toMs: NOW + DAY });
    assert.deepEqual(s.map((x) => x.dateTime.slice(11, 16)), ['09:00', '10:30']);
  });

  test('respects the earliest bound (minHoursAhead): slots before fromMs are dropped', () => {
    const from = Date.parse('2026-11-09T10:00:00Z');
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '11:15')], taken: [], fromMs: from, toMs: from + DAY });
    assert.deepEqual(s.map((x) => x.dateTime.slice(11, 16)), ['10:30']);
  });

  test('respects the latest bound (maxDaysAhead)', () => {
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '09:45')], taken: [], fromMs: NOW, toMs: NOW + 8 * DAY });
    assert.equal(s.length, 2); // 9 Nov and 16 Nov only
  });

  test('two hospitals on different days are both returned with their hospitalId', () => {
    const s = generateBookableSlots({ blocks: [block(1, '09:00', '09:45', 1), block(2, '09:00', '09:45', 2)], taken: [], fromMs: NOW, toMs: NOW + 3 * DAY });
    assert.deepEqual(s.map((x) => [x.dateTime.slice(0, 10), x.hospitalId]), [['2026-11-09', 1], ['2026-11-10', 2]]);
  });

  test('no schedule blocks -> no slots', () => {
    assert.deepEqual(generateBookableSlots({ blocks: [], taken: [], fromMs: NOW, toMs: NOW + DAY }), []);
  });
});

describe('booking window by urgency', () => {
  const urgent = { minHoursAhead: 0, maxDaysAhead: 2 };
  const normal = { minHoursAhead: 24, maxDaysAhead: 30 };
  test('urgent allows today, not 3 days out', () => {
    assert.ok(isWithinWindow(new Date(NOW + 2 * 3600 * 1000), urgent, NOW));
    assert.ok(!isWithinWindow(new Date(NOW + 3 * DAY), urgent, NOW));
  });
  test('normal blocks the next 24h but allows next week', () => {
    assert.ok(!isWithinWindow(new Date(NOW + 5 * 3600 * 1000), normal, NOW));
    assert.ok(isWithinWindow(new Date(NOW + 7 * DAY), normal, NOW));
  });
  test('windowBounds', () => {
    const b = windowBounds(normal, NOW);
    assert.equal(b.fromMs, NOW + 24 * 3600 * 1000);
    assert.equal(b.toMs, NOW + 30 * DAY);
  });
  test('levelFor maps unknown/missing to no_triage', () => {
    assert.equal(levelFor('urgent'), 'urgent');
    assert.equal(levelFor(undefined), 'no_triage');
    assert.equal(levelFor('whatever'), 'no_triage');
  });
});
