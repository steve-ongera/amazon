// src/components/common/ProductCard.jsx
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
    <Link to={`/product/${product.slug}`} className="product-card" style={{ textDecoration: 'none' }}>
      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(255,255,255,.85)', border: 'none',
          borderRadius: '50%', width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,.15)',
          color: isWishlisted ? '#e74c3c' : '#aaa',
          fontSize: '1rem',
        }}
        aria-label="Wishlist"
      >
        <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
      </button>

      {/* Image */}
      <div className="product-card-img">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} loading="lazy" />
        ) : (
          <i className="bi bi-image" style={{ fontSize: '3rem', color: '#ccc' }} />
        )}
      </div>

      {/* Body */}
      <div className="product-card-body">
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 3 }}>
          {product.is_amazon_choice && <span className="badge badge-choice">#1 Choice</span>}
          {product.is_best_seller && <span className="badge badge-hot">Best Seller</span>}
          {product.is_new_arrival && <span className="badge badge-new">New</span>}
          {product.is_prime && <span className="badge badge-prime"><i className="bi bi-lightning-fill" /> Prime</span>}
        </div>

        {/* Brand */}
        <div className="product-card-brand">{product.brand_name}</div>

        {/* Title */}
        <div className="product-card-title">{product.name}</div>

        {/* Rating */}
        {product.average_rating > 0 && (
          <StarRating rating={product.average_rating} count={product.review_count} />
        )}

        {/* Price */}
        <PriceBlock
          priceKes={product.effective_price_kes}
          priceUsd={product.effective_price_usd}
          oldKes={product.sale_price_kes ? product.price_kes : null}
          discount={product.discount_percent}
        />

        {/* Coupon */}
        {product.has_coupon && product.coupon_text && (
          <span className="badge badge-coupon" style={{ marginTop: 3 }}>
            <i className="bi bi-tag-fill" style={{ marginRight: 3 }} />
            {product.coupon_text}
          </span>
        )}

        {/* Stock */}
        {!product.in_stock && (
          <div style={{ fontSize: '.72rem', color: '#b12704', marginTop: 2 }}>Out of Stock</div>
        )}

        {/* Add to cart */}
        {product.in_stock && (
          <button
            className="btn-add-cart"
            onClick={handleAddCart}
            style={{ marginTop: 8 }}
          >
            <i className="bi bi-cart-plus" /> Add to Cart
          </button>
        )}
      </div>
    </Link>
  );
}