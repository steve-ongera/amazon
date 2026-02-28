// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../hooks/useWishlist';
import { updateProfile, changePassword } from '../api';
import { Spinner } from '../components/common/index.jsx';
import ProductCard from '../components/common/ProductCard';

const TABS = [
  { id: 'account', icon: 'bi-person-fill', label: 'Account Info' },
  { id: 'orders', icon: 'bi-bag-check', label: 'My Orders' },
  { id: 'wishlist', icon: 'bi-heart-fill', label: 'Wishlist' },
  { id: 'password', icon: 'bi-shield-lock', label: 'Password' },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { wishlist } = useWishlist();
  const [tab, setTab] = useState('account');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', preferred_currency: 'USD',
  });

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', new_password2: '' });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        preferred_currency: user.profile?.preferred_currency || 'USD',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      await refreshUser();
      showToast('Profile updated!', 'success');
    } catch { showToast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.new_password2) {
      showToast('Passwords do not match', 'error'); return;
    }
    setSaving(true);
    try {
      await changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password });
      showToast('Password changed!', 'success');
      setPwForm({ old_password: '', new_password: '', new_password2: '' });
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  if (!user) return <div className="page-wrapper"><Spinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>
          <i className="bi bi-person-circle" style={{ color: 'var(--amz-orange)', marginRight: 8 }} />
          Your Account
        </h1>

        <div className="profile-layout">
          {/* Sidebar */}
          <div>
            {/* User card */}
            <div className="amz-panel" style={{ marginBottom: 8, textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--amz-teal)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 800, margin: '0 auto 8px'
              }}>
                {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>

            <div className="profile-sidebar">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`profile-nav-btn ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <i className={`bi ${t.icon}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            {/* Account Info */}
            {tab === 'account' && (
              <div className="amz-panel">
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Account Information</h2>
                <form onSubmit={handleSaveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input className="form-control" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input className="form-control" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Email Address</label>
                      <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0712345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Preferred Currency</label>
                      <select className="form-control" value={form.preferred_currency} onChange={e => setForm(f => ({ ...f, preferred_currency: e.target.value }))}>
                        <option value="USD">USD – US Dollar</option>
                        <option value="KES">KES – Kenyan Shilling</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 4, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                    <strong>Member since:</strong> {new Date(user.date_joined).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}
                  </div>

                  <button type="submit" className="btn-amz-primary" style={{ marginTop: 16, maxWidth: 200 }} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Orders tab */}
            {tab === 'orders' && (
              <div className="amz-panel">
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Recent Orders</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 12 }}>
                  View your complete order history on the <Link to="/orders">My Orders</Link> page.
                </p>
                <Link to="/orders" className="btn-amz" style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 20px', borderRadius: 4 }}>
                  <i className="bi bi-bag-check" style={{ marginRight: 6 }} /> View All Orders
                </Link>
              </div>
            )}

            {/* Wishlist */}
            {tab === 'wishlist' && (
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>My Wish List ({wishlist.length})</h2>
                {wishlist.length === 0 ? (
                  <div className="amz-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <i className="bi bi-heart" style={{ fontSize: '3rem', color: '#ccc', marginBottom: 12, display: 'block' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Your wishlist is empty.</p>
                    <Link to="/store" style={{ color: 'var(--amz-link)', marginTop: 8, display: 'inline-block' }}>Discover products</Link>
                  </div>
                ) : (
                  <div className="product-grid">
                    {wishlist.map(w => w.product && <ProductCard key={w.id} product={w.product} />)}
                  </div>
                )}
              </div>
            )}

            {/* Password */}
            {tab === 'password' && (
              <div className="amz-panel">
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Change Password</h2>
                <form onSubmit={handleChangePassword} style={{ maxWidth: 360 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input className="form-control" type="password" value={pwForm.old_password} onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="form-control" type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} required minLength={8} />
                    <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 3 }}>Minimum 8 characters</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input className="form-control" type="password" value={pwForm.new_password2} onChange={e => setPwForm(f => ({ ...f, new_password2: e.target.value }))} required />
                  </div>
                  <button type="submit" className="btn-amz-primary" style={{ maxWidth: 200 }} disabled={saving}>
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}