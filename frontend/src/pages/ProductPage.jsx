import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProduct } from '../api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { Spinner, Breadcrumb } from '../components/common/index.jsx';
import StarRating from '../components/common/StarRating';
import PriceBlock from '../components/common/PriceBlock';
import ProductCard from '../components/common/ProductCard';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [addedMsg, setAddedMsg] = useState('');
  const [activeTab, setActiveTab] = useState('description');

  const { isWishlisted, toggle } = useWishlist(product?.id);

  useEffect(() => {
    setLoading(true);
    getProduct(slug)
      .then(r => {
        setProduct(r.data);
        if (r.data.variants?.length) setSelectedVariant(r.data.variants[0]);
      })
      .catch(() => navigate('/store', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="page-wrapper"><Spinner /></div>;
  if (!product) return null;

  const images = product.images || (product.main_image ? [product.main_image] : []);
  const currentImg = images[selectedImg];

  const handleAddCart = () => {
    addItem(product.id, selectedVariant?.id || null, qty);
    setAddedMsg('Added to cart!');
    setTimeout(() => setAddedMsg(''), 2500);
  };

  const handleBuyNow = () => {
    addItem(product.id, selectedVariant?.id || null, qty);
    navigate('/checkout');
  };

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Store', href: '/store' },
          ...(product.category_name ? [{ label: product.category_name, href: `/store?category=${product.category_slug}` }] : []),
          { label: product.name },
        ]} />

        {/* ── Main Layout ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, marginTop: 16 }}>

          {/* Images */}
          <div style={{ width: 60, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setSelectedImg(i)}
                style={{
                  width: 56, height: 56, border: `2px solid ${i === selectedImg ? 'var(--amz-orange)' : '#ddd'}`,
                  borderRadius: 4, overflow: 'hidden', cursor: 'pointer', flexShrink: 0
                }}
              >
                <img src={img.image || img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>

          {/* Main Image */}
          <div style={{
            maxWidth: 480, background: '#fff', borderRadius: 8,
            border: '1px solid #eee', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 24, aspectRatio: '1/1',
            position: 'relative'
          }}>
            {currentImg ? (
              <img
                src={currentImg.image || currentImg}
                alt={product.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <i className="bi bi-image" style={{ fontSize: '5rem', color: '#ddd' }} />
            )}
            <button
              onClick={() => toggle(product.id)}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: '#fff', border: '1px solid #ddd',
                borderRadius: '50%', width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: isWishlisted ? '#e74c3c' : '#aaa',
                fontSize: '1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,.1)'
              }}
            >
              <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
            </button>
          </div>

          {/* Info Panel */}
          <div style={{ minWidth: 280, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {product.is_amazon_choice && <span className="badge badge-choice">#1 Choice</span>}
              {product.is_best_seller && <span className="badge badge-hot">Best Seller</span>}
              {product.is_new_arrival && <span className="badge badge-new">New</span>}
              {product.is_prime && <span className="badge badge-prime"><i className="bi bi-lightning-fill" /> Prime</span>}
            </div>

            {/* Brand */}
            {product.brand_name && (
              <div style={{ fontSize: '.82rem', color: 'var(--amz-teal)' }}>
                <Link to={`/store?brand=${product.brand_slug}`} style={{ color: 'inherit' }}>
                  {product.brand_name}
                </Link>
              </div>
            )}

            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.4, margin: 0 }}>
              {product.name}
            </h1>

            {product.average_rating > 0 && (
              <StarRating rating={product.average_rating} count={product.review_count} />
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0' }} />

            <PriceBlock
              priceKes={product.effective_price_kes}
              priceUsd={product.effective_price_usd}
              oldKes={product.sale_price_kes ? product.price_kes : null}
              discount={product.discount_percent}
              large
            />

            {product.has_coupon && product.coupon_text && (
              <span className="badge badge-coupon">
                <i className="bi bi-tag-fill" style={{ marginRight: 4 }} />
                {product.coupon_text}
              </span>
            )}

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: 6 }}>Options:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '.82rem',
                        border: `2px solid ${selectedVariant?.id === v.id ? 'var(--amz-orange)' : '#ddd'}`,
                        background: selectedVariant?.id === v.id ? '#fff8ee' : '#fff',
                        fontWeight: selectedVariant?.id === v.id ? 700 : 400,
                      }}
                    >
                      {v.name || `${v.color || ''} ${v.storage || ''}`.trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div style={{ fontSize: '.88rem', fontWeight: 700, color: product.in_stock ? '#007600' : '#b12704' }}>
              {product.in_stock ? (
                <><i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />In Stock</>
              ) : (
                <><i className="bi bi-x-circle-fill" style={{ marginRight: 4 }} />Out of Stock</>
              )}
            </div>

            {/* Qty + Add */}
            {product.in_stock && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '.82rem', fontWeight: 600 }}>Qty:</label>
                  <select
                    className="form-control"
                    style={{ width: 70, padding: '5px 8px' }}
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                  >
                    {[...Array(Math.min(product.stock_quantity || 10, 10))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-amz-orange" style={{ width: '100%', padding: '10px', fontWeight: 700, borderRadius: 20 }} onClick={handleAddCart}>
                  <i className="bi bi-cart-plus" style={{ marginRight: 6 }} /> Add to Cart
                </button>
                <button className="btn-amz-secondary" style={{ width: '100%', padding: '10px', fontWeight: 700, borderRadius: 20 }} onClick={handleBuyNow}>
                  <i className="bi bi-lightning-fill" style={{ marginRight: 6 }} /> Buy Now
                </button>
                {addedMsg && (
                  <div style={{ color: '#007600', fontSize: '.82rem', textAlign: 'center', fontWeight: 600 }}>
                    <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />{addedMsg}
                  </div>
                )}
              </div>
            )}

            {/* Delivery info */}
            <div style={{ background: '#f7f7f7', borderRadius: 6, padding: '10px 12px', fontSize: '.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><i className="bi bi-truck" style={{ marginRight: 6, color: 'var(--amz-teal)' }} /><strong>Nairobi:</strong> Same day delivery</div>
              <div><i className="bi bi-geo-alt" style={{ marginRight: 6, color: 'var(--amz-teal)' }} /><strong>Kenya:</strong> 1–3 business days</div>
              <div><i className="bi bi-arrow-counterclockwise" style={{ marginRight: 6, color: 'var(--amz-teal)' }} />7-day returns</div>
              <div><i className="bi bi-shield-check" style={{ marginRight: 6, color: 'var(--amz-teal)' }} />100% Genuine</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #eee', gap: 0, marginBottom: 20 }}>
            {['description', 'specs', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 24px', border: 'none', background: 'none',
                  cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400,
                  borderBottom: activeTab === tab ? '2px solid var(--amz-orange)' : '2px solid transparent',
                  marginBottom: -2, fontSize: '.9rem', color: activeTab === tab ? '#111' : '#555',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <div style={{ maxWidth: 800, lineHeight: 1.7, fontSize: '.9rem' }}>
              {product.description
                ? <div dangerouslySetInnerHTML={{ __html: product.description }} />
                : <p style={{ color: 'var(--text-muted)' }}>No description available.</p>
              }
            </div>
          )}

          {activeTab === 'specs' && (
            <div style={{ maxWidth: 640 }}>
              {product.specifications?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                  <tbody>
                    {product.specifications.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#f7f7f7' : '#fff' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, width: '35%', borderBottom: '1px solid #eee' }}>{s.name}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No specifications available.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={{ maxWidth: 720 }}>
              {product.reviews?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {product.reviews.map(r => (
                    <div key={r.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <StarRating rating={r.rating} />
                        <strong style={{ fontSize: '.9rem' }}>{r.title}</strong>
                      </div>
                      <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        By {r.user_name} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                      <p style={{ fontSize: '.88rem', margin: 0 }}>{r.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first to review this product!</p>
              )}
            </div>
          )}
        </div>

        {/* ── Related Products ─────────────────────────── */}
        {product.related_products?.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <div className="section-header">
              <h2 className="section-title">Customers Also Viewed</h2>
            </div>
            <div className="product-strip">
              {product.related_products.map(p => (
                <div key={p.id} style={{ minWidth: 200, width: 200, flexShrink: 0 }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}