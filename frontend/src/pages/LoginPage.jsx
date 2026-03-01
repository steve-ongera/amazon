// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // ✅ FIX: backend LoginView reads `email` not `username`
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginUser(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      setError(
        data?.error || data?.detail || data?.non_field_errors?.[0] ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: 24 }}>
        <div style={styles.logo}>
          <i className="bi bi-phone-fill" style={{ color: 'var(--amz-orange)', fontSize: '1.7rem' }} />
          <span style={styles.logoText}>
            Amazon<span style={{ color: 'var(--amz-orange)' }}>KE</span>
          </span>
        </div>
      </Link>

      {/* Card */}
      <div style={styles.card}>
        <h1 style={styles.cardTitle}>Sign in</h1>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error">
            <i className="bi bi-exclamation-triangle-fill" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Email */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email address</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={styles.pwdLabelRow}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={styles.eyeBtn}
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
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><i className="bi bi-hourglass-split" style={{ marginRight: 6 }} />Signing in…</>
              : <><i className="bi bi-box-arrow-in-right" style={{ marginRight: 6 }} />Sign in</>
            }
          </button>
        </form>

        {/* Terms */}
        <p style={styles.terms}>
          By signing in you agree to Amazon Kenya's{' '}
          <Link to="/terms" style={styles.inlineLink}>Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" style={styles.inlineLink}>Privacy Policy</Link>.
        </p>
      </div>

      {/* Divider */}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>New to Amazon Kenya?</span>
        <div style={styles.dividerLine} />
      </div>

      {/* Create account */}
      <div style={{ width: '100%', maxWidth: 390 }}>
        <Link to="/register" state={{ from: location.state?.from }} style={{ textDecoration: 'none' }}>
          <button type="button" style={styles.createBtn}>
            <i className="bi bi-person-plus" style={{ marginRight: 6 }} />
            Create your Amazon Kenya account
          </button>
        </Link>
      </div>

      {/* Footer */}
      <FooterLinks />
    </div>
  );
}

function FooterLinks() {
  const links = ['Help', 'Terms', 'Privacy', 'Cookie Notice'];
  return (
    <div style={{ marginTop: 32, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
        {links.map((label, i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <a
              href={`/${label.toLowerCase().replace(' ', '-')}`}
              style={{ fontSize: '.72rem', color: 'var(--amz-link)', padding: '0 8px' }}
            >
              {label}
            </a>
            {i < links.length - 1 && <span style={{ color: '#ccc', fontSize: '.7rem' }}>|</span>}
          </span>
        ))}
      </div>
      <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
        © {new Date().getFullYear()} Amazon Kenya. All rights reserved.
      </p>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 'calc(var(--nav-top-h) + var(--nav-bottom-h) + 28px) 16px 48px',
    minHeight: '100vh',
    background: 'var(--bg-body)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize: '1.7rem',
    color: 'var(--text-primary)',
    letterSpacing: '-.5px',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    background: '#fff',
    border: '1px solid #d5d9d9',
    borderRadius: 'var(--radius-md)',
    padding: '26px 30px',
    boxShadow: '0 2px 12px rgba(0,0,0,.07)',
  },
  cardTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBottom: 20,
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  pwdLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  forgotLink: {
    fontSize: '.75rem',
    color: 'var(--amz-link)',
    textDecoration: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
    padding: 4,
    fontSize: '.95rem',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '10px 16px',
    background: 'linear-gradient(to bottom,#ffd76e,#f0a800)',
    border: '1px solid #c68a00',
    borderRadius: 4,
    fontSize: '.95rem',
    fontWeight: 700,
    color: '#111',
    marginTop: 4,
    transition: 'filter .15s',
  },
  terms: {
    fontSize: '.72rem',
    color: 'var(--text-muted)',
    marginTop: 16,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  inlineLink: {
    color: 'var(--amz-link)',
  },
  divider: {
    width: '100%',
    maxWidth: 390,
    margin: '20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#d5d9d9',
  },
  dividerText: {
    fontSize: '.72rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '10px 16px',
    background: 'linear-gradient(to bottom,#f5f5f5,#e8e8e8)',
    border: '1px solid #aaa',
    borderRadius: 4,
    fontSize: '.9rem',
    fontWeight: 700,
    color: '#111',
    cursor: 'pointer',
    transition: 'filter .15s',
  },
};