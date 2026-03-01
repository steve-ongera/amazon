// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '',
    email: '', phone: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.username.trim())   e.username   = 'Username is required';
    if (!form.email.trim())      e.email      = 'Email is required';
    if (form.password.length < 8) e.password  = 'Minimum 8 characters';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(form);
      navigate('/');
    } catch (err) {
      const data = err?.response?.data || {};
      const mapped = {};
      Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
      setErrors(mapped);
    } finally {
      setLoading(false);
    }
  };

  // Reusable field component
  const Field = ({ name, label, type = 'text', placeholder, required = false }) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">
        {label}{required && <span style={{ color: 'var(--amz-red)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        className="form-control"
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        style={{ borderColor: errors[name] ? '#dc3545' : undefined }}
        autoComplete={type === 'email' ? 'email' : undefined}
      />
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  );

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

      {/* Registration box */}
      <div style={{
        width: '100%', maxWidth: 430,
        background: '#fff', border: '1px solid #d5d9d9',
        borderRadius: 'var(--radius-md)', padding: '24px 28px',
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 18 }}>Create account</h1>

        {/* General error */}
        {errors.non_field_errors && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            <i className="bi bi-exclamation-triangle-fill" />
            {errors.non_field_errors}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field name="first_name" label="First name" placeholder="John" required />
            <Field name="last_name"  label="Last name"  placeholder="Kamau" />
          </div>

          <Field name="username" label="Username"     placeholder="johnkamau" required />
          <Field name="email"    label="Email address" type="email" placeholder="john@example.com" required />
          <Field name="phone"    label="Phone number"  placeholder="0712 345 678" />

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Password <span style={{ color: 'var(--amz-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={{ paddingRight: 40, borderColor: errors.password ? '#dc3545' : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4,
                }}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          {/* Confirm password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Confirm password <span style={{ color: 'var(--amz-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                style={{ paddingRight: 40, borderColor: errors.confirm_password ? '#dc3545' : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4,
                }}
                aria-label={showConfirm ? 'Hide' : 'Show'}
              >
                <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            {errors.confirm_password && <div className="form-error">{errors.confirm_password}</div>}
          </div>

          {/* Terms notice */}
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '4px 0' }}>
            By creating an account, you agree to Amazon Kenya's{' '}
            <Link to="/terms" style={{ color: 'var(--amz-link)' }}>Terms of Service</Link> and{' '}
            <Link to="/privacy" style={{ color: 'var(--amz-link)' }}>Privacy Policy</Link>.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-amz-orange"
            style={{ width: '100%', padding: '10px 16px', borderRadius: 4, fontSize: '.95rem', fontWeight: 700 }}
          >
            {loading
              ? <><i className="bi bi-hourglass-split" style={{ marginRight: 6 }} />Creating account…</>
              : 'Create your Amazon Kenya account'
            }
          </button>
        </form>
      </div>

      {/* Sign in link */}
      <div style={{
        width: '100%', maxWidth: 430, marginTop: 16,
        background: '#fff', border: '1px solid #d5d9d9',
        borderRadius: 'var(--radius-md)', padding: '14px 20px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '.88rem' }}>Already have an account? </span>
        <Link
          to="/login"
          state={{ from: location.state?.from }}
          style={{ color: 'var(--amz-teal)', fontWeight: 800, fontSize: '.88rem' }}
        >
          Sign in
        </Link>
      </div>

      {/* Footer links */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
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