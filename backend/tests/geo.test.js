// Pure tests for the distance helpers. No database needed.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm, rankByDistance } = require('../src/utils/geo');

describe('haversineKm', () => {
  test('same point is 0 km', () => {
    assert.equal(haversineKm(33.8938, 35.5018, 33.8938, 35.5018), 0);
  });

  test('one degree of longitude on the equator is about 111.2 km', () => {
    const d = haversineKm(0, 0, 0, 1);
    assert.ok(Math.abs(d - 111.19) < 0.1, `got ${d}`);
  });

  test('is symmetric', () => {
    const a = haversineKm(33.9, 35.48, 34.44, 35.85);
    const b = haversineKm(34.44, 35.85, 33.9, 35.48);
    assert.ok(Math.abs(a - b) < 1e-9);
  });

  test('central Beirut to central Tripoli is roughly 70 km', () => {
    const d = haversineKm(33.8938, 35.5018, 34.4367, 35.8497);
    assert.ok(d > 65 && d < 75, `got ${d}`);
  });

  test('antipodal points do not produce NaN', () => {
    assert.ok(Number.isFinite(haversineKm(0, 0, 0, 180)));
  });
});

describe('rankByDistance', () => {
  const hospitals = [
    { id: 1, name: 'Far',   latitude: 34.4367, longitude: 35.8497 }, // ~70 km from Beirut
    { id: 2, name: 'Near',  latitude: 33.9,    longitude: 35.482 },
    { id: 3, name: 'Mid',   latitude: 33.97,   longitude: 35.62 },
  ];
  const from = [33.8938, 35.5018];

  test('sorts nearest first and adds distanceKm', () => {
    const out = rankByDistance(hospitals, ...from, 500, 10);
    assert.deepEqual(out.map((h) => h.name), ['Near', 'Mid', 'Far']);
    assert.ok(out.every((h) => typeof h.distanceKm === 'number'));
  });

  test('drops hospitals outside the radius', () => {
    const out = rankByDistance(hospitals, ...from, 20, 10);
    assert.deepEqual(out.map((h) => h.name), ['Near', 'Mid']);
  });

  test('applies the limit after sorting', () => {
    const out = rankByDistance(hospitals, ...from, 500, 1);
    assert.deepEqual(out.map((h) => h.name), ['Near']);
  });

  test('returns an empty list when nothing is in range, and does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(hospitals));
    assert.deepEqual(rankByDistance(hospitals, 0, 0, 5, 10), []);
    assert.deepEqual(hospitals, copy);
  });

  test('distanceKm is rounded to 1 decimal', () => {
    const [h] = rankByDistance(hospitals, ...from, 500, 1);
    assert.equal(h.distanceKm, Math.round(h.distanceKm * 10) / 10);
  });

  test('ties are broken by id so ordering is stable', () => {
    const twins = [
      { id: 9, latitude: 33.9, longitude: 35.48 },
      { id: 4, latitude: 33.9, longitude: 35.48 },
    ];
    assert.deepEqual(rankByDistance(twins, ...from, 50, 5).map((h) => h.id), [4, 9]);
  });
});