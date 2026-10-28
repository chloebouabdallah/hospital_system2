import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import BookingModal from './BookingModal';

const Icon = {
  Pin: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  StarEmpty: () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  Chevron: ({ open }) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
};

const CSS = `
.hp-page { display: flex; flex-direction: column; gap: 22px; }

.hp-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.hp-sub { color: var(--mut); font-size: 14px; margin: 0; }

.hp-form {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hp-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.hp-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--mut);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.hp-field input,
.hp-field select {
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
}
.hp-field input:focus,
.hp-field select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.hp-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.hp-geo-hint {
  font-size: 12px;
  color: var(--mut);
  margin: 0;
}

.hp-split {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 960px) {
  .hp-split { grid-template-columns: minmax(0, 1fr); gap: 14px; }
}

.hp-map {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  position: sticky;
  top: 20px;
}
.hp-map h3 {
  font-family: var(--font-head);
  font-size: 14px;
  margin: 0 0 14px;
}
.hp-map-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle, #a78bfa11 0%, transparent 70%),
    linear-gradient(135deg, #f5f3ff, #eef2ff);
  overflow: hidden;
  border: 1px dashed var(--line);
}
.hp-map-ring {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid #a78bfa44;
}
.hp-map-you {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--v);
  box-shadow: 0 0 0 5px #7b5cf033;
}
.hp-map-pin {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-head);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.15s;
  box-shadow: 0 4px 12px #7b5cf033;
}
.hp-map-pin:hover { transform: translate(-50%, -50%) scale(1.15); }
.hp-map-legend {
  font-size: 12px;
  color: var(--mut);
  margin-top: 12px;
  line-height: 1.5;
}

.hp-list { display: flex; flex-direction: column; gap: 14px; }

.hp-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.hp-card:hover { border-color: #7b5cf055; }

.hp-card-head {
  padding: 20px 22px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
}
.hp-card-info { flex: 1; min-width: 0; }
.hp-name {
  font-family: var(--font-head);
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--ink);
}
.hp-city {
  font-size: 13px;
  color: var(--mut);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.hp-distance {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-weight: 700;
  font-size: 12px;
  font-family: var(--font-head);
  flex-shrink: 0;
}

.hp-card-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px 16px;
  color: var(--v);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-top: 1px dashed var(--line);
  margin: 0 22px;
}

.hp-docs {
  padding: 4px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hp-doc {
  background: var(--soft);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.hp-doc-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-head);
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}
.hp-doc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.hp-doc-name {
  font-weight: 700;
  font-size: 14px;
  margin: 0;
  color: var(--ink);
}
.hp-doc-spec {
  font-size: 12px;
  color: var(--v);
  font-weight: 600;
  margin: 0;
}
.hp-doc-bio {
  font-size: 13px;
  line-height: 1.5;
  color: var(--mut);
  margin: 0;
}
.hp-doc-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--mut);
}
.hp-doc-stars {
  display: flex;
  gap: 2px;
  color: #f59e0b;
  align-items: center;
}
.hp-doc-stars-empty { color: #d1d5db; }
.hp-doc-rating-num {
  font-family: var(--font-head);
  font-weight: 700;
  color: var(--ink);
  margin-left: 4px;
}
.hp-doc-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.hp-doc-actions .btn { padding: 6px 14px; font-size: 13px; }

.hp-doc-reviews {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.hp-review {
  padding: 8px 0;
  font-size: 13px;
}
.hp-review:not(:last-child) { border-bottom: 1px dashed var(--line); }
.hp-review-head {
  display: flex;
  justify-content: space-between;
  color: var(--mut);
  font-size: 12px;
  margin-bottom: 3px;
}
.hp-review p { margin: 0; color: var(--ink); line-height: 1.5; }

.hp-empty {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 60px 40px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
}

@media (max-width: 960px) {
  .hp-map { position: static; }
  .hp-map-canvas { width: min(100%, 280px); margin-inline: auto; }
}

@media (max-width: 700px) {
  .hp-page { gap: 18px; }
  .hp-header h1 { font-size: 25px; }
  .hp-form { padding: 16px; gap: 12px; }
  .hp-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .hp-field input,
  .hp-field select { padding: 10px; font-size: 16px; }
  .hp-form-actions { justify-content: flex-start; gap: 8px; }
  .hp-form-actions .btn { flex: 1 1 140px; }
  .hp-geo-hint { flex: 1 1 100%; }

  .hp-map { padding: 16px; }
  .hp-map-canvas { width: min(100%, 230px); }
  .hp-card-head { padding: 16px; gap: 10px; }
  .hp-name { font-size: 14px; }
  .hp-city { font-size: 12px; }
  .hp-distance { padding: 4px 9px; font-size: 11px; }
  .hp-card-toggle { margin-inline: 16px; padding: 8px 14px 13px; }
  .hp-docs { padding: 4px 14px 14px; gap: 10px; }
  .hp-doc { padding: 12px; gap: 10px; }
  .hp-doc-avatar { width: 36px; height: 36px; font-size: 15px; }
  .hp-doc-name { font-size: 13px; }
  .hp-doc-bio { font-size: 12px; }
  .hp-doc-actions { flex-wrap: wrap; }
  .hp-doc-actions .btn { padding: 6px 10px; font-size: 12px; }
  .hp-empty { padding: 36px 20px; font-size: 14px; }
}

@media (max-width: 380px) {
  .hp-form-grid { grid-template-columns: minmax(0, 1fr); }
  .hp-form-actions .btn { flex-basis: 100%; }
  .hp-map-canvas { width: min(100%, 190px); }
  .hp-card-head { flex-direction: column; }
  .hp-doc { gap: 8px; padding: 10px; }
}
`;

