import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';

// Shared top bar for public pages. Shows "Open dashboard" when the cookie session is valid.
export default function PublicNav() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <nav className="pnav">
      <Link to="/" className="logo"><Logo />GuideCare</Link>
      <div className="pnav-actions">
        <button className="btn btn-ghost btn-sm" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {user ? (
          <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link>
        ) : (
          <>
            <Link className="btn btn-ghost" to="/login">Sign in</Link>
            <Link className="btn btn-primary" to="/register">Create account</Link>
          </>
        )}
      </div>
    </nav>
  );
}
