import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import BookingModal from './BookingModal';

// ---------- Inline icons ----------
const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  StarEmpty: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="1.5" />
      <path d="M12 8v6M9 11h6M4 21h16" />
    </svg>
  ),
};

const CSS = `
.fd-page { display: flex; flex-direction: column; gap: 22px; min-width: 0; width: 100%; }

.fd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
.fd-review-head span { min-width: 0; overflow-wrap: anywhere; }
.fd-header h1 {
  font-family: var(--font-head);
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.fd-sub { color: var(--mut); font-size: 14px; margin: 0; }

/* Urgency banner */
.fd-urgency {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 10px;
}
.fd-urgency-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fd-urgency-urgent   { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.fd-urgency-urgent .fd-urgency-dot   { background: #dc2626; }
.fd-urgency-moderate { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.fd-urgency-moderate .fd-urgency-dot { background: #d97706; }
.fd-urgency-low      { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.fd-urgency-low .fd-urgency-dot      { background: #16a34a; }

/* Toolbar */
.fd-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  min-width: 0;
}
.fd-search {
  flex: 1;
  min-width: 220px;
  position: relative;
  display: flex;
  align-items: center;
}
.fd-search svg {
  position: absolute;
  left: 12px;
  color: var(--mut);
  pointer-events: none;
}
.fd-search input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
}
.fd-search input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px #008cfd22;
}
.fd-select {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
  min-width: 180px;
}
.fd-select:focus { border-color: var(--p); box-shadow: 0 0 0 3px #008cfd22; }

/* Grid of doctor cards */
.fd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 16px;
  min-width: 0;
}

.fd-card {
  min-width: 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.fd-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px #7b5cf018;
}

/* Clickable header */
.fd-card-head {
  display: flex;
  min-width: 0;
  gap: 14px;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.15s;
}
.fd-card-head:hover .fd-name { color: var(--v); }
.fd-card-head:hover .fd-avatar {
  transform: scale(1.04);
  box-shadow: 0 6px 18px #7b5cf040;
}

.fd-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-family: var(--font-head);
  font-size: 20px;
  flex-shrink: 0;
  transition: transform 0.15s, box-shadow 0.15s;
}
.fd-name {
  font-family: var(--font-head);
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--ink);
  transition: color 0.15s;
}
.fd-spec {
  font-size: 13px;
  color: var(--v);
  font-weight: 600;
  margin: 0;
}
.fd-years {
  font-size: 12px;
  color: var(--mut);
  margin: 2px 0 0;
}

.fd-bio {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--mut);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fd-hospitals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fd-hosp {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--soft);
  color: var(--v);
  font-size: 11.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.fd-hosp svg { flex: 0 0 auto; }

.fd-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.fd-stars { display: flex; gap: 2px; color: #f59e0b; }
.fd-stars-empty { color: #d1d5db; }
.fd-rating-num {
  font-family: var(--font-head);
  font-weight: 700;
  color: var(--ink);
}
.fd-rating-count { color: var(--mut); font-size: 12px; }

.fd-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.fd-actions .btn { flex: 1; }
.fd-actions .btn { min-width: 0; }

.fd-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--mut);
  font-size: 15px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
}

/* Reviews drawer */
.fd-reviews {
  background: var(--soft);
  border-radius: 12px;
  padding: 14px 16px;
  margin-top: 4px;
}
.fd-reviews h4 {
  font-family: var(--font-head);
  font-size: 13px;
  margin: 0 0 10px;
  color: var(--ink);
}
.fd-review {
  padding: 10px 0;
  border-top: 1px dashed var(--line);
}
.fd-review:first-of-type { border-top: none; padding-top: 0; }
.fd-review-head {
  display: flex;
  justify-content: space-between;
  min-width: 0;
  gap: 10px;
  font-size: 12px;
  color: var(--mut);
  margin-bottom: 4px;
}
.fd-review-stars { color: #f59e0b; }
.fd-review p { font-size: 13px; line-height: 1.55; margin: 0; color: var(--ink); }

@media (max-width: 900px) {
  .fd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .fd-card { padding: 16px; gap: 11px; border-radius: 15px; }
  .fd-card-head { gap: 10px; }
  .fd-avatar { width: 42px; height: 42px; font-size: 17px; }
  .fd-name { font-size: 14px; }
  .fd-spec { font-size: 12px; }
  .fd-bio { font-size: 12px; }
  .fd-hosp { padding: 4px 8px; font-size: 10px; }
  .fd-rating { gap: 5px; font-size: 12px; }
  .fd-rating-count { font-size: 11px; }
  .fd-actions { gap: 6px; }
  .fd-actions .btn { padding: 7px 9px; font-size: 12px; }
}

@media (max-width: 600px) {
  .fd-page { gap: 16px; }
  .fd-header h1 { font-size: 25px; }
  .fd-toolbar { padding: 12px; gap: 8px; }
  .fd-search { flex-basis: 100%; min-width: 0; }
  .fd-search input,
  .fd-select { font-size: 16px; }
  .fd-select { flex: 1 1 100%; min-width: 0; }
  .fd-card { padding: 13px; gap: 9px; }
  .fd-avatar { width: 36px; height: 36px; font-size: 15px; }
  .fd-name { font-size: 13px; }
  .fd-years { font-size: 10px; }
  .fd-stars svg { width: 12px; height: 12px; }
  .fd-rating { flex-wrap: wrap; gap: 4px; }
  .fd-actions .btn { padding: 7px 5px; font-size: 11px; }
  .fd-hospitals { gap: 4px; }
  .fd-hosp { max-width: 100%; overflow-wrap: anywhere; }
  .fd-card-head > div { min-width: 0; overflow-wrap: anywhere; }
  .fd-rating-count { min-width: 0; overflow-wrap: anywhere; }
}

@media (max-width: 380px) {
  .fd-grid { grid-template-columns: minmax(0, 1fr); }
  .fd-card { padding: 16px; gap: 11px; }
  .fd-card-head { gap: 10px; }
  .fd-avatar { width: 42px; height: 42px; font-size: 17px; }
  .fd-name { font-size: 15px; }
  .fd-spec { font-size: 13px; }
  .fd-years { font-size: 12px; }
  .fd-bio { font-size: 13px; }
  .fd-actions .btn { padding: 9px 10px; font-size: 13px; }
}
`;

