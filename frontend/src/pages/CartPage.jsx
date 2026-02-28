// src/pages/CartPage.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Spinner, EmptyState } from '../components/common/index.jsx';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  if (loading || !cart) return <div className="page-wrapper"><Spinner /></div>;

  const items = cart.items || [];
  const fmtKes = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 16 }}>
          <i className="bi bi-cart3" style={{ marginRight: 8, color: 'var(--amz-orange)' }} />
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="amz-panel">
            <EmptyState
              icon="bi-cart-x"
              title="Your cart is empty"
              text="Looks like you haven't added any items yet."
              action={
                <Link to="/store" className="btn-amz-orange" style={{
                  textDecoration: 'none', padding: '10px 24px', borderRadius: 4, display: 'inline-block',
                  background: 'linear-gradient(to bottom,#ffb347,#ff9900)', border: '1px solid #c45500',
                  color: '#111', fontWeight: 700
                }}>
                  Continue Shopping
                </Link>
              }
            />
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="amz-panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Price</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', marginBottom: 8 }} />

              {items.map(item => {
                const img = item.product?.main_image?.image;
                const name = item.product?.name;
                const variant = item.variant;
                return (
                  <div key={item.id} className="cart-item">
                    {/* Image */}
                    <div>
                      <Link to={`/product/${item.product?.slug}`}>
                        {img ? (
                          <img src={img} alt={name} className="cart-item-img" />
                        ) : (
                          <div className="cart-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
                            <i className="bi bi-image" style={{ fontSize: '2rem', color: '#ccc' }} />
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* Info */}
                    <div className="cart-item-info">
                      <Link to={`/product/${item.product?.slug}`} className="cart-item-title">{name}</Link>
                      {variant && (
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {[variant.color, variant.storage, variant.ram].filter(Boolean).join(' / ')}
                        </div>
                      )}
                      <div style={{ fontSize: '.8rem', color: 'var(--amz-green)', fontWeight: 600 }}>In Stock</div>

                      {/* Qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div className="cart-qty-controls">
                          <button className="qty-btn" onClick={() => updateItem(item.id, item.quantity - 1)} aria-label="Decrease">−</button>
                          <span className="qty-display">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateItem(item.id, item.quantity + 1)} aria-label="Increase">+</button>
                        </div>
                        <button className="cart-delete" onClick={() => removeItem(item.id)}>Delete</button>
                        <button className="cart-delete" style={{ color: 'var(--text-muted)' }}>Save for later</button>
                      </div>

                      {/* Subtotal (mobile) */}
                      <div style={{ fontSize: '.9rem', fontWeight: 700 }} className="d-block" id="mobile-price">
                        KES {fmtKes(item.subtotal_kes)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
              <div style={{ textAlign: 'right', fontSize: '1rem' }}>
                Subtotal ({cart.item_count} item{cart.item_count !== 1 ? 's' : ''}):&nbsp;
                <strong style={{ color: 'var(--amz-red)' }}>KES {fmtKes(cart.total_kes)}</strong>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="order-summary">
                <div className="order-summary-title">
                  <i className="bi bi-check-circle-fill" style={{ color: 'var(--amz-green)', marginRight: 6 }} />
                  Order Summary
                </div>

                <div className="order-summary-row">
                  <span>Items ({cart.item_count}):</span>
                  <span>KES {fmtKes(cart.total_kes)}</span>
                </div>
                <div className="order-summary-row">
                  <span>Shipping:</span>
                  <span style={{ color: 'var(--amz-green)' }}>Calculate at checkout</span>
                </div>
                <div className="order-summary-row total">
                  <span>Order Total:</span>
                  <span>KES {fmtKes(cart.total_kes)}</span>
                </div>

                <button
                  className="btn-amz-primary"
                  style={{ marginTop: 14 }}
                  onClick={() => navigate('/checkout')}
                >
                  Proceed to Checkout
                </button>

                {/* Payment methods note */}
                <div style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  <div><i className="bi bi-lock-fill" /> Secure checkout</div>
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    <span style={{ background: '#3bb27f', color: '#fff', padding: '2px 6px', borderRadius: 2, fontSize: '.65rem', fontWeight: 700 }}>M-PESA</span>
                    <span style={{ background: '#003087', color: '#fff', padding: '2px 6px', borderRadius: 2, fontSize: '.65rem', fontWeight: 700 }}>PayPal</span>
                    <span style={{ background: '#666', color: '#fff', padding: '2px 6px', borderRadius: 2, fontSize: '.65rem', fontWeight: 700 }}>Card</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <Link to="/store" style={{ color: 'var(--amz-link)', fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="bi bi-arrow-left" /> Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}