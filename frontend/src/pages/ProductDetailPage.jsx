// src/pages/ProductDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProduct, getRelated } from '../api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { Spinner, Breadcrumb } from '../components/common/index.jsx';
import StarRating from '../components/common/StarRating';
import PriceBlock from '../components/common/PriceBlock';
import ProductCard from '../components/common/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [addingCart, setAddingCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  const { isWishlisted, toggle } = useWishlist(product?.id);

  useEffect(() => {
    setLoading(true);
    getProduct(slug)
      .then(r => {
        setProduct(r.data);
        setActiveImg(0);
        setSelectedVariant(r.data.variants?.[0] || null);
      })
      .catch(() => navigate('/store'))
      .finally(() => setLoading(false));

    getRelated(slug).then(r => setRelated(r.data)).catch(() => {});
  }, [slug]);

  if (loading) return <div className="page-wrapper"><Spinner /></div>;
  if (!product) return null;

  const images = product.images || [];
  const currentImg = images[activeImg];
  const variants = product.variants || [];
  const specs = product.specifications || [];
  const reviews = product.reviews || [];

  // Colors and storage groups
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const storages = [...new Set(variants.map(v => v.storage).filter(Boolean))];
  const rams = [...new Set(variants.map(v => v.ram).filter(Boolean))];

  const effectiveVariant = selectedVariant || product;
  const priceKes = effectiveVariant.effective_price_kes || product.effective_price_kes || 0;
  const priceUsd = effectiveVariant.effective_price_usd || product.effective_price_usd || 0;
  const oldKes = (effectiveVariant.sale_price_kes || product.sale_price_kes) ? (effectiveVariant.price_kes || product.price_kes) : null;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : product.in_stock;

  const handleAddCart = async () => {
    setAddingCart(true);
    await addItem(product.id, selectedVariant?.id, qty);
    setAddingCart(false);
  };

  const handleBuyNow = async () => {
    setAddingCart(true);
    const ok = await addItem(product.id, selectedVariant?.id, qty);
    setAddingCart(false);
    if (ok) navigate('/cart');
  };

  // Rating breakdown
  const breakdown = product.rating_breakdown || {};

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '12px 16px' }}>
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: product.category?.name || 'Category', href: `/store?category=${product.category?.slug}` },
          { label: product.brand?.name || 'Brand', href: `/store?brand=${product.brand?.slug}` },
          { label: product.name },
        ]} />

        {/* ── Main Product Section ─────────────────────────── */}
        <div className="product-detail-layout">
          {/* Images Column */}
          <div className="product-images-col">
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              {/* Thumbnails + Main */}
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="product-thumbs" style={{ flexDirection: 'column' }}>
                    {images.map((img, i) => (
                      <div
                        key={img.id}
                        className={`product-thumb ${i === activeImg ? 'active' : ''}`}
                        onClick={() => setActiveImg(i)}
                      >
                        <img src={img.image} alt={img.alt_text || product.name} />
                      </div>
                    ))}
                  </div>
                )}
                {/* Main image */}
                <div className="product-main-img" style={{ flex: 1 }}>
                  {currentImg ? (
                    <img src={currentImg.image} alt={currentImg.alt_text || product.name} />
                  ) : (
                    <i className="bi bi-image" style={{ fontSize: '5rem', color: '#ccc' }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Column */}
          <div className="product-info-col">
            {/* Badges */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {product.is_amazon_choice && <span className="badge badge-choice"><i className="bi bi-award" /> Amazon's Choice</span>}
              {product.is_best_seller && <span className="badge badge-hot">Best Seller</span>}
              {product.is_prime && <span className="badge badge-prime"><i className="bi bi-lightning-fill" /> Prime</span>}
              {product.is_new_arrival && <span className="badge badge-new">New Arrival</span>}
            </div>

            {/* Brand */}
            <div>
              <Link to={`/store?brand=${product.brand?.slug}`} style={{ fontSize: '.85rem', color: 'var(--amz-link)' }}>
                {product.brand?.name}
              </Link>
            </div>

            {/* Title */}
            <h1 className="product-title" style={{ fontSize: '1.2rem' }}>{product.name}</h1>

            {/* Rating */}
            {product.average_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StarRating rating={product.average_rating} count={product.review_count} />
                <a href="#reviews" style={{ fontSize: '.78rem', color: 'var(--amz-link)' }}>
                  {product.review_count} ratings
                </a>
              </div>
            )}

            {/* ASIN */}
            <div className="product-asin">ASIN: {product.asin} &nbsp;|&nbsp; SKU: {product.sku}</div>

            <hr className="product-divider" />

            {/* Price */}
            <PriceBlock
              priceKes={priceKes}
              priceUsd={priceUsd}
              oldKes={oldKes}
              discount={product.discount_percent}
              large
            />

            {/* Coupon */}
            {product.has_coupon && product.coupon_text && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="coupon" style={{ accentColor: 'var(--amz-orange)' }} />
                <label htmlFor="coupon" style={{ fontSize: '.82rem', cursor: 'pointer' }}>
                  Apply <strong>{product.coupon_text}</strong>
                </label>
              </div>
            )}

            <hr className="product-divider" />

            {/* Variants – Color */}
            {colors.length > 0 && (
              <div className="variant-group">
                <div className="variant-label">
                  Color: <strong>{selectedVariant?.color || colors[0]}</strong>
                </div>
                <div className="variant-options">
                  {colors.map(color => {
                    const v = variants.find(x => x.color === color && (!selectedVariant?.storage || x.storage === selectedVariant.storage));
                    return (
                      <button
                        key={color}
                        className={`variant-btn ${selectedVariant?.color === color ? 'active' : ''} ${v && v.stock === 0 ? 'out' : ''}`}
                        onClick={() => v && setSelectedVariant(v)}
                        style={v?.color_hex ? { borderColor: v.color_hex } : {}}
                        title={v?.stock === 0 ? 'Out of stock' : color}
                      >
                        {v?.color_hex && (
                          <span style={{
                            display: 'inline-block', width: 14, height: 14,
                            borderRadius: '50%', background: v.color_hex,
                            marginRight: 4, border: '1px solid #ccc', verticalAlign: 'middle'
                          }} />
                        )}
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants – Storage */}
            {storages.length > 0 && (
              <div className="variant-group">
                <div className="variant-label">Storage: <strong>{selectedVariant?.storage}</strong></div>
                <div className="variant-options">
                  {storages.map(s => {
                    const v = variants.find(x => x.storage === s && (!selectedVariant?.color || x.color === selectedVariant.color));
                    return (
                      <button
                        key={s}
                        className={`variant-btn ${selectedVariant?.storage === s ? 'active' : ''} ${v?.stock === 0 ? 'out' : ''}`}
                        onClick={() => v && setSelectedVariant(v)}
                      >{s}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants – RAM */}
            {rams.length > 0 && (
              <div className="variant-group">
                <div className="variant-label">RAM: <strong>{selectedVariant?.ram}</strong></div>
                <div className="variant-options">
                  {rams.map(r => {
                    const v = variants.find(x => x.ram === r);
                    return (
                      <button
                        key={r}
                        className={`variant-btn ${selectedVariant?.ram === r ? 'active' : ''} ${v?.stock === 0 ? 'out' : ''}`}
                        onClick={() => v && setSelectedVariant(v)}
                      >{r}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bullet points */}
            {Array.isArray(product.bullet_points) && product.bullet_points.length > 0 && (
              <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {product.bullet_points.map((b, i) => (
                  <li key={i} style={{ fontSize: '.85rem' }}>{b}</li>
                ))}
              </ul>
            )}

            {/* Ships from */}
            {product.ships_from && (
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                <i className="bi bi-truck" /> Ships from: {product.ships_from}
              </div>
            )}
          </div>

          {/* Buy Box Column */}
          <div className="product-buy-col">
            <div className="buy-box">
              {/* Price in buy box */}
              <PriceBlock priceKes={priceKes} priceUsd={priceUsd} large />

              {/* Delivery */}
              <div style={{ fontSize: '.8rem', color: 'var(--text-primary)', margin: '10px 0' }}>
                <i className="bi bi-truck" style={{ color: 'var(--amz-link)', marginRight: 4 }} />
                <strong>FREE Delivery</strong> on orders over KES 5,000
              </div>

              {/* Stock status */}
              <div style={{ marginBottom: 10 }}>
                {inStock ? (
                  <span className="in-stock"><i className="bi bi-check-circle-fill" /> In Stock</span>
                ) : (
                  <span className="out-stock"><i className="bi bi-x-circle-fill" /> Out of Stock</span>
                )}
                {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
                  <div style={{ fontSize: '.78rem', color: 'var(--amz-red)', marginTop: 2 }}>
                    Only {selectedVariant.stock} left!
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Qty:</label>
                <select
                  className="form-control"
                  value={qty}
                  onChange={e => setQty(Number(e.target.value))}
                  style={{ width: 80 }}
                >
                  {[...Array(Math.min(selectedVariant?.stock || 10, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              {/* CTA Buttons */}
              <button
                className="btn-add-cart"
                onClick={handleAddCart}
                disabled={!inStock || addingCart}
                style={{ opacity: !inStock ? .5 : 1 }}
              >
                <i className="bi bi-cart-plus" /> {addingCart ? 'Adding...' : 'Add to Cart'}
              </button>

              <button
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={!inStock || addingCart}
                style={{ opacity: !inStock ? .5 : 1 }}
              >
                <i className="bi bi-lightning-fill" /> Buy Now
              </button>

              <button
                onClick={() => toggle(product.id)}
                style={{
                  marginTop: 10, width: '100%', background: 'none', border: 'none',
                  color: isWishlisted ? '#e74c3c' : 'var(--amz-link)',
                  fontSize: '.82rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
                {isWishlisted ? 'Saved to Wishlist' : 'Add to Wish List'}
              </button>

              {/* Secure transaction */}
              <div style={{ marginTop: 12, fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                <i className="bi bi-lock-fill" /> Secure transaction
              </div>

              {/* Payment icons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: '.7rem', background: '#3bb27f', color: '#fff', padding: '2px 8px', borderRadius: 3, fontWeight: 700 }}>M-PESA</span>
                <span style={{ fontSize: '.7rem', background: '#003087', color: '#fff', padding: '2px 8px', borderRadius: 3, fontWeight: 700 }}>PayPal</span>
                <span style={{ fontSize: '.7rem', background: '#555', color: '#fff', padding: '2px 8px', borderRadius: 3, fontWeight: 700 }}>Card</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs: Description / Specs / Reviews ────────── */}
        <div style={{ marginTop: 24 }}>
          {/* Tab buttons */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', marginBottom: 16 }}>
            {['description', 'specs', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px', background: 'none',
                  border: 'none', borderBottom: activeTab === tab ? '3px solid var(--amz-orange)' : '3px solid transparent',
                  fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? 'var(--amz-orange-dark)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '.9rem', marginBottom: -2,
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'reviews' ? `Reviews (${product.review_count})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Description */}
          {activeTab === 'description' && (
            <div className="amz-panel">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Product Description</h2>
              <div style={{ fontSize: '.88rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {product.description || 'No description available.'}
              </div>
            </div>
          )}

          {/* Specs */}
          {activeTab === 'specs' && (
            <div className="amz-panel">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Technical Specifications</h2>
              {specs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No specifications listed.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <tbody>
                    {specs.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#f7f7f7' : '#fff' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, width: '35%', color: 'var(--text-primary)' }}>{s.key}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div id="reviews" className="amz-panel">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                Customer Reviews
              </h2>

              {/* Summary */}
              {product.review_count > 0 && (
                <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--amz-orange)' }}>
                      {product.average_rating}
                    </div>
                    <StarRating rating={product.average_rating} />
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>out of 5</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const info = breakdown[star] || { count: 0, percent: 0 };
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '.75rem', width: 36, textAlign: 'right' }}>{star} star</span>
                          <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 2, height: 12 }}>
                            <div style={{ background: 'var(--amz-orange)', height: '100%', width: `${info.percent}%`, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: '.72rem', color: 'var(--amz-link)', width: 30 }}>{info.percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review list */}
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--amz-teal)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.85rem'
                      }}>
                        {r.user_name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{r.user_name}</span>
                      {r.is_verified_purchase && (
                        <span style={{ fontSize: '.72rem', color: 'var(--amz-link)', fontWeight: 600 }}>✓ Verified Purchase</span>
                      )}
                    </div>
                    <StarRating rating={r.rating} />
                    {r.title && <div style={{ fontWeight: 700, marginTop: 4, fontSize: '.9rem' }}>{r.title}</div>}
                    <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{r.comment}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Reviewed on {new Date(r.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Related Products ─────────────────────────────── */}
        {related.length > 0 && (
          <section style={{ marginTop: 24, marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">Customers Also Viewed</h2>
            </div>
            <div className="product-strip">
              {related.map(p => (
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