// src/pages/SearchPage.jsx
import { useSearchParams, Link } from 'react-router-dom';
import StorePage from './StorePage';

// SearchPage just renders StorePage which already handles ?q= param
export function SearchPage() {
  return <StorePage />;
}

// src/pages/WishlistPage.jsx
export function WishlistPage() {
  const { useWishlist } = require('../hooks/useWishlist');
  return null; // Handled inside ProfilePage wishlist tab
}

// src/pages/NotFoundPage.jsx
export function NotFoundPage() {
  return (
    <div className="page-wrapper">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '6rem', color: 'var(--amz-orange)', fontWeight: 900, lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.4rem', marginTop: 8, marginBottom: 8 }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Sorry, we looked everywhere but couldn't find the page you're looking for.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{
            background: 'linear-gradient(to bottom,#f0c14b,#e47911)', border: '1px solid #c45500',
            color: '#111', padding: '10px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 700
          }}>
            Go to Homepage
          </Link>
          <Link to="/store" style={{
            background: 'linear-gradient(to bottom,#f5f5f5,#e8e8e8)', border: '1px solid #aaa',
            color: '#111', padding: '10px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600
          }}>
            Browse Products
          </Link>
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>Or explore these pages:</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: '.85rem' }}>
            <Link to="/orders" style={{ color: 'var(--amz-link)' }}>Your Orders</Link>
            <Link to="/profile" style={{ color: 'var(--amz-link)' }}>Your Account</Link>
            <Link to="/cart" style={{ color: 'var(--amz-link)' }}>Your Cart</Link>
            <Link to="/help" style={{ color: 'var(--amz-link)' }}>Help Center</Link>
          </div>
        </div>
      </div>
    </div>
  );
}