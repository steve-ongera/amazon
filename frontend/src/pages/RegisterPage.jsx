import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', email: '', phone: '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.username.trim()) e.username = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    if (form.password.length < 8) e.password = 'Minimum 8 characters';
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
    } finally { setLoading(false); }
  };

  const Field = ({ name, label, type = 'text', placeholder }) => (
    <div>
      <label style={{ fontSize: '.85rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        className="form-control"
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        style={{ borderColor: errors[name] ? '#dc3545' : undefined }}
      />
      {errors[name] && <div style={{ fontSize: '.75rem', color: '#dc3545', marginTop: 3 }}>{errors[name]}</div>}
    </div>
  );

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#111' }}>
              Amazon<span style={{ color: 'var(--amz-orange)' }}>KE</span>
            </span>
          </Link>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '28px 24px', background: '#fff' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Create account</h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field name="first_name" label="First Name" />
              <Field name="last_name" label="Last Name" />
            </div>
            <Field name="username" label="Username" />
            <Field name="email" label="Email" type="email" />
            <Field name="phone" label="Phone Number" placeholder="e.g. 0712 345 678" />

            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ paddingRight: 40, borderColor: errors.password ? '#dc3545' : undefined }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                  <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
              {errors.password && <div style={{ fontSize: '.75rem', color: '#dc3545', marginTop: 3 }}>{errors.password}</div>}
            </div>

            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Confirm Password</label>
              <input
                className="form-control"
                type="password"
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                style={{ borderColor: errors.confirm_password ? '#dc3545' : undefined }}
              />
              {errors.confirm_password && <div style={{ fontSize: '.75rem', color: '#dc3545', marginTop: 3 }}>{errors.confirm_password}</div>}
            </div>

            {errors.non_field_errors && (
              <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '10px 14px', fontSize: '.85rem', color: '#721c24' }}>
                {errors.non_field_errors}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-amz-orange"
              style={{ width: '100%', padding: '10px', borderRadius: 4, fontWeight: 700, fontSize: '.95rem', marginTop: 4 }}
            >
              {loading ? 'Creating account…' : 'Create your account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, padding: '16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
          <span style={{ fontSize: '.88rem' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--amz-teal)', fontWeight: 700, fontSize: '.88rem' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}