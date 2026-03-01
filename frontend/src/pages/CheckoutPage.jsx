// src/pages/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createOrder, mpesaStkPush, mpesaStatus, paypalCreateOrder, validateCoupon, getCounties, getPickupStations } from '../api';
import { Spinner } from '../components/common/index.jsx';

const STEPS = ['Delivery', 'Payment', 'Review'];

export default function CheckoutPage() {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [counties, setCounties] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [mpesaPolling, setMpesaPolling] = useState(false);

  const [form, setForm] = useState({
    full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    delivery_type: 'home',
    pickup_station_id: '',
    shipping_address: '',
    shipping_city: '',
    shipping_county_id: '',
    payment_method: 'mpesa',
    mpesa_phone: user?.profile?.phone || '',
    currency: 'KES',
    notes: '',
  });

  useEffect(() => {
    getCounties().then(r => setCounties(r.data.results || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.shipping_county_id) {
      const county = counties.find(c => c.id === Number(form.shipping_county_id));
      if (county) {
        getPickupStations(county.slug).then(r => setStations(r.data.results || r.data)).catch(() => {});
      }
    }
  }, [form.shipping_county_id, counties]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fmtKes = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

  const subtotal = Number(cart?.total_kes || 0);
  const discount = couponData ? (couponData.discount * (subtotal / (subtotal || 1))) : 0;
  const shipping = form.delivery_type === 'pickup' ? 0 : 350;
  const tax = subtotal * 0.16;
  const total = subtotal + shipping + tax - discount;

  const handleCoupon = async () => {
    if (!couponCode) return;
    try {
      const { data } = await validateCoupon({ code: couponCode, cart_total: subtotal, currency: 'KES' });
      setCouponData(data);
      showToast(`Coupon applied! You save KES ${fmtKes(data.discount)}`, 'success');
    } catch (e) {
      showToast(e.response?.data?.error || 'Invalid coupon', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        coupon_code: couponCode,
        pickup_station_id: form.delivery_type === 'pickup' ? form.pickup_station_id : null,
        shipping_county_id: form.shipping_county_id || null,
      };
      const { data: order } = await createOrder(payload);

      if (form.payment_method === 'mpesa') {
        try {
          await mpesaStkPush({ phone: form.mpesa_phone, order_id: order.id });
          showToast('M-Pesa STK Push sent! Check your phone.', 'success');
          // Poll for payment
          setMpesaPolling(true);
          let tries = 0;
          const poll = setInterval(async () => {
            tries++;
            try {
              const { data: status } = await mpesaStatus(order.id);
              if (status.payment_status === 'paid') {
                clearInterval(poll);
                setMpesaPolling(false);
                fetchCart();
                navigate(`/orders/${order.id}?success=1`);
              } else if (tries >= 20) {
                clearInterval(poll);
                setMpesaPolling(false);
                navigate(`/orders/${order.id}`);
              }
            } catch { clearInterval(poll); setMpesaPolling(false); }
          }, 3000);
        } catch (e) {
          showToast(e.response?.data?.error || 'M-Pesa failed. Try again.', 'error');
          navigate(`/orders/${order.id}`);
        }
      } else if (form.payment_method === 'paypal') {
        const { data: pp } = await paypalCreateOrder({ order_id: order.id });
        if (pp.approval_url) window.location.href = pp.approval_url;
      } else {
        fetchCart();
        navigate(`/orders/${order.id}?success=1`);
      }
    } catch (e) {
      const msg = e.response?.data?.error || JSON.stringify(e.response?.data) || 'Order failed';
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  if (!cart || cart.item_count === 0) {
    return (
      <div className="page-wrapper">
        <div className="amz-container" style={{ padding: 16, textAlign: 'center', paddingTop: 60 }}>
          <i className="bi bi-cart-x" style={{ fontSize: '4rem', color: '#ccc' }} />
          <h2 style={{ marginTop: 12 }}>Your cart is empty</h2>
          <Link to="/store" className="btn-amz" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-block', padding: '10px 24px', borderRadius: 4 }}>
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <i className="bi bi-phone-fill" style={{ color: 'var(--amz-orange)', fontSize: '1.4rem' }} />
            <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Amazon Kenya</strong>
          </Link>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1rem', fontWeight: 700 }}>Secure Checkout</h1>
          </div>
          <i className="bi bi-shield-lock-fill" style={{ color: 'var(--amz-link)', fontSize: '1.2rem' }} />
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', marginBottom: 20, background: '#fff', border: '1px solid var(--border-card)', borderRadius: 4, padding: '10px 16px', gap: 4, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <i className="bi bi-chevron-right" style={{ color: '#ccc', fontSize: '.75rem' }} />}
              <span style={{
                fontWeight: i === step ? 700 : 400,
                color: i < step ? 'var(--amz-link)' : i === step ? 'var(--amz-orange-dark)' : 'var(--text-muted)',
                fontSize: '.85rem', cursor: i < step ? 'pointer' : 'default'
              }} onClick={() => i < step && setStep(i)}>
                {i < step && <i className="bi bi-check2-circle" style={{ marginRight: 3 }} />}
                {s}
              </span>
            </span>
          ))}
        </div>

        <div className="checkout-layout">
          {/* Left: Form */}
          <div>
            {/* STEP 0: Delivery */}
            {step === 0 && (
              <>
                <div className="checkout-section">
                  <div className="checkout-section-title">
                    <i className="bi bi-person-fill" /> Contact Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-control" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Kamau" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0712345678" />
                    </div>
                  </div>
                </div>

                <div className="checkout-section">
                  <div className="checkout-section-title">
                    <i className="bi bi-truck" /> Delivery Method
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    {['home', 'pickup'].map(type => (
                      <label key={type} className={`payment-option ${form.delivery_type === type ? 'selected' : ''}`} style={{ cursor: 'pointer', flex: 1 }}>
                        <input type="radio" name="delivery_type" value={type} checked={form.delivery_type === type} onChange={e => set('delivery_type', e.target.value)} />
                        <i className={`bi ${type === 'home' ? 'bi-house-fill' : 'bi-building'}`} />
                        {type === 'home' ? 'Home Delivery' : 'Pickup Station'}
                        <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: type === 'home' ? 'var(--amz-orange-dark)' : 'var(--amz-green)', fontWeight: 600 }}>
                          {type === 'home' ? '+KES 350' : 'Varies'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {form.delivery_type === 'home' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">County *</label>
                        <select className="form-control" value={form.shipping_county_id} onChange={e => set('shipping_county_id', e.target.value)}>
                          <option value="">-- Select County --</option>
                          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">City / Town *</label>
                        <input className="form-control" value={form.shipping_city} onChange={e => set('shipping_city', e.target.value)} placeholder="Nairobi" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Street Address *</label>
                        <input className="form-control" value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} placeholder="123 Tom Mboya Street, CBD" />
                      </div>
                    </>
                  )}

                  {form.delivery_type === 'pickup' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Select County First</label>
                        <select className="form-control" value={form.shipping_county_id} onChange={e => set('shipping_county_id', e.target.value)}>
                          <option value="">-- Select County --</option>
                          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {stations.length > 0 && (
                        <div className="form-group">
                          <label className="form-label">Pickup Station *</label>
                          <select className="form-control" value={form.pickup_station_id} onChange={e => set('pickup_station_id', e.target.value)}>
                            <option value="">-- Select Station --</option>
                            {stations.map(s => (
                              <option key={s.id} value={s.id}>{s.name} – KES {fmtKes(s.delivery_fee_kes)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label">Order Notes (optional)</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions..." />
                  </div>
                </div>

                <button className="btn-amz-primary" onClick={() => setStep(1)} disabled={!form.full_name || !form.email || !form.phone}>
                  Continue to Payment <i className="bi bi-arrow-right" />
                </button>
              </>
            )}

            {/* STEP 1: Payment */}
            {step === 1 && (
              <>
                <div className="checkout-section">
                  <div className="checkout-section-title">
                    <i className="bi bi-credit-card" /> Payment Method
                  </div>

                  {/* M-Pesa */}
                  <label className={`payment-option ${form.payment_method === 'mpesa' ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value="mpesa" checked={form.payment_method === 'mpesa'} onChange={() => set('payment_method', 'mpesa')} />
                    <span style={{ fontSize: '1.2rem' }}>📱</span>
                    <div>
                      <div className="payment-mpesa">Lipa na M-Pesa</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>STK Push – Instant payment</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '.7rem', background: '#3bb27f', color: '#fff', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>RECOMMENDED</span>
                  </label>

                  {form.payment_method === 'mpesa' && (
                    <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 4, padding: '10px 14px', marginBottom: 10 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#155724' }}>M-Pesa Phone Number</label>
                        <input
                          className="form-control"
                          value={form.mpesa_phone}
                          onChange={e => set('mpesa_phone', e.target.value)}
                          placeholder="0712345678"
                          style={{ maxWidth: 220 }}
                        />
                        <div style={{ fontSize: '.72rem', color: '#155724', marginTop: 4 }}>
                          <i className="bi bi-info-circle" /> You will receive an M-Pesa prompt on this number
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PayPal */}
                  <label className={`payment-option ${form.payment_method === 'paypal' ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value="paypal" checked={form.payment_method === 'paypal'} onChange={() => set('payment_method', 'paypal')} />
                    <span style={{ fontSize: '1.2rem' }}>🅿️</span>
                    <div>
                      <div className="payment-paypal">PayPal</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Pay in USD via PayPal</div>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label className={`payment-option ${form.payment_method === 'cod' ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value="cod" checked={form.payment_method === 'cod'} onChange={() => set('payment_method', 'cod')} />
                    <span style={{ fontSize: '1.2rem' }}>💵</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>Cash on Delivery</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Pay when you receive</div>
                    </div>
                  </label>
                </div>

                {/* Coupon */}
                <div className="checkout-section">
                  <div className="checkout-section-title">
                    <i className="bi bi-tag-fill" /> Coupon / Promo Code
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-control"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-amz" style={{ padding: '8px 16px', flexShrink: 0 }} onClick={handleCoupon}>
                      Apply
                    </button>
                  </div>
                  {couponData && (
                    <div className="alert alert-success" style={{ marginTop: 8 }}>
                      <i className="bi bi-check-circle-fill" />
                      {couponData.description} — You save KES {fmtKes(discount)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-amz-secondary" onClick={() => setStep(0)} style={{ width: 'auto', flex: 1 }}>
                    <i className="bi bi-arrow-left" /> Back
                  </button>
                  <button className="btn-amz-primary" onClick={() => setStep(2)} style={{ flex: 2 }}>
                    Review Order <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Review */}
            {step === 2 && (
              <>
                <div className="checkout-section">
                  <div className="checkout-section-title"><i className="bi bi-list-check" /> Order Review</div>

                  {/* Items */}
                  {(cart?.items || []).map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                      {item.product?.main_image?.image && (
                        <img src={item.product.main_image.image} alt={item.product.name} style={{ width: 60, height: 60, objectFit: 'contain', border: '1px solid #eee', borderRadius: 3, background: '#f7f7f7' }} />
                      )}
                      <div style={{ flex: 1, fontSize: '.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.product?.name}</div>
                        {item.variant && <div style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{item.variant.name}</div>}
                        <div>Qty: {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>KES {fmtKes(item.subtotal_kes)}</div>
                    </div>
                  ))}

                  {/* Delivery & Payment summary */}
                  <div style={{ fontSize: '.82rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><strong>Deliver to:</strong> {form.shipping_address}, {form.shipping_city} · {form.phone}</div>
                    <div><strong>Payment:</strong> {form.payment_method === 'mpesa' ? `M-Pesa (${form.mpesa_phone})` : form.payment_method}</div>
                  </div>
                </div>

                {/* M-Pesa polling */}
                {mpesaPolling && (
                  <div className="alert alert-info">
                    <i className="bi bi-phone-fill" />
                    Waiting for M-Pesa payment... Check your phone.
                    <div className="spinner" style={{ width: 20, height: 20, marginLeft: 8, borderWidth: 2 }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-amz-secondary" onClick={() => setStep(1)} style={{ width: 'auto', flex: 1 }}>
                    <i className="bi bi-arrow-left" /> Back
                  </button>
                  <button
                    className="btn-amz-primary"
                    onClick={handlePlaceOrder}
                    disabled={loading || mpesaPolling}
                    style={{ flex: 2, background: 'linear-gradient(to bottom,#f0c14b,#e47911)', border: '1px solid #c45500' }}
                  >
                    {loading ? <><i className="bi bi-hourglass-split" /> Placing Order...</> : <><i className="bi bi-lock-fill" /> Place Order – KES {fmtKes(total)}</>}
                  </button>
                </div>
                <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  By placing your order, you agree to Amazon Kenya's <a href="/terms">Terms of Service</a>.
                </p>
              </>
            )}
          </div>

          {/* Right: Summary */}
          <div>
            <div className="order-summary" style={{ position: 'sticky', top: 'calc(var(--nav-top-h) + var(--nav-bottom-h) + 12px)' }}>
              <div className="order-summary-title">Order Summary</div>
              <div className="order-summary-row"><span>Items ({cart.item_count}):</span><span>KES {fmtKes(subtotal)}</span></div>
              <div className="order-summary-row"><span>Shipping:</span><span>{shipping === 0 ? <span style={{ color: 'var(--amz-green)' }}>FREE</span> : `KES ${fmtKes(shipping)}`}</span></div>
              <div className="order-summary-row"><span>VAT (16%):</span><span>KES {fmtKes(tax)}</span></div>
              {discount > 0 && (
                <div className="order-summary-row"><span>Discount:</span><span style={{ color: 'var(--amz-green)' }}>− KES {fmtKes(discount)}</span></div>
              )}
              <div className="order-summary-row total"><span>Total:</span><span>KES {fmtKes(total)}</span></div>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: '.72rem', color: 'var(--text-muted)' }}>
                <i className="bi bi-lock-fill" /> Secure &amp; encrypted checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}