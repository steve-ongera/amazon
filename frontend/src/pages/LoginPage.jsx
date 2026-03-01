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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(form.username, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid username or password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#111' }}>
              Amazon<span style={{ color: 'var(--amz-orange)' }}>KE</span>
            </span>
          </Link>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '28px 24px', background: '#fff' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Sign in</h1>

          {error && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, padding: '10px 14px', marginBottom: 16, fontSize: '.85rem', color: '#856404', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-exclamation-triangle-fill" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Username or Email</label>
              <input
                className="form-control"
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                  <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-amz-orange"
              style={{ width: '100%', padding: '10px', borderRadius: 4, fontWeight: 700, fontSize: '.95rem', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
            By signing in you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, padding: '16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
          <span style={{ fontSize: '.88rem' }}>New to AmazonKE? </span>
          <Link to="/register" state={{ from: location.state?.from }} style={{ color: 'var(--amz-teal)', fontWeight: 700, fontSize: '.88rem' }}>
            Create your account
          </Link>
        </div>
      </div>
    </div>
  );
}