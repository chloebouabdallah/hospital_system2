import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';
import './DashboardLayout.css';

// ---- Simple line icons (inline SVG, currentColor) ----
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </svg>
  ),
  Doctor: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v6a5 5 0 0 0 10 0V4M4 4h3M14 4h3" />
      <path d="M11 15v1.5a4 4 0 0 0 8 0v-2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  ),
  Hospital: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="1.5" />
      <path d="M12 8v6M9 11h6M4 21h16" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13 11l2.5 1L13 13l-1 2.5L11 13l-2.5-1L11 11z" />
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  ),
  Question: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  Book: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2z" />
      <path d="M4 17a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Cog: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M17 6.5a2.5 2.5 0 0 1 0 5M21 20c0-2.5-1.6-4.2-4-4.8" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13l2-7h12l2 7v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 13h4l1 2h6l1-2h4" />
    </svg>
  ),
};

// ---- Nav items per role ----
const NAV = {
  patient: [
    { to: '/dashboard', label: 'Overview', Icon: Icon.Home, end: true },
    { to: '/dashboard/symptom-checker', label: 'Symptom checker', Icon: Icon.Activity },
    { to: '/dashboard/find-doctors', label: 'Find doctors', Icon: Icon.Doctor },
    { to: '/dashboard/appointments', label: 'My appointments', Icon: Icon.Calendar },
    { to: '/dashboard/hospitals', label: 'Hospitals', Icon: Icon.Hospital },
    { to: '/dashboard/profile', label: 'Profile', Icon: Icon.User },
  ],
  doctor: [
    { to: '/dashboard', label: 'Overview', Icon: Icon.Home, end: true },
    { to: '/dashboard/schedule', label: 'My schedule', Icon: Icon.Clock },
    { to: '/dashboard/appointments', label: 'Appointments', Icon: Icon.Calendar },
    { to: '/dashboard/reviews', label: 'My reviews', Icon: Icon.Star },
    { to: '/dashboard/profile', label: 'Profile', Icon: Icon.User },
  ],
  admin: [
    { to: '/dashboard', label: 'Overview', Icon: Icon.Home, end: true },
    { to: '/dashboard/appointments', label: 'Appointments', Icon: Icon.Calendar },
    { to: '/dashboard/doctors', label: 'Doctors', Icon: Icon.Doctor },
    { to: '/dashboard/hospitals', label: 'Hospitals', Icon: Icon.Hospital },
    { to: '/dashboard/schedules', label: 'Schedules', Icon: Icon.Clock },
    { to: '/dashboard/specialties', label: 'Specialties', Icon: Icon.Sparkle },
    { to: '/dashboard/symptoms', label: 'Symptoms', Icon: Icon.Activity },
    { to: '/dashboard/questions', label: 'Questions', Icon: Icon.Question },
    { to: '/dashboard/conditions', label: 'Conditions', Icon: Icon.Book },
    { to: '/dashboard/rules', label: 'Triage rules', Icon: Icon.Cog },
    { to: '/dashboard/reviews', label: 'Reviews', Icon: Icon.Star },
    { to: '/dashboard/users', label: 'Users', Icon: Icon.Users },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role ?? 'patient';
  const items = NAV[role] ?? NAV.patient;

  // Close the drawer whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="dl-shell">
      {/* Dark overlay behind the drawer (mobile only) */}
      {menuOpen && (
        <button
          type="button"
          className="dl-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`dl-side${menuOpen ? ' is-open' : ''}`}>
        {/* Sidebar head: brand + X button */}
        <div className="dl-side-head">
          <Link to="/dashboard" className="dl-brand">
            <Logo size={26} />
            <span>GuideCare</span>
          </Link>
          <button
            type="button"
            className="dl-side-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="dl-nav" id="dashboard-navigation">
          {items.map(({ to, label, Icon: IconComp, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `dl-link${isActive ? ' is-active' : ''}`}
            >
              <span className="dl-link-icon" aria-hidden="true">
                <IconComp />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dl-side-foot">
          <p className="dl-role">Signed in as</p>
          <p className="dl-name">{user?.name}</p>
          <span className={`dl-badge dl-badge-${role}`}>{role}</span>
        </div>
      </aside>

      <div className="dl-main">
        <header className="dl-top">
          <button
            type="button"
            className="dl-menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="dashboard-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={menuOpen ? 'is-open' : ''} />
            <span className={menuOpen ? 'is-open' : ''} />
            <span className={menuOpen ? 'is-open' : ''} />
          </button>
          <div className="dl-top-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className="btn btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="dl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}