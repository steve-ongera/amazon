// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHomepage } from '../api';
import { Spinner } from '../components/common/index.jsx';
import ProductCard from '../components/common/ProductCard';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const sliderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    getHomepage()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-slide banners
  useEffect(() => {
    if (!data?.banners?.length) return;
    const id = setInterval(() => setSlide(s => (s + 1) % data.banners.length), 5000);
    return () => clearInterval(id);
  }, [data?.banners]);

  if (loading) return <div className="page-wrapper"><Spinner /></div>;

  const banners = data?.banners || [];
  const categories = data?.featured_categories || [];
  const bestSellers = data?.best_sellers || [];
  const newArrivals = data?.new_arrivals || [];
  const featured = data?.featured_products || [];
  const promos = data?.promo_banners || [];

  return (
    <div className="page-wrapper">
      {/* ── Hero Slider ──────────────────────────────────── */}
      {banners.length > 0 ? (
        <div className="hero-slider" style={{ height: 400 }}>
          {banners.map((b, i) => (
            <div key={b.id} className={`hero-slide ${i === slide ? 'active' : ''}`}>
              <img
                src={b.image}
                alt={b.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {b.title && (
                <div style={{
                  position: 'absolute', bottom: 40, left: 40,
                  background: 'rgba(0,0,0,.5)', color: '#fff',
                  padding: '16px 24px', borderRadius: 4, maxWidth: 400
                }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>{b.title}</h2>
                  {b.subtitle && <p style={{ fontSize: '.9rem', color: '#eee', marginBottom: 10 }}>{b.subtitle}</p>}
                  {b.link && (
                    <Link to={b.link} style={{
                      background: 'linear-gradient(to bottom,#f0c14b,#e47911)',
                      border: '1px solid #c45500', color: '#111',
                      padding: '8px 16px', borderRadius: 4, fontWeight: 700, fontSize: '.85rem',
                      textDecoration: 'none', display: 'inline-block'
                    }}>
                      {b.cta_text || 'Shop now'} <i className="bi bi-arrow-right" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="hero-arrows">
            <button className="hero-arrow" onClick={() => setSlide(s => (s - 1 + banners.length) % banners.length)}>
              <i className="bi bi-chevron-left" />
            </button>
            <button className="hero-arrow" onClick={() => setSlide(s => (s + 1) % banners.length)}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
          <div className="hero-dots">
            {banners.map((_, i) => (
              <button key={i} className={`hero-dot ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} />
            ))}
          </div>
        </div>
      ) : (
        /* Fallback hero */
        <div className="hero-slider-static" style={{ minHeight: 360 }}>
          <div className="hero-content" style={{ maxWidth: 560 }}>
            <div style={{ fontSize: '.85rem', color: 'var(--amz-orange)', fontWeight: 700, marginBottom: 4 }}>
              🇰🇪 Kenya's #1 Electronics Store
            </div>
            <h1>Phones, Laptops &amp; More</h1>
            <p>Get the latest tech delivered across Kenya. Pay with M-Pesa or PayPal.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/store" style={{
                background: 'linear-gradient(to bottom,#f0c14b,#e47911)',
                border: '1px solid #c45500', color: '#111',
                padding: '10px 24px', borderRadius: 4, fontWeight: 700,
                textDecoration: 'none', fontSize: '.95rem'
              }}>
                Shop Now <i className="bi bi-arrow-right" />
              </Link>
              <Link to="/store?filter=deals" style={{
                background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.4)',
                color: '#fff', padding: '10px 24px', borderRadius: 4, fontWeight: 600,
                textDecoration: 'none', fontSize: '.95rem'
              }}>
                Today's Deals
              </Link>
            </div>
          </div>
          {/* Decorative circles */}
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 80 + i * 40, height: 80 + i * 40,
              borderRadius: '50%',
              border: '1px solid rgba(255,153,0,.15)',
              right: 80 - i * 20, top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }} />
          ))}
        </div>
      )}

      <div className="amz-container" style={{ padding: '16px' }}>
        {/* ── Promo Strip ──────────────────────────────────── */}
        {promos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 16 }}>
            {promos.map(p => (
              <Link key={p.id} to={p.link || '#'} style={{
                background: p.bg_color || '#232f3e',
                borderRadius: 4, overflow: 'hidden',
                display: 'block', textDecoration: 'none',
                transition: 'transform .2s'
              }}>
                <img src={p.image} alt={p.title} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
              </Link>
            ))}
          </div>
        )}

        {/* ── Featured Categories ───────────────────────────── */}
        {categories.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">Shop by Category</h2>
              <Link to="/store" className="section-see-all">See all <i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="category-grid">
              {categories.map(cat => (
                <Link key={cat.id} to={`/store?category=${cat.slug}`} className="category-card">
                  <div className="category-card-icon">
                    {cat.image
                      ? <img src={cat.image} alt={cat.name} />
                      : <i className={`bi ${cat.icon || 'bi-grid'}`} />
                    }
                  </div>
                  <div className="category-card-name">{cat.name}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{cat.product_count} items</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Best Sellers ──────────────────────────────────── */}
        {bestSellers.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">
                <i className="bi bi-fire" style={{ color: 'var(--amz-red)', marginRight: 6 }} />
                Best Sellers
              </h2>
              <Link to="/store?filter=best_sellers" className="section-see-all">See all <i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="product-strip">
              {bestSellers.map(p => (
                <div key={p.id} style={{ minWidth: 200, width: 200, flexShrink: 0 }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick Feature Banner ──────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--amz-teal) 0%, var(--amz-navy) 100%)',
          borderRadius: 8, padding: '24px 32px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
          gap: 24, marginBottom: 24, color: '#fff'
        }}>
          {[
            { icon: 'bi-truck', title: 'Fast Delivery', text: 'Nairobi: Same day · Kenya: 1-3 days' },
            { icon: 'bi-shield-check', title: '100% Genuine', text: 'All products are verified authentic' },
            { icon: 'bi-phone-fill', title: 'M-Pesa Payments', text: 'Pay easily with Lipa na M-Pesa' },
            { icon: 'bi-arrow-counterclockwise', title: '7-Day Returns', text: 'Hassle-free return policy' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className={`bi ${f.icon}`} style={{ fontSize: '1.8rem', color: 'var(--amz-orange)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: '.78rem', color: '#bbb' }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── New Arrivals ──────────────────────────────────── */}
        {newArrivals.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">
                <i className="bi bi-stars" style={{ color: 'var(--amz-orange)', marginRight: 6 }} />
                New Arrivals
              </h2>
              <Link to="/store?filter=new_arrivals" className="section-see-all">See all <i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="product-strip">
              {newArrivals.map(p => (
                <div key={p.id} style={{ minWidth: 200, width: 200, flexShrink: 0 }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured Products Grid ────────────────────────── */}
        {featured.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">Featured Products</h2>
              <Link to="/store?filter=featured" className="section-see-all">See all <i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="product-grid">
              {featured.slice(0, 12).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── No products fallback ──────────────────────────── */}
        {featured.length === 0 && bestSellers.length === 0 && newArrivals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="bi bi-box-seam" style={{ fontSize: '4rem', color: '#ccc', display: 'block', marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8 }}>Stock coming soon!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              We're adding products to the store. Check back soon.
            </p>
            <Link to="/store" className="btn-amz-orange" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 4,
              textDecoration: 'none', fontWeight: 700, fontSize: '.95rem',
              background: 'linear-gradient(to bottom,#ffb347,#ff9900)',
              border: '1px solid #c45500', color: '#111'
            }}>
              Browse Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}