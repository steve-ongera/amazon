import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '40px 20px' }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, color: '#e8e8e8', lineHeight: 1, marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>
          Oops! Page not found.
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '.95rem' }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn-amz-orange" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 4, fontWeight: 700 }}>
            <i className="bi bi-house-fill" style={{ marginRight: 6 }} /> Go Home
          </Link>
          <Link to="/store" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 4, fontWeight: 600, border: '1px solid #ddd', color: '#333' }}>
            Browse Store
          </Link>
        </div>
      </div>
    </div>
  );
}