import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import './Auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.data?.error || 'Registration failed.');
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
        <h1>Start your health journey.</h1>
        <p>
          Create a free patient account. Check symptoms, find the right specialist, and book visits
          at hospitals near you.
        </p>
        <div className="auth-art-blob auth-art-blob-a" />
        <div className="auth-art-blob auth-art-blob-b" />
      </aside>

      <main className="auth-form-wrap">
        <div className="auth-form">
          <h2>Create a patient account</h2>
          <p className="auth-sub">
            Doctor and admin accounts are created by an administrator.
          </p>

          {success ? (
            <p className="success">Account created! Redirecting to sign in...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="min 8 chars, 1 letter + 1 number"
                />
              </div>

              {error && <p className="error">{error}</p>}

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          <p className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}