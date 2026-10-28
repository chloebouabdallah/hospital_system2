// Pure geo helpers (no DB). At the scale of "hospitals in Lebanon" a simple Haversine
// calculation in JS is plenty, so there is no need for PostGIS.

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two lat/lng points, in kilometres.
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Adds distanceKm (1 decimal) to each item that has latitude/longitude, keeps those within
// radiusKm, sorts nearest-first (ties broken by id so the order is stable), and applies limit.
function rankByDistance(items, lat, lng, radiusKm, limit) {
  return items
    .map((item) => ({ ...item, distanceKm: haversineKm(lat, lng, item.latitude, item.longitude) }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.id - b.id)
    .slice(0, limit)
    .map((item) => ({ ...item, distanceKm: Math.round(item.distanceKm * 10) / 10 }));
}

module.exports = { haversineKm, rankByDistance };