// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  const categories = [
    { label: 'Phones', slug: 'phones' },
    { label: 'Laptops', slug: 'laptops' },
    { label: 'Tablets', slug: 'tablets' },
    { label: 'Accessories', slug: 'accessories' },
    { label: 'Smart Watches', slug: 'smart-watches' },
    { label: 'Audio', slug: 'audio' },
    { label: 'Gaming', slug: 'gaming' },
    { label: 'TV & Home', slug: 'tv-home' },
  ];

  return (
    <nav className="navbar">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="navbar-top">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <i className="bi bi-phone-fill navbar-logo-icon" />
          <span>Amazon</span>
          <span className="navbar-logo-ke">KE</span>
        </Link>

        {/* Deliver to */}
        <div className="navbar-deliver" style={{ display: 'flex' }}>
          <span><i className="bi bi-geo-alt-fill" style={{ fontSize: '.8rem' }} /> Deliver to</span>
          <strong>Kenya</strong>
        </div>

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <select className="navbar-search-category" aria-label="Category">
            <option>All</option>
            {categories.map(c => <option key={c.slug}>{c.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search phones, laptops, accessories..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            aria-label="Search"
          />
          <button type="submit" className="navbar-search-btn" aria-label="Search">
            <i className="bi bi-search" />
          </button>
        </form>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Account */}
          <div className="nav-dropdown" ref={userMenuRef}>
            <button
              className="nav-btn"
              onClick={() => setShowUserMenu(v => !v)}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <span style={{ color: '#ccc', fontSize: '.7rem' }}>
                {user ? `Hello, ${user.first_name || user.username}` : 'Hello, Sign in'}
              </span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                Account <i className="bi bi-caret-down-fill" style={{ fontSize: '.6rem' }} />
              </strong>
            </button>
            {showUserMenu && (
              <div className="nav-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: 200 }}>
                {!user ? (
                  <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                      <Link
                        to="/login"
                        className="btn-amz-orange"
                        style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 4, textDecoration: 'none', fontWeight: 700, background: 'linear-gradient(to bottom,#ffb347,#ff9900)', border: '1px solid #c45500', color: '#111' }}
                        onClick={() => setShowUserMenu(false)}
                      >
                        Sign In
                      </Link>
                      <div style={{ fontSize: '.75rem', marginTop: 6 }}>
                        New customer? <Link to="/register" onClick={() => setShowUserMenu(false)}>Start here</Link>
                      </div>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <span className="nav-dropdown-item" style={{ fontWeight: 700, color: '#555', cursor: 'default' }}>Your Account</span>
                      <Link to="/login" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>Sign In</Link>
                      <Link to="/register" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>Register</Link>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    <span className="nav-dropdown-item" style={{ fontWeight: 700, color: '#555', cursor: 'default' }}>Your Account</span>
                    <Link to="/profile" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <i className="bi bi-person me-2" /> Account
                    </Link>
                    <Link to="/orders" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <i className="bi bi-bag me-2" /> Orders
                    </Link>
                    <Link to="/wishlist" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <i className="bi bi-heart me-2" /> Wishlist
                    </Link>
                    <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
                    <button
                      className="nav-dropdown-item"
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', color: '#c7511f', fontWeight: 700 }}
                      onClick={() => { logoutUser(); setShowUserMenu(false); navigate('/'); }}
                    >
                      <i className="bi bi-box-arrow-right me-2" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Orders */}
          <Link to="/orders" className="nav-btn">
            <span style={{ color: '#ccc', fontSize: '.7rem' }}>Returns</span>
            <strong>& Orders</strong>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="nav-btn nav-cart" style={{ position: 'relative' }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <i className="bi bi-cart3" style={{ fontSize: '1.6rem' }} />
              {itemCount > 0 && (
                <span className="cart-count">{itemCount > 99 ? '99+' : itemCount}</span>
              )}
            </span>
            <strong style={{ alignSelf: 'flex-end' }}>Cart</strong>
          </Link>
        </div>
      </div>

      {/* ── Bottom Category Bar ─────────────────────────────── */}
      <div className="navbar-bottom">
        <button className="nav-cat-btn all-dept">
          <i className="bi bi-list" /> All
        </button>
        {categories.map(cat => (
          <Link
            key={cat.slug}
            to={`/store?category=${cat.slug}`}
            className="nav-cat-btn"
          >
            {cat.label}
          </Link>
        ))}
        <Link to="/store?filter=best_sellers" className="nav-cat-btn">🔥 Best Sellers</Link>
        <Link to="/store?filter=new_arrivals" className="nav-cat-btn">✨ New Arrivals</Link>
        <Link to="/store?filter=deals" className="nav-cat-btn">💰 Today's Deals</Link>
      </div>
    </nav>
  );
}