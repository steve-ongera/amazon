// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginUser(form.username, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '32px 16px 48px', minHeight: '100vh',
      background: 'var(--bg-body)',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-phone-fill" style={{ color: 'var(--amz-orange)', fontSize: '1.6rem' }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: '1.55rem', color: 'var(--text-primary)', letterSpacing: '-.5px'
          }}>
            Amazon<span style={{ color: 'var(--amz-orange)' }}>KE</span>
          </span>
        </div>
      </Link>

      {/* Sign-in box */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#fff', border: '1px solid #d5d9d9',
        borderRadius: 'var(--radius-md)', padding: '24px 28px',
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 18 }}>Sign in</h1>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            <i className="bi bi-exclamation-triangle-fill" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Username or Email</label>
            <input
              className="form-control"
              type="text"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="Enter username or email"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: '.75rem', color: 'var(--amz-link)' }}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#888', padding: 4, fontSize: '.95rem',
                }}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-amz-orange"
            style={{ width: '100%', padding: '10px 16px', borderRadius: 4, fontSize: '.95rem', fontWeight: 700, marginTop: 2 }}
          >
            {loading
              ? <><i className="bi bi-hourglass-split" style={{ marginRight: 6 }} />Signing in…</>
              : 'Sign in'
            }
          </button>
        </form>

        {/* Terms */}
        <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
          By signing in you agree to Amazon Kenya's{' '}
          <Link to="/terms" style={{ color: 'var(--amz-link)' }}>Terms of Service</Link> and{' '}
          <Link to="/privacy" style={{ color: 'var(--amz-link)' }}>Privacy Policy</Link>.
        </p>
      </div>

      {/* Divider */}
      <div style={{
        width: '100%', maxWidth: 380, margin: '18px 0',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, height: 1, background: '#d5d9d9' }} />
        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          New to Amazon Kenya?
        </span>
        <div style={{ flex: 1, height: 1, background: '#d5d9d9' }} />
      </div>

      {/* Create account */}
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link
          to="/register"
          state={{ from: location.state?.from }}
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <button
            type="button"
            className="btn-amz-secondary"
            style={{ width: '100%', padding: '10px 16px', fontSize: '.9rem', fontWeight: 700 }}
          >
            Create your Amazon Kenya account
          </button>
        </Link>
      </div>

      {/* Footer links */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Help', 'Terms', 'Privacy', 'Cookie Notice'].map((label, i, arr) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <a href={`/${label.toLowerCase().replace(' ', '-')}`}
                style={{ fontSize: '.72rem', color: 'var(--amz-link)', padding: '0 8px' }}>
                {label}
              </a>
              {i < arr.length - 1 && <span style={{ color: '#ccc', fontSize: '.7rem' }}>|</span>}
            </span>
          ))}
        </div>
        <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
          © {new Date().getFullYear()} Amazon Kenya. All rights reserved.
        </p>
      </div>
    </div>
  );
}