export default function Hospitals() {
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lat, setLat] = useState('33.8938');
  const [lng, setLng] = useState('35.5018');
  const [radiusKm, setRadiusKm] = useState('25');
  const [specialtyId, setSpecialtyId] = useState('');

  const [expanded, setExpanded] = useState(null);
  const [hospDoctors, setHospDoctors] = useState({});
  const [reviewsByDoctor, setReviewsByDoctor] = useState({});
  const [openDocReviews, setOpenDocReviews] = useState(null);
  const [booking, setBooking] = useState(null);
  const [located, setLocated] = useState(false);

  useEffect(() => {
    api.getSpecialties().then((r) => setSpecialties(r.specialties || [])).catch(() => {});
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(overrides = {}) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        lat: overrides.lat ?? lat,
        lng: overrides.lng ?? lng,
        radiusKm: overrides.radiusKm ?? radiusKm,
      });
      const sid = overrides.specialtyId !== undefined ? overrides.specialtyId : specialtyId;
      if (sid) params.set('specialtyId', sid);

      const res = await api.getHospitalsNearby(params.toString());
      setHospitals(res.hospitals || []);
      setExpanded(null);
      setHospDoctors({});
    } catch (err) {
      setError(err.data?.error || 'Could not search hospitals.');
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude.toFixed(4);
        const lo = pos.coords.longitude.toFixed(4);
        setLat(la);
        setLng(lo);
        setLocated(true);
        runSearch({ lat: la, lng: lo });
      },
      () => alert('Could not get your location. Enter coordinates manually.'),
      { timeout: 8000 }
    );
  }

  async function toggleExpand(hosp) {
    if (expanded === hosp.id) {
      setExpanded(null);
      return;
    }
    setExpanded(hosp.id);

    if (!hospDoctors[hosp.id]) {
      try {
        const params = specialtyId ? `?specialtyId=${specialtyId}` : '';
        const r = await api.getHospitalById(hosp.id, params);
        const docs = (r.hospital?.doctors || []).map((d) => ({
          id: d.id,
          name: d.name,
          bio: d.bio,
          yearsExperience: d.yearsExperience,
          specialty: d.specialty,
        }));
        setHospDoctors((prev) => ({ ...prev, [hosp.id]: docs }));

        const reviewResults = await Promise.all(
          docs.map((d) =>
            api
              .getDoctorReviews(d.id)
              .then((r) => ({
                id: d.id,
                summary: r.summary || { average: null, count: 0 },
                reviews: r.reviews || [],
              }))
              .catch(() => ({ id: d.id, summary: { average: null, count: 0 }, reviews: [] }))
          )
        );
        const byDoc = {};
        for (const r of reviewResults) byDoc[r.id] = r;
        setReviewsByDoctor((prev) => ({ ...prev, ...byDoc }));
      } catch {
        setHospDoctors((prev) => ({ ...prev, [hosp.id]: [] }));
      }
    }
  }

  function toggleDocReviews(docId) {
    setOpenDocReviews((cur) => (cur === docId ? null : docId));
  }

  const mapPins = useMemo(() => {
    if (hospitals.length === 0) return [];
    const maxDist = Math.max(
      ...hospitals.map((h) => h.distanceKm || 0),
      radiusKm ? Number(radiusKm) : 1
    );
    return hospitals.map((h, i) => {
      const angle = (i / hospitals.length) * 2 * Math.PI - Math.PI / 2;
      const frac = Math.min(1, (h.distanceKm || 0) / maxDist) * 0.85;
      const x = 50 + Math.cos(angle) * frac * 50;
      const y = 50 + Math.sin(angle) * frac * 50;
      return { id: h.id, number: i + 1, x, y };
    });
  }, [hospitals, radiusKm]);

  return (
    <div className="hp-page">
      <style>{CSS}</style>

      <header className="hp-header">
        <h1>Hospitals</h1>
        <p className="hp-sub">Find hospitals near you and book a specialist.</p>
      </header>

      <div className="hp-form">
        <div className="hp-form-grid">
          <div className="hp-field">
            <label>Latitude</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="hp-field">
            <label>Longitude</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="hp-field">
            <label>Radius (km)</label>
            <input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} type="number" min="1" />
          </div>
          <div className="hp-field">
            <label>Specialty</label>
            <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
              <option value="">All specialties</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hp-form-actions">
          {located && <p className="hp-geo-hint">✓ Located you at {lat}, {lng}</p>}
          <button className="btn" onClick={useMyLocation} type="button">Use my location</button>
          <button className="btn btn-primary" onClick={() => runSearch()} disabled={loading}>
            {loading ? 'Searching…' : 'Search nearby'}
          </button>
        </div>
      </div>

      {error && <div className="hp-empty">{error}</div>}

      {!error && !loading && hospitals.length === 0 && (
        <div className="hp-empty">No hospitals match your search. Widen the radius or change specialty.</div>
      )}

      {!error && hospitals.length > 0 && (
        <div className="hp-split">
          <div className="hp-map">
            <h3>Nearby map</h3>
            <div className="hp-map-canvas">
              <div className="hp-map-ring" style={{ width: '60%', height: '60%' }} />
              <div className="hp-map-ring" style={{ width: '90%', height: '90%' }} />
              <div className="hp-map-you" />
              {mapPins.map((p) => (
                <div
                  key={p.id}
                  className="hp-map-pin"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  title={`Hospital #${p.number}`}
                  onClick={() => toggleExpand(hospitals.find((h) => h.id === p.id))}
                >
                  {p.number}
                </div>
              ))}
            </div>
            <p className="hp-map-legend">
              Purple dot is you. Numbers match the list.
            </p>
          </div>

          <div className="hp-list">
            {hospitals.map((h, idx) => {
              const isOpen = expanded === h.id;
              const docs = hospDoctors[h.id];
              return (
                <article key={h.id} className="hp-card">
                  <div className="hp-card-head" onClick={() => toggleExpand(h)}>
                    <div className="hp-card-info">
                      <h3 className="hp-name">{idx + 1}. {h.name}</h3>
                      <p className="hp-city">
                        <Icon.Pin /> {h.city}{h.address ? ` · ${h.address}` : ''}
                      </p>
                    </div>
                    {h.distanceKm != null && (
                      <span className="hp-distance">{h.distanceKm} km</span>
                    )}
                  </div>

                  <div className="hp-card-toggle" onClick={() => toggleExpand(h)}>
                    <Icon.Chevron open={isOpen} />
                    {isOpen ? 'Hide doctors' : `See doctors (${h.doctorCount ?? 0})`}
                  </div>

                  {isOpen && (
                    <div className="hp-docs">
                      {!docs && <p style={{ color: 'var(--mut)', fontSize: 13 }}>Loading doctors…</p>}
                      {docs && docs.length === 0 && (
                        <p style={{ color: 'var(--mut)', fontSize: 13 }}>
                          No specialists available at this hospital{specialtyId ? ' for this specialty' : ''}.
                        </p>
                      )}
                      {docs && docs.map((d) => {
                        const review = reviewsByDoctor[d.id];
                        const summary = review?.summary || { average: null, count: 0 };
                        const showReviews = openDocReviews === d.id;
                        const rating = summary.average;
                        const rounded = rating ? Math.round(rating) : 0;
                        return (
                          <div key={d.id} className="hp-doc">
                            <div className="hp-doc-avatar">
                              {(d.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="hp-doc-body">
                              <p className="hp-doc-name">{d.name}</p>
                              {d.specialty?.name && (
                                <p className="hp-doc-spec">{d.specialty.name}</p>
                              )}
                              {d.bio && <p className="hp-doc-bio">{d.bio}</p>}

                              <div className="hp-doc-meta">
                                <span className="hp-doc-stars">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <span key={n} className={n <= rounded ? '' : 'hp-doc-stars-empty'}>
                                      {n <= rounded ? <Icon.Star /> : <Icon.StarEmpty />}
                                    </span>
                                  ))}
                                  <span className="hp-doc-rating-num">
                                    {summary.count > 0 ? rating.toFixed(1) : '—'}
                                  </span>
                                  <span>({summary.count})</span>
                                </span>
                                {d.yearsExperience != null && (
                                  <span>{d.yearsExperience} yrs exp</span>
                                )}
                              </div>

                              <div className="hp-doc-actions">
                                <button
                                  className="btn btn-primary"
                                  onClick={() => setBooking({ doctor: d, hospital: h })}
                                >
                                  Book
                                </button>
                                {summary.count > 0 && (
                                  <button className="btn" onClick={() => toggleDocReviews(d.id)}>
                                    {showReviews ? 'Hide reviews' : `Reviews (${summary.count})`}
                                  </button>
                                )}
                              </div>

                              {showReviews && review?.reviews?.length > 0 && (
                                <div className="hp-doc-reviews">
                                  {review.reviews.slice(0, 3).map((r) => (
                                    <div key={r.id} className="hp-review">
                                      <div className="hp-review-head">
                                        <span style={{ color: '#f59e0b' }}>
                                          {'★'.repeat(r.rating)}
                                          <span style={{ color: '#d1d5db' }}>
                                            {'★'.repeat(5 - r.rating)}
                                          </span>
                                        </span>
                                        <span>{r.authorDisplay}</span>
                                      </div>
                                      {r.comment && <p>{r.comment}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {booking && (
        <BookingModal
          doctor={booking.doctor}
          preselectedHospitalId={booking.hospital?.id}
          onClose={() => setBooking(null)}
          onBooked={() => setBooking(null)}
        />
      )}
    </div>
  );
}