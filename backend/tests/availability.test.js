const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SLOT_MINUTES,
  isAlignedToSlot,
  slotFitsInWindow,
  overlaps,
} = require('../src/services/availability.service');

const t = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date('2026-10-15T00:00:00Z');
  d.setUTCHours(h, m, 0, 0);
  return d;
};

describe('isAlignedToSlot (45 min)', () => {
  test('accepts :00, :45, and multiples', () => {
    assert.equal(SLOT_MINUTES, 45);
    assert.ok(isAlignedToSlot(t('09:00')));
    assert.ok(isAlignedToSlot(t('09:45')));
    assert.ok(isAlignedToSlot(t('10:30')));
    assert.ok(isAlignedToSlot(t('00:00')));
  });
  test('rejects :15, :30, :10', () => {
    assert.ok(!isAlignedToSlot(t('09:15')));
    assert.ok(!isAlignedToSlot(t('09:30')));
    assert.ok(!isAlignedToSlot(t('09:10')));
  });
  test('rejects non-zero seconds/ms', () => {
    const d = t('09:00');
    d.setUTCSeconds(30);
    assert.ok(!isAlignedToSlot(d));
  });
});

describe('slotFitsInWindow', () => {
  test('a 45-min slot ending exactly at the block end fits', () => {
    // 12:00 slot ends 12:45, block ends 13:00 → fits.
    assert.ok(slotFitsInWindow(t('12:00'), t('09:00'), t('13:00')));
  });
  test('a slot that would end after the block end does not fit', () => {
    // 12:30 slot ends 13:15, block ends 13:00 → does not fit.
    assert.ok(!slotFitsInWindow(t('12:30'), t('09:00'), t('13:00')));
  });
  test('slot before the block start does not fit', () => {
    assert.ok(!slotFitsInWindow(t('08:45'), t('09:00'), t('13:00')));
  });
});

describe('overlaps', () => {
  test('same time overlaps', () => {
    assert.ok(overlaps(t('09:00'), t('09:00')));
  });
  test('less than 45 minutes apart overlaps', () => {
    assert.ok(overlaps(t('09:00'), t('09:30')));
  });
  test('exactly 45 minutes apart does not overlap', () => {
    assert.ok(!overlaps(t('09:00'), t('09:45')));
  });
  test('more than 45 minutes apart does not overlap', () => {
    assert.ok(!overlaps(t('09:00'), t('10:30')));
  });
});