export default function FindDoctors() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSpecialtyId = searchParams.get('specialtyId') || '';
  const initialUrgency = searchParams.get('urgency') || null;

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  const [search, setSearch] = useState('');
  const [specialtyId, setSpecialtyId] = useState(initialSpecialtyId);
  const [hospitalId, setHospitalId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedReviews, setExpandedReviews] = useState(null);
  const [reviewsByDoctor, setReviewsByDoctor] = useState({});
  const [booking, setBooking] = useState(null);

  // Load lookups once
  useEffect(() => {
    Promise.all([api.getSpecialties(), api.getHospitals()])
      .then(([s, h]) => {
        setSpecialties(s.specialties || []);
        setHospitals(h.hospitals || []);
      })
      .catch(() => {});
  }, []);

  // Load doctors whenever the specialty changes
  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (specialtyId) params.set('specialtyId', specialtyId);
    const q = params.toString() ? `?${params.toString()}` : '';

    api.getDoctors(q)
      .then((r) => setDoctors(r.doctors || []))
      .catch((err) => setError(err.data?.error || 'Could not load doctors.'))
      .finally(() => setLoading(false));
  }, [specialtyId]);

  // Sync URL with current filters, preserve urgency
  useEffect(() => {
    const next = {};
    if (specialtyId) next.specialtyId = specialtyId;
    if (hospitalId) next.hospitalId = hospitalId;
    if (initialUrgency) next.urgency = initialUrgency;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtyId, hospitalId]);

  async function toggleReviews(doctor) {
    if (expandedReviews === doctor.id) {
      setExpandedReviews(null);
      return;
    }
    setExpandedReviews(doctor.id);
    if (!reviewsByDoctor[doctor.id]) {
      try {
        const r = await api.getDoctorReviews(doctor.id);
        setReviewsByDoctor((prev) => ({ ...prev, [doctor.id]: r }));
      } catch {
        setReviewsByDoctor((prev) => ({ ...prev, [doctor.id]: { reviews: [] } }));
      }
    }
  }

  const visible = doctors.filter((d) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const inName = d.user?.name?.toLowerCase().includes(q);
      const inSpec = d.specialty?.name?.toLowerCase().includes(q);
      if (!inName && !inSpec) return false;
    }
    if (hospitalId) {
      const hasHospital = (d.hospitals || []).some(
        (h) => String(h.hospital?.id) === String(hospitalId)
      );
      if (!hasHospital) return false;
    }
    return true;
  });

  const urgencyMessages = {
    urgent: 'Urgent case — you can book same-day at any nearby hospital.',
    moderate: 'Moderate case — book within the next week.',
    low: 'Low priority — book at least 2 days ahead.',
  };
  const showUrgencyBanner = initialUrgency && urgencyMessages[initialUrgency];

  const detailLink = (doctorId) => {
    const base = `/dashboard/doctors/${doctorId}`;
    return initialUrgency ? `${base}?urgency=${initialUrgency}` : base;
  };

  return (
    <div className="fd-page">
      <style>{CSS}</style>

      <header className="fd-header">
        <div>
          <h1>Find doctors</h1>
          <p className="fd-sub">
            {visible.length} doctor{visible.length === 1 ? '' : 's'}
            {specialtyId && specialties.find((s) => String(s.id) === String(specialtyId))
              ? ` · ${specialties.find((s) => String(s.id) === String(specialtyId)).name}`
              : ''}
          </p>
        </div>
      </header>

      {showUrgencyBanner && (
        <div className={`fd-urgency fd-urgency-${initialUrgency}`}>
          <span className="fd-urgency-dot" />
          <span>{urgencyMessages[initialUrgency]}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="fd-toolbar">
        <div className="fd-search">
          <Icon.Search />
          <input
            type="text"
            placeholder="Search by name or specialty…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="fd-select"
          value={specialtyId}
          onChange={(e) => setSpecialtyId(e.target.value)}
        >
          <option value="">All specialties</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="fd-select"
          value={hospitalId}
          onChange={(e) => setHospitalId(e.target.value)}
        >
          <option value="">All hospitals</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="fd-state">Loading doctors…</div>}
      {error && <div className="fd-state">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="fd-state">No doctors match your filters.</div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="fd-grid">
          {visible.map((d) => {
            const rating = d.avgRating ?? 0;
            const reviewCount = d.reviewCount ?? 0;
            const isExpanded = expandedReviews === d.id;
            const reviewData = reviewsByDoctor[d.id];

            return (
              <article key={d.id} className="fd-card">
                {/* Clickable header → detail page */}
                <Link to={detailLink(d.id)} className="fd-card-head">
                  <div className="fd-avatar">
                    {(d.user?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="fd-name">{d.user?.name ?? 'Unknown doctor'}</p>
                    <p className="fd-spec">{d.specialty?.name ?? 'General'}</p>
                    {d.yearsExperience != null && (
                      <p className="fd-years">{d.yearsExperience} years experience</p>
                    )}
                  </div>
                </Link>

                {d.bio && <p className="fd-bio">{d.bio}</p>}

                {d.hospitals?.length > 0 && (
                  <div className="fd-hospitals">
                    {d.hospitals.map((h) => (
                      <span key={h.hospital?.id} className="fd-hosp">
                        <Icon.Hospital />
                        {h.hospital?.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="fd-rating">
                  <span className="fd-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= Math.round(rating) ? '' : 'fd-stars-empty'}>
                        {n <= Math.round(rating) ? <Icon.Star /> : <Icon.StarEmpty />}
                      </span>
                    ))}
                  </span>
                  <span className="fd-rating-num">{reviewCount > 0 ? rating.toFixed(1) : '—'}</span>
                  <span className="fd-rating-count">
                    ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="fd-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      setBooking({ doctor: d, hospital: null, urgency: initialUrgency })
                    }
                  >
                    Book
                  </button>
                  <button
                    className="btn"
                    onClick={() => toggleReviews(d)}
                  >
                    {isExpanded ? 'Hide reviews' : 'Reviews'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="fd-reviews">
                    <h4>Patient reviews</h4>
                    {!reviewData ? (
                      <p style={{ fontSize: 13, color: 'var(--mut)' }}>Loading…</p>
                    ) : reviewData.reviews.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--mut)' }}>
                        No reviews yet.
                      </p>
                    ) : (
                      reviewData.reviews.slice(0, 3).map((r) => (
                        <div key={r.id} className="fd-review">
                          <div className="fd-review-head">
                            <span className="fd-review-stars">
                              {'★'.repeat(r.rating)}
                              <span style={{ color: '#d1d5db' }}>
                                {'★'.repeat(5 - r.rating)}
                              </span>
                            </span>
                            <span>{r.authorDisplay}</span>
                          </div>
                          {r.comment && <p>{r.comment}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {booking && (
        <BookingModal
          doctor={booking.doctor}
          preselectedHospitalId={booking.hospital?.id}
          urgency={booking.urgency}
          onClose={() => setBooking(null)}
          onBooked={() => setBooking(null)}
        />
      )}
    </div>
  );
}