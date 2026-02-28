// src/pages/AuthPages.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { login, register } from '../api';

function AuthLogo() {
  return (
    <Link to="/" className="auth-logo">
      <i className="bi bi-phone-fill auth-logo-icon" />
      PhonePlace Kenya
    </Link>
  );
}

export function LoginPage() {
  const { loginUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await login(form);
      loginUser(data.user, data.tokens);
      showToast(`Welcome back, ${data.user.first_name || data.user.username}!`, 'success');
      navigate(from);
    } catch (e) {
      const msg = e.response?.data?.error || 'Invalid email or password';
      setErrors({ general: msg });
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <AuthLogo />

      <div className="auth-box">
        <h1 className="auth-box-title">Sign in</h1>

        {errors.general && (
          <div className="alert alert-error">
            <i className="bi bi-exclamation-triangle-fill" /> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email"
              autoFocus
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <a href="/forgot-password" style={{ fontWeight: 400, color: 'var(--amz-link)', fontSize: '.78rem' }}>Forgot password?</a>
            </label>
            <input
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="current-password"
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn-amz-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <><i className="bi bi-hourglass-split" /> Signing in...</>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
          By signing in, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
        </p>

        <div className="auth-divider">New to PhonePlace Kenya?</div>

        <Link to="/register" style={{ display: 'block' }}>
          <button className="btn-amz-secondary" type="button" style={{ width: '100%' }}>
            Create your account
          </button>
        </Link>
      </div>

      <div className="auth-footer">
        <div className="footer-links" style={{ marginBottom: 4 }}>
          <a href="/help">Help</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
        <p>© {new Date().getFullYear()} PhonePlace Kenya</p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { loginUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    username: '', phone: '', password: '', password2: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const errs = {};
    if (!form.first_name) errs.first_name = 'Required';
    if (!form.last_name) errs.last_name = 'Required';
    if (!form.email) errs.email = 'Required';
    if (!form.username) errs.username = 'Required';
    if (form.password.length < 8) errs.password = 'Minimum 8 characters';
    if (form.password !== form.password2) errs.password2 = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await register(form);
      loginUser(data.user, data.tokens);
      showToast('Account created! Welcome to PhonePlace Kenya!', 'success');
      navigate('/');
    } catch (e) {
      const data = e.response?.data || {};
      const newErrs = {};
      Object.entries(data).forEach(([k, v]) => { newErrs[k] = Array.isArray(v) ? v[0] : v; });
      if (data.error) newErrs.general = data.error;
      setErrors(newErrs);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <AuthLogo />

      <div className="auth-box" style={{ maxWidth: 440 }}>
        <h1 className="auth-box-title">Create account</h1>

        {errors.general && (
          <div className="alert alert-error">
            <i className="bi bi-exclamation-triangle-fill" /> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">First name *</label>
              <input className="form-control" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
              {errors.first_name && <div className="form-error">{errors.first_name}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Last name *</label>
              <input className="form-control" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Kamau" />
              {errors.last_name && <div className="form-error">{errors.last_name}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email address *</label>
            <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)} placeholder="johnkamau" />
            {errors.username && <div className="form-error">{errors.username}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0712345678" />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password *</label>
            <input className="form-control" type="password" value={form.password2} onChange={e => set('password2', e.target.value)} placeholder="Repeat password" />
            {errors.password2 && <div className="form-error">{errors.password2}</div>}
          </div>

          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', margin: '8px 0' }}>
            By creating an account, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
          </p>

          <button type="submit" className="btn-amz-primary" disabled={loading}>
            {loading ? <><i className="bi bi-hourglass-split" /> Creating account...</> : 'Create your PhonePlace account'}
          </button>
        </form>

        <div className="auth-divider">Already have an account?</div>

        <Link to="/login">
          <button className="btn-amz-secondary" type="button" style={{ width: '100%' }}>
            Sign in
          </button>
        </Link>
      </div>

      <div className="auth-footer">
        <div className="footer-links" style={{ marginBottom: 4 }}>
          <a href="/help">Help</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
        <p>© {new Date().getFullYear()} PhonePlace Kenya</p>
      </div>
    </div>
  );
}