// src/pages/ProductPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProduct, getRelated } from '../api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { Spinner, Breadcrumb } from '../components/common/index.jsx';
import StarRating from '../components/common/StarRating';
import PriceBlock from '../components/common/PriceBlock';
import ProductCard from '../components/common/ProductCard';

/* ─── Inline styles scoped to ProductPage ──────────────────── */
const S = {
  /* Layout */
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
    marginTop: 12,
  },

  /* ── Image column ─────────────────────────── */
  imagesCol: {
    background: '#fff',
    border: '1px solid #e3e6e6',
    borderRadius: 8,
    padding: 12,
  },
  thumbsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: 56,
    flexShrink: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    border: '1px solid #ddd',
    borderRadius: 4,
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9f9',
    padding: 3,
    transition: 'border-color .15s',
  },
  thumbActive: {
    borderColor: '#e47911',
    boxShadow: '0 0 0 1px #e47911',
  },
  mainImgWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    background: 'linear-gradient(145deg,#f8f9f9,#f0f2f2)',
    borderRadius: 6,
    overflow: 'hidden',
    padding: 16,
  },
  mainImg: {
    maxHeight: 380,
    maxWidth: '100%',
    objectFit: 'contain',
    transition: 'opacity .2s, transform .3s',
  },

  /* ── Info column ──────────────────────────── */
  infoCol: {
    background: '#fff',
    border: '1px solid #e3e6e6',
    borderRadius: 8,
    padding: '16px 18px',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #f0f2f2',
    margin: '10px 0',
  },
  badgesRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  brandLink: {
    fontSize: '.78rem',
    color: '#007185',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.4px',
    textDecoration: 'none',
  },
  title: {
    fontSize: '1.18rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#0f1111',
    marginTop: 4,
    marginBottom: 4,
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  ratingLink: {
    fontSize: '.78rem',
    color: '#007185',
  },
  metaLine: {
    fontSize: '.7rem',
    color: '#767676',
    marginBottom: 2,
  },
  couponRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  couponLabel: {
    fontSize: '.82rem',
    cursor: 'pointer',
  },

  /* Variant groups */
  variantGroup: {
    marginBottom: 10,
  },
  variantLabel: {
    fontSize: '.8rem',
    color: '#565959',
    marginBottom: 5,
    fontWeight: 600,
  },
  variantOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantBtn: {
    padding: '5px 13px',
    border: '1px solid #888',
    borderRadius: 4,
    background: '#fff',
    fontSize: '.8rem',
    cursor: 'pointer',
    transition: 'border-color .15s, background .15s, box-shadow .15s',
    display: 'inline-flex',
    alignItems: 'center',
    color: '#0f1111',
  },
  variantBtnActive: {
    borderColor: '#e47911',
    borderWidth: 2,
    background: '#fffbf5',
    boxShadow: '0 0 0 1px #e47911',
    fontWeight: 700,
    color: '#111',
  },
  variantBtnOut: {
    opacity: 0.45,
    textDecoration: 'line-through',
    cursor: 'not-allowed',
  },

  /* Bullet points */
  bullets: {
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    marginTop: 4,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: '.84rem',
    lineHeight: 1.55,
    color: '#0f1111',
  },
  shipsFrom: {
    fontSize: '.78rem',
    color: '#767676',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },

  /* ── Buy box ──────────────────────────────── */
  buyCol: {},
  buyBox: {
    background: '#fff',
    border: '1px solid #e3e6e6',
    borderRadius: 8,
    padding: '16px 18px',
    position: 'sticky',
    top: 'calc(60px + 38px + 12px)',
  },
  deliveryBox: {
    fontSize: '.8rem',
    color: '#0f1111',
    margin: '12px 0 10px',
    padding: '10px 12px',
    background: '#f8f9f9',
    borderRadius: 4,
    borderLeft: '3px solid #007185',
    lineHeight: 1.55,
  },
  deliveryLine1: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontWeight: 600,
  },
  deliveryLine2: {
    marginTop: 4,
    color: '#565959',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  stockRow: {
    marginBottom: 10,
  },
  inStock: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#007600',
    fontWeight: 700,
    fontSize: '.88rem',
  },
  outStock: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#b12704',
    fontWeight: 700,
    fontSize: '.88rem',
  },
  lowStock: {
    fontSize: '.76rem',
    color: '#b12704',
    marginTop: 3,
    fontWeight: 700,
  },
  qtyGroup: {
    marginBottom: 10,
  },
  qtyLabel: {
    fontSize: '.78rem',
    fontWeight: 700,
    color: '#0f1111',
    marginBottom: 4,
    display: 'block',
  },
  qtySelect: {
    width: 72,
    border: '1px solid #aaa',
    borderRadius: 4,
    padding: '5px 8px',
    fontSize: '.88rem',
    background: '#fff',
    cursor: 'pointer',
  },
  btnAddCart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'linear-gradient(to bottom,#ffd76e,#f0a800)',
    border: '1px solid #c68a00',
    borderRadius: 20,
    color: '#111',
    fontSize: '.86rem',
    fontWeight: 700,
    padding: '9px 14px',
    cursor: 'pointer',
    width: '100%',
    marginBottom: 8,
    transition: 'filter .15s, transform .1s',
    letterSpacing: '.1px',
  },
  btnBuyNow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'linear-gradient(to bottom,#ff9e1b,#e47911)',
    border: '1px solid #c45500',
    borderRadius: 20,
    color: '#111',
    fontSize: '.86rem',
    fontWeight: 700,
    padding: '9px 14px',
    cursor: 'pointer',
    width: '100%',
    transition: 'filter .15s, transform .1s',
  },
  btnWishlist: {
    marginTop: 10,
    width: '100%',
    background: 'none',
    border: 'none',
    fontSize: '.82rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 0',
    transition: 'color .15s',
  },
  secureRow: {
    marginTop: 14,
    borderTop: '1px solid #f0f0f0',
    paddingTop: 12,
  },
  secureLine: {
    fontSize: '.72rem',
    color: '#767676',
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },

  /* ── Tabs ─────────────────────────────────── */
  tabsWrap: {
    marginTop: 20,
    background: '#fff',
    border: '1px solid #e8eaed',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabNav: {
    display: 'flex',
    borderBottom: '2px solid #e8eaed',
    gap: 0,
    background: '#fafafa',
  },
  tabBtn: (active) => ({
    padding: '11px 20px',
    background: active ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: active ? '3px solid #e47911' : '3px solid transparent',
    fontWeight: active ? 800 : 500,
    color: active ? '#c45500' : '#565959',
    cursor: 'pointer',
    fontSize: '.88rem',
    marginBottom: -2,
    transition: 'color .15s, border-color .15s',
    whiteSpace: 'nowrap',
  }),
  tabPanel: {
    padding: '20px 22px',
  },
  tabH2: {
    fontSize: '.95rem',
    fontWeight: 800,
    marginBottom: 14,
    color: '#0f1111',
  },
  descText: {
    fontSize: '.88rem',
    lineHeight: 1.85,
    whiteSpace: 'pre-line',
    color: '#565959',
  },
  specsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '.84rem',
  },
  specRowEven: {
    background: '#f8f9f9',
  },
  specRowOdd: {
    background: '#fff',
  },
  specKey: {
    padding: '9px 14px',
    fontWeight: 700,
    width: '35%',
    color: '#0f1111',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'top',
  },
  specVal: {
    padding: '9px 14px',
    color: '#565959',
    borderBottom: '1px solid #f0f0f0',
  },

  /* ── Reviews ─────────────────────────────── */
  ratingSummary: {
    display: 'flex',
    gap: 28,
    marginBottom: 22,
    flexWrap: 'wrap',
    padding: '16px',
    background: '#f8f9f9',
    borderRadius: 8,
    border: '1px solid #e8eaed',
  },
  bigScore: {
    textAlign: 'center',
    minWidth: 80,
  },
  bigScoreNum: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#ff9900',
    lineHeight: 1,
  },
  bigScoreSub: {
    fontSize: '.7rem',
    color: '#767676',
    marginTop: 4,
  },
  barsWrap: {
    flex: 1,
    minWidth: 180,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: '.72rem',
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
    color: '#007185',
  },
  barTrack: {
    flex: 1,
    background: '#e8eaed',
    borderRadius: 3,
    height: 10,
    overflow: 'hidden',
  },
  barFill: (pct) => ({
    background: '#ff9900',
    height: '100%',
    width: `${pct}%`,
    borderRadius: 3,
    transition: 'width .4s ease',
  }),
  barPct: {
    fontSize: '.7rem',
    color: '#767676',
    width: 32,
    flexShrink: 0,
  },
  reviewItem: {
    borderBottom: '1px solid #f0f2f2',
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#232f3e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: '.85rem',
    flexShrink: 0,
  },
  reviewUserName: {
    fontWeight: 700,
    fontSize: '.85rem',
  },
  reviewVerified: {
    fontSize: '.7rem',
    color: '#007600',
    fontWeight: 600,
  },
  reviewDate: {
    marginLeft: 'auto',
    fontSize: '.7rem',
    color: '#767676',
  },
  reviewTitle: {
    fontWeight: 700,
    marginTop: 5,
    fontSize: '.9rem',
    color: '#0f1111',
  },
  reviewBody: {
    fontSize: '.83rem',
    color: '#565959',
    marginTop: 4,
    lineHeight: 1.6,
  },
  reviewHelpful: {
    fontSize: '.72rem',
    color: '#767676',
    marginTop: 6,
  },
  noReviews: {
    textAlign: 'center',
    padding: '32px 0',
    color: '#767676',
  },
  noReviewsIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: 10,
    color: '#ddd',
  },

  /* ── Related section ─────────────────────── */
  relatedSection: {
    marginTop: 20,
  },
};

