import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.data?.error || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-art">
        <Link to="/" className="auth-logo">
          <Logo size={42} variant="light" />
          <span>GuideCare</span>
        </Link>
        <h1>Welcome back.</h1>
        <p>
          Pick up where you left off — check your appointments, book a visit, or run a symptom check.
        </p>
        <div className="auth-art-blob auth-art-blob-a" />
        <div className="auth-art-blob auth-art-blob-b" />
      </aside>

      <main className="auth-form-wrap">
        <div className="auth-form">
          <h2>Sign in</h2>
          <p className="auth-sub">Use the email and password you registered with.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="sara@example.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="auth-foot">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
}