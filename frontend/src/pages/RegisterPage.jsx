// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Fields match RegisterSerializer exactly:
  // username, email, first_name, last_name, password, password2, phone
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    password2: '',       // ✅ FIX: backend expects `password2`, not `confirm_password`
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1); // 2-step form for better UX

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '', non_field_errors: '' }));
  };

  // Client-side validation mirrors backend RegisterSerializer
  const validateStep1 = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required';
    if (!form.username.trim())   e.username   = 'Username is required';
    if (!form.email.trim())      e.email      = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.password.length < 8)        e.password  = 'Password must be at least 8 characters';
    if (form.password !== form.password2) e.password2 = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      // ✅ Send exact fields RegisterSerializer expects
      await registerUser({
        first_name:  form.first_name,
        last_name:   form.last_name,
        username:    form.username,
        email:       form.email,
        phone:       form.phone,
        password:    form.password,
        password2:   form.password2,
      });
      navigate('/');
    } catch (err) {
      const data = err?.response?.data || {};
      // Map backend field errors back to form fields
      const mapped = {};
      Object.entries(data).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? v[0] : v;
      });
      setErrors(mapped);
      // If error is on step-1 fields, go back
      const step1Fields = ['first_name', 'last_name', 'username', 'email'];
      if (step1Fields.some(f => mapped[f])) setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const PwdStrength = ({ pwd }) => {
    if (!pwd) return null;
    const score = [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)]
      .filter(Boolean).length;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#b12704', '#e47911', '#007185', '#007600'];
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= score ? colors[score] : '#e0e0e0',
              transition: 'background .2s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: '.7rem', color: colors[score], fontWeight: 600 }}>
          {labels[score]}
        </span>
      </div>
    );
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
        <div style={styles.cardHeader}>
          <h1 style={styles.cardTitle}>Create account</h1>
          {/* Step indicator */}
          <div style={styles.stepIndicator}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  ...styles.stepDot,
                  background: step >= s ? 'var(--amz-orange)' : '#e0e0e0',
                  color: step >= s ? '#111' : '#999',
                  fontWeight: step >= s ? 800 : 500,
                }}>
                  {step > s ? <i className="bi bi-check" style={{ fontSize: '.75rem' }} /> : s}
                </div>
                <span style={{ fontSize: '.72rem', color: step === s ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s ? 700 : 400 }}>
                  {s === 1 ? 'Your info' : 'Security'}
                </span>
                {s < 2 && <div style={{ width: 24, height: 1, background: step > s ? 'var(--amz-orange)' : '#e0e0e0', margin: '0 4px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* General error */}
        {(errors.non_field_errors || errors.detail) && (
          <div className="alert alert-error">
            <i className="bi bi-exclamation-triangle-fill" />
            {errors.non_field_errors || errors.detail}
          </div>
        )}

        {/* ── STEP 1: Personal info ─────────────────── */}
        {step === 1 && (
          <form onSubmit={handleNext} style={styles.form}>
            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FieldGroup label="First name" required error={errors.first_name}>
                <input
                  className="form-control"
                  type="text"
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  placeholder="John"
                  autoFocus
                  style={{ borderColor: errors.first_name ? '#dc3545' : undefined }}
                />
              </FieldGroup>
              <FieldGroup label="Last name" required error={errors.last_name}>
                <input
                  className="form-control"
                  type="text"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  placeholder="Kamau"
                  style={{ borderColor: errors.last_name ? '#dc3545' : undefined }}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="Username" required error={errors.username}
              hint="This is how you'll appear on Amazon Kenya">
              <input
                className="form-control"
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="johnkamau"
                autoComplete="username"
                style={{ borderColor: errors.username ? '#dc3545' : undefined }}
              />
            </FieldGroup>

            <FieldGroup label="Email address" required error={errors.email}>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="john@example.com"
                autoComplete="email"
                style={{ borderColor: errors.email ? '#dc3545' : undefined }}
              />
            </FieldGroup>

            <FieldGroup label="Phone number" error={errors.phone} hint="Optional – for order updates via SMS">
              <div style={{ position: 'relative' }}>
                <span style={styles.phonePrefix}>+254</span>
                <input
                  className="form-control"
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="712 345 678"
                  style={{ paddingLeft: 48, borderColor: errors.phone ? '#dc3545' : undefined }}
                />
              </div>
            </FieldGroup>

            <button type="submit" style={styles.submitBtn}>
              Continue <i className="bi bi-arrow-right" style={{ marginLeft: 6 }} />
            </button>
          </form>
        )}

        {/* ── STEP 2: Password ──────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <FieldGroup label="Password" required error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  autoComplete="new-password"
                  style={{ paddingRight: 42, borderColor: errors.password ? '#dc3545' : undefined }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={styles.eyeBtn}
                  aria-label={showPwd ? 'Hide' : 'Show'}>
                  <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
              <PwdStrength pwd={form.password} />
            </FieldGroup>

            <FieldGroup label="Re-enter password" required error={errors.password2}>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.password2}
                  onChange={e => set('password2', e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  style={{ paddingRight: 42, borderColor: errors.password2 ? '#dc3545' : undefined }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} style={styles.eyeBtn}
                  aria-label={showConfirm ? 'Hide' : 'Show'}>
                  <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </FieldGroup>

            <p style={styles.terms}>
              By creating an account you agree to Amazon Kenya's{' '}
              <Link to="/terms" style={styles.inlineLink}>Terms of Service</Link> and{' '}
              <Link to="/privacy" style={styles.inlineLink}>Privacy Policy</Link>.
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ ...styles.backBtn }}
              >
                <i className="bi bi-arrow-left" style={{ marginRight: 4 }} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitBtn,
                  flex: 1,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? <><i className="bi bi-hourglass-split" style={{ marginRight: 6 }} />Creating account…</>
                  : <><i className="bi bi-person-check" style={{ marginRight: 6 }} />Create account</>
                }
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sign in link */}
      <div style={styles.signInBox}>
        <span style={{ fontSize: '.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
        </span>
        <Link
          to="/login"
          state={{ from: location.state?.from }}
          style={{ color: 'var(--amz-link)', fontWeight: 700, fontSize: '.88rem' }}
        >
          Sign in →
        </Link>
      </div>

      <FooterLinks />
    </div>
  );
}

/* ── Reusable field wrapper ───────────────────────────────── */
function FieldGroup({ label, required, error, hint, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--amz-red)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>
      )}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

function FooterLinks() {
  const links = ['Help', 'Terms', 'Privacy', 'Cookie Notice'];
  return (
    <div style={{ marginTop: 28, textAlign: 'center' }}>
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
    maxWidth: 420,
    background: '#fff',
    border: '1px solid #d5d9d9',
    borderRadius: 'var(--radius-md)',
    padding: '26px 30px',
    boxShadow: '0 2px 12px rgba(0,0,0,.07)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  cardTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '.72rem',
    transition: 'background .2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  phonePrefix: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '.82rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
    fontWeight: 600,
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
    cursor: 'pointer',
    transition: 'filter .15s',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    background: 'linear-gradient(to bottom,#f5f5f5,#e8e8e8)',
    border: '1px solid #aaa',
    borderRadius: 4,
    fontSize: '.9rem',
    fontWeight: 600,
    color: '#111',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  terms: {
    fontSize: '.72rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    margin: '2px 0',
  },
  inlineLink: {
    color: 'var(--amz-link)',
  },
  signInBox: {
    width: '100%',
    maxWidth: 420,
    marginTop: 14,
    background: '#fff',
    border: '1px solid #d5d9d9',
    borderRadius: 'var(--radius-md)',
    padding: '14px 20px',
    textAlign: 'center',
  },
};