/* ── Responsive grid helper (3-col on ≥768px) ─── */
const layoutGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 14,
};

export default function ProductPage() {
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
  const [imgHover, setImgHover] = useState(false);

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

  if (loading) return <div className="page-wrapper"><div className="loading-center"><div className="spinner" /></div></div>;
  if (!product) return null;

  const images   = product.images || [];
  const variants = product.variants || [];
  const specs    = product.specifications || [];
  const reviews  = product.reviews || [];

  const colors   = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const storages = [...new Set(variants.map(v => v.storage).filter(Boolean))];
  const rams     = [...new Set(variants.map(v => v.ram).filter(Boolean))];

  const effectiveVariant = selectedVariant || product;
  const priceKes = effectiveVariant.effective_price_kes || product.effective_price_kes || 0;
  const priceUsd = effectiveVariant.effective_price_usd || product.effective_price_usd || 0;
  const oldKes   = (effectiveVariant.sale_price_kes || product.sale_price_kes)
    ? (effectiveVariant.price_kes || product.price_kes) : null;
  const inStock  = selectedVariant ? selectedVariant.stock > 0 : product.in_stock;
  const lowStock = selectedVariant?.stock > 0 && selectedVariant.stock <= 5;

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

  const breakdown = product.rating_breakdown || {};

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '10px 16px 40px' }}>

        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: product.category?.name || 'Store', href: `/store?category=${product.category?.slug}` },
          { label: product.brand?.name || '', href: `/store?brand=${product.brand?.slug}` },
          { label: product.name },
        ]} />

        {/* ══ Main 3-column layout (CSS media query via className trick) ══ */}
        <style>{`
          .pdp-layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            margin-top: 10px;
          }
          @media (min-width: 700px) {
            .pdp-layout {
              grid-template-columns: minmax(0,2fr) minmax(0,2fr);
            }
          }
          @media (min-width: 1000px) {
            .pdp-layout {
              grid-template-columns: minmax(0,2.2fr) minmax(0,2.8fr) minmax(0,1.5fr);
            }
          }
          .pdp-buy-col {
            grid-column: 1;
          }
          @media (min-width: 700px) {
            .pdp-buy-col {
              grid-column: 2;
            }
          }
          @media (min-width: 1000px) {
            .pdp-buy-col {
              grid-column: 3;
            }
          }
          .pdp-images-col {
            grid-row: 1;
          }
          .pdp-info-col {
            grid-row: 2;
          }
          @media (min-width: 700px) {
            .pdp-info-col {
              grid-row: 1;
            }
          }
          @media (min-width: 1000px) {
            .pdp-info-col {
              grid-row: 1;
            }
          }
          .variant-btn:hover:not([disabled]) {
            border-color: #e47911 !important;
            background: #fffbf5 !important;
          }
          .btn-add-cart-pdp:hover {
            filter: brightness(0.96);
            transform: translateY(-1px);
          }
          .btn-buy-now-pdp:hover {
            filter: brightness(0.95);
            transform: translateY(-1px);
          }
          .pdp-tab-btn:hover {
            color: #c45500;
          }
          .pdp-thumb:hover {
            border-color: #e47911 !important;
          }
        `}</style>

        <div className="pdp-layout">

          {/* ── Images Column ───────────────────── */}
          <div className="pdp-images-col" style={S.imagesCol}>
            <div style={{ display: 'flex', gap: 8 }}>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={S.thumbsCol}>
                  {images.map((img, i) => (
                    <div
                      key={img.id}
                      className="pdp-thumb"
                      style={{ ...S.thumb, ...(i === activeImg ? S.thumbActive : {}) }}
                      onClick={() => setActiveImg(i)}
                    >
                      <img
                        src={img.image}
                        alt={img.alt_text || product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div
                style={S.mainImgWrap}
                onMouseEnter={() => setImgHover(true)}
                onMouseLeave={() => setImgHover(false)}
              >
                {images[activeImg] ? (
                  <img
                    src={images[activeImg].image}
                    alt={images[activeImg].alt_text || product.name}
                    style={{
                      ...S.mainImg,
                      transform: imgHover ? 'scale(1.06)' : 'scale(1)',
                    }}
                  />
                ) : (
                  <i className="bi bi-image" style={{ fontSize: '5rem', color: '#ddd' }} />
                )}
              </div>
            </div>

            {/* Image dots for mobile when no sidebar thumbs */}
            {images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: i === activeImg ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      border: 'none',
                      background: i === activeImg ? '#e47911' : '#ddd',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width .25s, background .25s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Info Column ─────────────────────── */}
          <div className="pdp-info-col" style={S.infoCol}>

            {/* Badges */}
            <div style={S.badgesRow}>
              {product.is_amazon_choice && (
                <span className="badge badge-choice">
                  <i className="bi bi-award" style={{ marginRight: 3 }} />Amazon's Choice
                </span>
              )}
              {product.is_best_seller && <span className="badge badge-hot">🔥 Best Seller</span>}
              {product.is_prime && (
                <span className="badge badge-prime">
                  <i className="bi bi-lightning-fill" style={{ marginRight: 2 }} />Prime
                </span>
              )}
              {product.is_new_arrival && <span className="badge badge-new">New Arrival</span>}
              {product.discount_percent > 0 && (
                <span className="badge badge-sale">-{product.discount_percent}%</span>
              )}
            </div>

            {/* Brand */}
            <Link to={`/store?brand=${product.brand?.slug}`} style={S.brandLink}>
              {product.brand?.name}
            </Link>

            {/* Title */}
            <h1 style={S.title}>{product.name}</h1>

            {/* Rating row */}
            {product.average_rating > 0 && (
              <div style={S.ratingRow}>
                <StarRating rating={product.average_rating} count={product.review_count} />
                <a href="#reviews" style={S.ratingLink}>
                  {product.review_count} rating{product.review_count !== 1 ? 's' : ''}
                </a>
                <span style={{ color: '#ddd' }}>|</span>
                <a href="#reviews" style={S.ratingLink}>Write a review</a>
              </div>
            )}

            {/* ASIN / SKU */}
            <div style={S.metaLine}>
              ASIN: <strong>{product.asin}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              SKU: <strong>{product.sku}</strong>
            </div>

            <hr style={S.hr} />

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
              <div style={S.couponRow}>
                <input
                  type="checkbox"
                  id="coupon-chk"
                  style={{ accentColor: '#ff9900', cursor: 'pointer' }}
                />
                <label htmlFor="coupon-chk" style={S.couponLabel}>
                  Apply coupon:{' '}
                  <strong style={{ color: '#b12704' }}>{product.coupon_text}</strong>
                </label>
              </div>
            )}

            <hr style={S.hr} />

            {/* Variant – Color */}
            {colors.length > 0 && (
              <div style={S.variantGroup}>
                <div style={S.variantLabel}>
                  Colour: <strong style={{ color: '#0f1111' }}>{selectedVariant?.color || colors[0]}</strong>
                </div>
                <div style={S.variantOptions}>
                  {colors.map(color => {
                    const v = variants.find(
                      x => x.color === color && (!selectedVariant?.storage || x.storage === selectedVariant.storage)
                    );
                    const isActive = selectedVariant?.color === color;
                    const isOut = v?.stock === 0;
                    return (
                      <button
                        key={color}
                        className="variant-btn"
                        style={{
                          ...S.variantBtn,
                          ...(isActive ? S.variantBtnActive : {}),
                          ...(isOut ? S.variantBtnOut : {}),
                        }}
                        onClick={() => v && !isOut && setSelectedVariant(v)}
                        disabled={isOut}
                        title={isOut ? 'Out of stock' : color}
                      >
                        {v?.color_hex && (
                          <span style={{
                            display: 'inline-block',
                            width: 12, height: 12,
                            borderRadius: '50%',
                            background: v.color_hex,
                            marginRight: 5,
                            border: '1px solid rgba(0,0,0,.15)',
                            verticalAlign: 'middle',
                          }} />
                        )}
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant – Storage */}
            {storages.length > 0 && (
              <div style={S.variantGroup}>
                <div style={S.variantLabel}>
                  Storage: <strong style={{ color: '#0f1111' }}>{selectedVariant?.storage}</strong>
                </div>
                <div style={S.variantOptions}>
                  {storages.map(s => {
                    const v = variants.find(
                      x => x.storage === s && (!selectedVariant?.color || x.color === selectedVariant.color)
                    );
                    const isActive = selectedVariant?.storage === s;
                    const isOut = v?.stock === 0;
                    return (
                      <button
                        key={s}
                        className="variant-btn"
                        style={{
                          ...S.variantBtn,
                          ...(isActive ? S.variantBtnActive : {}),
                          ...(isOut ? S.variantBtnOut : {}),
                        }}
                        onClick={() => v && !isOut && setSelectedVariant(v)}
                        disabled={isOut}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant – RAM */}
            {rams.length > 0 && (
              <div style={S.variantGroup}>
                <div style={S.variantLabel}>
                  RAM: <strong style={{ color: '#0f1111' }}>{selectedVariant?.ram}</strong>
                </div>
                <div style={S.variantOptions}>
                  {rams.map(r => {
                    const v = variants.find(x => x.ram === r);
                    const isActive = selectedVariant?.ram === r;
                    const isOut = v?.stock === 0;
                    return (
                      <button
                        key={r}
                        className="variant-btn"
                        style={{
                          ...S.variantBtn,
                          ...(isActive ? S.variantBtnActive : {}),
                          ...(isOut ? S.variantBtnOut : {}),
                        }}
                        onClick={() => v && !isOut && setSelectedVariant(v)}
                        disabled={isOut}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bullet points */}
            {Array.isArray(product.bullet_points) && product.bullet_points.length > 0 && (
              <ul style={S.bullets}>
                {product.bullet_points.map((b, i) => (
                  <li key={i} style={S.bulletItem}>{b}</li>
                ))}
              </ul>
            )}

            {/* Ships from */}
            {product.ships_from && (
              <div style={S.shipsFrom}>
                <i className="bi bi-truck" style={{ color: '#007185' }} />
                Ships from: {product.ships_from}
              </div>
            )}
          </div>

          {/* ── Buy Box ─────────────────────────── */}
          <div className="pdp-buy-col">
            <div style={S.buyBox}>

              {/* Price */}
              <PriceBlock priceKes={priceKes} priceUsd={priceUsd} large />

              {/* Delivery info */}
              <div style={S.deliveryBox}>
                <div style={S.deliveryLine1}>
                  <i className="bi bi-truck" style={{ color: '#007185' }} />
                  FREE Delivery on orders over KES 5,000
                </div>
                <div style={S.deliveryLine2}>
                  <i className="bi bi-calendar3" />
                  Same-day in Nairobi · 1–3 days countrywide
                </div>
              </div>

              {/* Stock status */}
              <div style={S.stockRow}>
                {inStock
                  ? <span style={S.inStock}><i className="bi bi-check-circle-fill" /> In Stock</span>
                  : <span style={S.outStock}><i className="bi bi-x-circle-fill" /> Out of Stock</span>
                }
                {lowStock && (
                  <div style={S.lowStock}>
                    ⚡ Only {selectedVariant.stock} left – order soon!
                  </div>
                )}
              </div>

              {/* Qty selector */}
              {inStock && (
                <div style={S.qtyGroup}>
                  <label style={S.qtyLabel}>Quantity:</label>
                  <select
                    style={S.qtySelect}
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                  >
                    {[...Array(Math.min(selectedVariant?.stock || 10, 10))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Add to Cart */}
              <button
                className="btn-add-cart-pdp"
                style={{
                  ...S.btnAddCart,
                  opacity: !inStock || addingCart ? 0.5 : 1,
                  cursor: !inStock || addingCart ? 'not-allowed' : 'pointer',
                }}
                onClick={handleAddCart}
                disabled={!inStock || addingCart}
              >
                <i className="bi bi-cart-plus" />
                {addingCart ? 'Adding…' : 'Add to Cart'}
              </button>

              {/* Buy Now */}
              <button
                className="btn-buy-now-pdp"
                style={{
                  ...S.btnBuyNow,
                  opacity: !inStock || addingCart ? 0.5 : 1,
                  cursor: !inStock || addingCart ? 'not-allowed' : 'pointer',
                }}
                onClick={handleBuyNow}
                disabled={!inStock || addingCart}
              >
                <i className="bi bi-lightning-fill" /> Buy Now
              </button>

              {/* Wishlist toggle */}
              <button
                onClick={() => toggle(product.id)}
                style={{
                  ...S.btnWishlist,
                  color: isWishlisted ? '#e74c3c' : '#007185',
                }}
              >
                <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
                {isWishlisted ? 'Saved to Wish List' : 'Add to Wish List'}
              </button>

              {/* Secure + Payment */}
              <div style={S.secureRow}>
                <div style={S.secureLine}>
                  <i className="bi bi-lock-fill" style={{ marginRight: 4 }} />
                  Secure transaction
                </div>
                <div style={S.paymentBadges}>
                  <span style={{ fontSize: '.68rem', background: '#3bb27f', color: '#fff', padding: '3px 8px', borderRadius: 3, fontWeight: 800 }}>M-PESA</span>
                  <span style={{ fontSize: '.68rem', background: '#003087', color: '#fff', padding: '3px 8px', borderRadius: 3, fontWeight: 800 }}>PayPal</span>
                  <span style={{ fontSize: '.68rem', background: '#444', color: '#fff', padding: '3px 8px', borderRadius: 3, fontWeight: 800 }}>Card</span>
                </div>
              </div>

              {/* Sold by */}
              {product.brand?.name && (
                <div style={{ marginTop: 12, fontSize: '.76rem', color: '#565959', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span>Sold by</span>
                    <Link to={`/store?brand=${product.brand?.slug}`} style={{ color: '#007185', fontWeight: 600 }}>
                      {product.brand.name}
                    </Link>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Returns</span>
                    <span style={{ color: '#007185', fontWeight: 600 }}>30-day returns</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ Tabs ══════════════════════════════════════════════ */}
        <div id="reviews" style={S.tabsWrap}>
          {/* Tab nav */}
          <div style={S.tabNav}>
            {[
              { id: 'description', label: 'Description', icon: 'bi-file-text' },
              { id: 'specs', label: 'Specifications', icon: 'bi-list-ul' },
              { id: 'reviews', label: `Reviews (${product.review_count || 0})`, icon: 'bi-star' },
            ].map(tab => (
              <button
                key={tab.id}
                className="pdp-tab-btn"
                style={S.tabBtn(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}`} style={{ marginRight: 5 }} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div style={S.tabPanel}>

            {/* Description */}
            {activeTab === 'description' && (
              <div>
                <h2 style={S.tabH2}>Product Description</h2>
                <div style={S.descText}>
                  {product.description || 'No description available.'}
                </div>
              </div>
            )}

            {/* Specs */}
            {activeTab === 'specs' && (
              <div>
                <h2 style={S.tabH2}>Technical Specifications</h2>
                {specs.length === 0
                  ? <p style={{ color: '#767676' }}>No specifications listed.</p>
                  : (
                    <table style={S.specsTable}>
                      <tbody>
                        {specs.map((s, i) => (
                          <tr key={i} style={i % 2 === 0 ? S.specRowEven : S.specRowOdd}>
                            <td style={S.specKey}>{s.key}</td>
                            <td style={S.specVal}>{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div>
                <h2 style={S.tabH2}>Customer Reviews</h2>

                {/* Rating summary bar */}
                {product.review_count > 0 && (
                  <div style={S.ratingSummary}>
                    <div style={S.bigScore}>
                      <div style={S.bigScoreNum}>{product.average_rating}</div>
                      <StarRating rating={product.average_rating} />
                      <div style={S.bigScoreSub}>out of 5</div>
                    </div>
                    <div style={S.barsWrap}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const info = breakdown[star] || { count: 0, percent: 0 };
                        return (
                          <div key={star} style={S.barRow}>
                            <span style={S.barLabel}>{star} ★</span>
                            <div style={S.barTrack}>
                              <div style={S.barFill(info.percent || 0)} />
                            </div>
                            <span style={S.barPct}>{info.percent || 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Review list */}
                {reviews.length === 0 ? (
                  <div style={S.noReviews}>
                    <i className="bi bi-chat-left-text" style={S.noReviewsIcon} />
                    <p>No reviews yet. Be the first to review this product!</p>
                    <button
                      className="btn-amz-secondary"
                      style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 4 }}
                    >
                      <i className="bi bi-pencil" /> Write a Review
                    </button>
                  </div>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} style={S.reviewItem}>
                      <div style={S.reviewHeader}>
                        <div style={S.reviewAvatar}>
                          {r.user_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={S.reviewUserName}>{r.user_name}</div>
                          {r.is_verified_purchase && (
                            <span style={S.reviewVerified}>
                              <i className="bi bi-patch-check-fill" style={{ marginRight: 3 }} />
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div style={S.reviewDate}>
                          {new Date(r.created_at).toLocaleDateString('en-KE', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </div>
                      </div>
                      <StarRating rating={r.rating} />
                      {r.title && <div style={S.reviewTitle}>{r.title}</div>}
                      <div style={S.reviewBody}>{r.comment}</div>
                      {r.helpful_votes > 0 && (
                        <div style={S.reviewHelpful}>
                          {r.helpful_votes} people found this helpful
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ Related products ══════════════════════════════════ */}
        {related.length > 0 && (
          <section style={S.relatedSection}>
            <div className="section-header">
              <h2 className="section-title">Customers Also Viewed</h2>
              <Link to={`/store?category=${product.category?.slug}`} className="section-see-all">
                See all <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="product-strip">
              {related.map(p => (
                <div key={p.id} style={{ minWidth: 195, width: 195, flexShrink: 0 }}>
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