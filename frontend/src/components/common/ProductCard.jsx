import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../hooks/useWishlist';
import StarRating from './StarRating';
import PriceBlock from './PriceBlock';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist(product.id);

  const imgSrc = product.main_image?.image || null;

  const handleAddCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product.id, null, 1);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  };

  return (
    <Link to={`/product/${product.slug}`} className="product-card">

      {/* ── Discount ribbon ─────────────────────────── */}
      {product.discount_percent > 0 && (
        <div className="product-card-discount">-{product.discount_percent}%</div>
      )}

      {/* ── Wishlist button ─────────────────────────── */}
      <button
        className={`product-card-wishlist ${isWishlisted ? 'wishlisted' : ''}`}
        onClick={handleWishlist}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
      </button>

      {/* ── Image ───────────────────────────────────── */}
      <div className="product-card-img">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} loading="lazy" />
        ) : (
          <i className="bi bi-image" style={{ fontSize: '3rem', color: '#ccc' }} />
        )}
      </div>

      {/* ── Body ────────────────────────────────────── */}
      <div className="product-card-body">

        {/* Badges */}
        <div className="product-card-badges">
          {product.is_amazon_choice && <span className="badge badge-choice">#1 Choice</span>}
          {product.is_best_seller && <span className="badge badge-hot">🔥 Best Seller</span>}
          {product.is_new_arrival && <span className="badge badge-new">New</span>}
          {product.is_prime && (
            <span className="badge badge-prime">
              <i className="bi bi-lightning-fill" style={{ marginRight: 2 }} />Prime
            </span>
          )}
        </div>

        {/* Brand */}
        {product.brand_name && (
          <div className="product-card-brand">{product.brand_name}</div>
        )}

        {/* Title */}
        <div className="product-card-title">{product.name}</div>

        {/* Rating */}
        {product.average_rating > 0 && (
          <div className="product-card-rating">
            <StarRating rating={product.average_rating} count={product.review_count} />
          </div>
        )}

        {/* Price */}
        <div className="product-card-price">
          <PriceBlock
            priceKes={product.effective_price_kes}
            priceUsd={product.effective_price_usd}
            oldKes={product.sale_price_kes ? product.price_kes : null}
            discount={product.discount_percent}
          />
        </div>

        {/* Coupon */}
        {product.has_coupon && product.coupon_text && (
          <div>
            <span className="badge badge-coupon">
              <i className="bi bi-tag-fill" style={{ marginRight: 3 }} />
              {product.coupon_text}
            </span>
          </div>
        )}

        <div className="product-card-spacer" />

        {/* Footer: stock + add to cart */}
        <div className="product-card-footer">
          {!product.in_stock ? (
            <div className="product-card-oos">
              <i className="bi bi-x-circle" style={{ marginRight: 4 }} />Out of Stock
            </div>
          ) : (
            <button className="btn-add-cart" onClick={handleAddCart}>
              <i className="bi bi-cart-plus" /> Add to Cart
            </button>
          )}
        </div>
      </div>

    </Link>
  );
}