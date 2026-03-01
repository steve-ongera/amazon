// src/pages/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  createOrder,
  mpesaSTKPush,        // ✅ was: mpesaStkPush
  getMpesaStatus,      // ✅ was: mpesaStatus
  paypalCreateOrder,
  validateCoupon,
  getCounties,
  getPickupStations,
} from '../api';
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
        // ✅ getPickupStations takes params object, not a plain string
        getPickupStations({ 'county__slug': county.slug })
          .then(r => setStations(r.data.results || r.data))
          .catch(() => {});
      }
    }
  }, [form.shipping_county_id, counties]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fmtKes = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

  const subtotal = Number(cart?.total_kes || 0);
  const couponDiscount = couponData ? Number(couponData.discount || 0) : 0;
  const shipping = form.delivery_type === 'pickup' ? 0 : 350;
  const tax = subtotal * 0.16;
  const total = subtotal + shipping + tax - couponDiscount;

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      // ✅ validateCoupon(code, cartTotal, currency) — matches fixed api.js signature
      const { data } = await validateCoupon(couponCode, subtotal, 'KES');
      setCouponData(data);
      showToast(`Coupon applied! You save KES ${fmtKes(data.discount)}`, 'success');
    } catch (e) {
      setCouponData(null);
      showToast(e.response?.data?.error || 'Invalid or expired coupon', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const payload = {
        full_name:           form.full_name,
        email:               form.email,
        phone:               form.phone,
        payment_method:      form.payment_method,
        currency:            form.currency,
        delivery_type:       form.delivery_type,
        pickup_station_id:   form.delivery_type === 'pickup' ? form.pickup_station_id || null : null,
        shipping_address:    form.shipping_address,
        shipping_city:       form.shipping_city,
        shipping_county_id:  form.shipping_county_id || null,
        coupon_code:         couponCode || '',
        notes:               form.notes,
        mpesa_phone:         form.payment_method === 'mpesa' ? form.mpesa_phone : '',
      };

      const { data: order } = await createOrder(payload);

      if (form.payment_method === 'mpesa') {
        try {
          await mpesaSTKPush({ phone: form.mpesa_phone, order_id: order.id });
          showToast('M-Pesa prompt sent! Check your phone.', 'success');
          setMpesaPolling(true);
          let tries = 0;
          const poll = setInterval(async () => {
            tries++;
            try {
              const { data: status } = await getMpesaStatus(order.id);
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
            } catch {
              clearInterval(poll);
              setMpesaPolling(false);
            }
          }, 3000);
        } catch (e) {
          showToast(e.response?.data?.error || 'M-Pesa push failed. You can pay from your orders page.', 'error');
          navigate(`/orders/${order.id}`);
        }
      } else if (form.payment_method === 'paypal') {
        const { data: pp } = await paypalCreateOrder({ order_id: order.id });
        if (pp.approval_url) window.location.href = pp.approval_url;
        else showToast('Could not get PayPal URL', 'error');
      } else {
        // COD or card
        fetchCart();
        navigate(`/orders/${order.id}?success=1`);
      }
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.error || data?.detail || JSON.stringify(data) || 'Order failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!cart || cart.item_count === 0) {
    return (
      <div className="page-wrapper">
        <div className="amz-container" style={{ padding: '60px 16px', textAlign: 'center' }}>
          <i className="bi bi-cart-x" style={{ fontSize: '4rem', color: '#ccc', display: 'block', marginBottom: 12 }} />
          <h2 style={{ marginBottom: 8 }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Add some items before checking out.</p>
          <Link to="/store" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 24px', borderRadius: 4, textDecoration: 'none',
            background: 'linear-gradient(to bottom,#ffd76e,#f0a800)',
            border: '1px solid #c68a00', color: '#111', fontWeight: 700,
          }}>
            <i className="bi bi-bag" /> Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px 16px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 8 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <i className="bi bi-phone-fill" style={{ color: 'var(--amz-orange)', fontSize: '1.4rem' }} />
            <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Amazon Kenya</strong>
          </Link>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Secure Checkout</h1>
          </div>
          <i className="bi bi-shield-lock-fill" style={{ color: 'var(--amz-link)', fontSize: '1.2rem' }} />
        </div>

        {/* Step indicators */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 18, background: '#fff',
          border: '1px solid #e3e6e6', borderRadius: 6,
          padding: '10px 18px',
        }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <i className="bi bi-chevron-right" style={{ color: '#ccc', fontSize: '.7rem' }} />}
              <span
                style={{
                  fontWeight: i === step ? 800 : 400,
                  color: i < step ? 'var(--amz-link)' : i === step ? 'var(--amz-orange-dark)' : 'var(--text-muted)',
                  fontSize: '.85rem',
                  cursor: i < step ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
                onClick={() => i < step && setStep(i)}
              >
                {i < step
                  ? <i className="bi bi-check-circle-fill" style={{ color: 'var(--amz-link)' }} />
                  : (
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: i === step ? 'var(--amz-orange)' : '#e0e0e0',
                      color: i === step ? '#111' : '#888',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.7rem', fontWeight: 800,
                    }}>
                      {i + 1}
                    </span>
                  )
                }
                {s}
              </span>
            </span>
          ))}
        </div>

        {/* Main layout */}
        <div className="checkout-layout">

          {/* ── Left: steps ──────────────────────────────────── */}
          <div>

            {/* ══ STEP 0: Delivery ══════════════════════════ */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-person-fill" style={{ marginRight: 7 }} />Contact Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name *</label>
                      <input className="form-control" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="John Kamau" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email *</label>
                      <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Phone *</label>
                      <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0712345678" />
                    </div>
                  </div>
                </div>

                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-truck" style={{ marginRight: 7 }} />Delivery Method
                  </div>

                  {/* Delivery type toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { value: 'home', icon: 'bi-house-fill', label: 'Home Delivery', sub: '+KES 350', subColor: '#c45500' },
                      { value: 'pickup', icon: 'bi-building', label: 'Pickup Station', sub: 'Varies by station', subColor: 'var(--amz-green)' },
                    ].map(opt => (
                      <label key={opt.value} style={{
                        display: 'flex', flexDirection: 'column', gap: 4,
                        padding: '12px 14px', borderRadius: 6, cursor: 'pointer',
                        border: form.delivery_type === opt.value
                          ? '2px solid var(--amz-orange)'
                          : '1px solid #d5d9d9',
                        background: form.delivery_type === opt.value ? '#fffbf5' : '#fff',
                        transition: 'border-color .15s, background .15s',
                      }}>
                        <input
                          type="radio" name="delivery_type" value={opt.value}
                          checked={form.delivery_type === opt.value}
                          onChange={e => set('delivery_type', e.target.value)}
                          style={{ display: 'none' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <i className={`bi ${opt.icon}`} style={{ color: form.delivery_type === opt.value ? 'var(--amz-orange)' : 'var(--text-muted)', fontSize: '1.1rem' }} />
                          <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{opt.label}</span>
                        </div>
                        <span style={{ fontSize: '.72rem', color: opt.subColor, fontWeight: 600, paddingLeft: 24 }}>{opt.sub}</span>
                      </label>
                    ))}
                  </div>

                  {/* County (both types) */}
                  <div className="form-group">
                    <label className="form-label">County *</label>
                    <select className="form-control" value={form.shipping_county_id} onChange={e => set('shipping_county_id', e.target.value)}>
                      <option value="">-- Select County --</option>
                      {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Home delivery fields */}
                  {form.delivery_type === 'home' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">City / Town *</label>
                        <input className="form-control" value={form.shipping_city} onChange={e => set('shipping_city', e.target.value)} placeholder="Nairobi" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Street Address *</label>
                        <input className="form-control" value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} placeholder="123 Tom Mboya Street, CBD" />
                      </div>
                    </>
                  )}

                  {/* Pickup station selector */}
                  {form.delivery_type === 'pickup' && stations.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Pickup Station *</label>
                      <select className="form-control" value={form.pickup_station_id} onChange={e => set('pickup_station_id', e.target.value)}>
                        <option value="">-- Select Station --</option>
                        {stations.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} — KES {fmtKes(s.delivery_fee_kes)} | {s.operating_hours}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.delivery_type === 'pickup' && form.shipping_county_id && stations.length === 0 && (
                    <div className="alert alert-info" style={{ marginTop: 8 }}>
                      <i className="bi bi-info-circle" /> No pickup stations found in this county.
                    </div>
                  )}
                </div>

                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-chat-left-text" style={{ marginRight: 7 }} />Order Notes
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Special instructions, landmark, etc."
                    style={{ resize: 'none' }}
                  />
                </div>

                <button
                  onClick={() => setStep(1)}
                  disabled={!form.full_name.trim() || !form.email.trim() || !form.phone.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '12px 16px',
                    background: 'linear-gradient(to bottom,#ffd76e,#f0a800)',
                    border: '1px solid #c68a00', borderRadius: 4,
                    fontSize: '.95rem', fontWeight: 700, color: '#111', cursor: 'pointer',
                    opacity: (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) ? 0.5 : 1,
                  }}
                >
                  Continue to Payment <i className="bi bi-arrow-right" />
                </button>
              </div>
            )}

            {/* ══ STEP 1: Payment ═══════════════════════════ */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-credit-card" style={{ marginRight: 7 }} />Payment Method
                  </div>

                  {[
                    { value: 'mpesa',  emoji: '📱', label: 'Lipa na M-Pesa',   sub: 'STK Push — instant payment', badge: 'RECOMMENDED', badgeColor: '#3bb27f' },
                    { value: 'paypal', emoji: '🅿️', label: 'PayPal',           sub: 'Pay in USD via PayPal' },
                    { value: 'cod',    emoji: '💵', label: 'Cash on Delivery', sub: 'Pay when you receive' },
                  ].map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 6, cursor: 'pointer',
                      marginBottom: 8,
                      border: form.payment_method === opt.value
                        ? '2px solid var(--amz-orange)'
                        : '1px solid #d5d9d9',
                      background: form.payment_method === opt.value ? '#fffbf5' : '#fff',
                      transition: 'border-color .15s, background .15s',
                    }}>
                      <input
                        type="radio" name="payment" value={opt.value}
                        checked={form.payment_method === opt.value}
                        onChange={() => set('payment_method', opt.value)}
                        style={{ accentColor: 'var(--amz-orange)' }}
                      />
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{opt.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{opt.label}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{opt.sub}</div>
                      </div>
                      {opt.badge && (
                        <span style={{ fontSize: '.65rem', background: opt.badgeColor, color: '#fff', padding: '2px 7px', borderRadius: 3, fontWeight: 800 }}>
                          {opt.badge}
                        </span>
                      )}
                    </label>
                  ))}

                  {/* M-Pesa phone input */}
                  {form.payment_method === 'mpesa' && (
                    <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 4, padding: '12px 14px', marginTop: 4 }}>
                      <label className="form-label" style={{ color: '#155724', marginBottom: 6, display: 'block' }}>
                        <i className="bi bi-phone-fill" style={{ marginRight: 5 }} />M-Pesa Phone Number
                      </label>
                      <input
                        className="form-control"
                        value={form.mpesa_phone}
                        onChange={e => set('mpesa_phone', e.target.value)}
                        placeholder="0712345678"
                        style={{ maxWidth: 240, borderColor: '#c3e6cb' }}
                      />
                      <div style={{ fontSize: '.72rem', color: '#155724', marginTop: 6 }}>
                        <i className="bi bi-info-circle" /> You'll receive an M-Pesa prompt on this number to confirm payment.
                      </div>
                    </div>
                  )}
                </div>

                {/* Coupon */}
                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-tag-fill" style={{ marginRight: 7 }} />Promo / Coupon Code
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-control"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); }}
                      style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.5px' }}
                    />
                    <button
                      onClick={handleCoupon}
                      style={{
                        padding: '8px 18px', borderRadius: 4, flexShrink: 0,
                        background: 'linear-gradient(to bottom,#f7dfa5,#f0c14b)',
                        border: '1px solid #a88734', fontWeight: 700, fontSize: '.85rem',
                        cursor: 'pointer', color: '#111',
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {couponData && (
                    <div className="alert alert-success" style={{ marginTop: 8 }}>
                      <i className="bi bi-check-circle-fill" />
                      {couponData.description} — You save KES {fmtKes(couponDiscount)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setStep(0)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 4,
                      background: 'linear-gradient(to bottom,#f5f5f5,#e8e8e8)',
                      border: '1px solid #aaa', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <i className="bi bi-arrow-left" /> Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      flex: 2, padding: '10px', borderRadius: 4,
                      background: 'linear-gradient(to bottom,#ffd76e,#f0a800)',
                      border: '1px solid #c68a00', fontWeight: 700, cursor: 'pointer', color: '#111',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    Review Order <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Review ════════════════════════════ */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="checkout-card">
                  <div className="checkout-step-title">
                    <i className="bi bi-list-check" style={{ marginRight: 7 }} />Review Your Order
                  </div>

                  {/* Cart items */}
                  {(cart?.items || []).map(item => (
                    <div key={item.id} style={{
                      display: 'flex', gap: 12,
                      paddingBottom: 12, marginBottom: 12,
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      {item.product?.main_image?.image && (
                        <img
                          src={item.product.main_image.image}
                          alt={item.product.name}
                          style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, background: '#f7f7f7', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, fontSize: '.85rem' }}>
                        <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{item.product?.name}</div>
                        {item.variant && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{item.variant.name}</div>
                        )}
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Qty: {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>
                        KES {fmtKes(item.subtotal_kes)}
                      </div>
                    </div>
                  ))}

                  {/* Delivery & payment summary */}
                  <div style={{
                    background: '#f8f9f9', borderRadius: 4, padding: '10px 12px',
                    fontSize: '.82rem', display: 'flex', flexDirection: 'column', gap: 5,
                    marginTop: 4,
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <i className="bi bi-geo-alt-fill" style={{ color: 'var(--amz-link)', flexShrink: 0, marginTop: 1 }} />
                      <span>
                        <strong>Deliver to:</strong>{' '}
                        {form.delivery_type === 'home'
                          ? `${form.shipping_address}, ${form.shipping_city}`
                          : `Pickup Station – ${stations.find(s => s.id === Number(form.pickup_station_id))?.name || ''}`
                        }
                        {' '}· {form.phone}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <i className="bi bi-credit-card-fill" style={{ color: 'var(--amz-link)', flexShrink: 0, marginTop: 1 }} />
                      <span>
                        <strong>Payment:</strong>{' '}
                        {form.payment_method === 'mpesa'
                          ? `M-Pesa (${form.mpesa_phone})`
                          : form.payment_method === 'paypal' ? 'PayPal'
                          : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* M-Pesa polling indicator */}
                {mpesaPolling && (
                  <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="bi bi-phone-fill" style={{ fontSize: '1.1rem' }} />
                    <span>Waiting for M-Pesa payment confirmation… Check your phone.</span>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: 0, flexShrink: 0 }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading || mpesaPolling}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 4,
                      background: 'linear-gradient(to bottom,#f5f5f5,#e8e8e8)',
                      border: '1px solid #aaa', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      opacity: loading || mpesaPolling ? 0.5 : 1,
                    }}
                  >
                    <i className="bi bi-arrow-left" /> Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading || mpesaPolling}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 4,
                      background: 'linear-gradient(to bottom,#f0c14b,#e47911)',
                      border: '1px solid #c45500', fontWeight: 700, cursor: 'pointer', color: '#111',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: '.95rem',
                      opacity: loading || mpesaPolling ? 0.6 : 1,
                    }}
                  >
                    {loading
                      ? <><i className="bi bi-hourglass-split" /> Placing Order…</>
                      : <><i className="bi bi-lock-fill" /> Place Order — KES {fmtKes(total)}</>
                    }
                  </button>
                </div>

                <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  By placing your order you agree to Amazon Kenya's{' '}
                  <Link to="/terms" style={{ color: 'var(--amz-link)' }}>Terms of Service</Link>.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Order summary ─────────────────────────── */}
          <div>
            <div style={{
              background: '#fff', border: '1px solid #e3e6e6', borderRadius: 8, padding: '18px 20px',
              position: 'sticky', top: 'calc(var(--nav-top-h) + var(--nav-bottom-h) + 12px)',
            }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                Order Summary
              </div>

              {/* Mini cart items */}
              <div style={{ marginBottom: 12 }}>
                {(cart?.items || []).slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    {item.product?.main_image?.image && (
                      <img src={item.product.main_image.image} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 3, border: '1px solid #eee', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, fontSize: '.75rem', lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 600 }}>{item.product?.name?.slice(0, 32)}{item.product?.name?.length > 32 ? '…' : ''}</div>
                      <div style={{ color: 'var(--text-muted)' }}>×{item.quantity}</div>
                    </div>
                    <span style={{ fontSize: '.78rem', fontWeight: 700, flexShrink: 0 }}>
                      KES {fmtKes(item.subtotal_kes)}
                    </span>
                  </div>
                ))}
                {cart.item_count > 3 && (
                  <div style={{ fontSize: '.75rem', color: 'var(--amz-link)', textAlign: 'right' }}>
                    +{cart.item_count - 3} more item{cart.item_count - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                {[
                  { label: `Items (${cart.item_count})`, value: `KES ${fmtKes(subtotal)}` },
                  { label: 'Shipping', value: shipping === 0 ? 'FREE' : `KES ${fmtKes(shipping)}`, green: shipping === 0 },
                  { label: 'VAT (16%)', value: `KES ${fmtKes(tax)}` },
                  ...(couponDiscount > 0 ? [{ label: 'Discount', value: `− KES ${fmtKes(couponDiscount)}`, green: true }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={row.green ? { color: 'var(--amz-green)', fontWeight: 700 } : {}}>{row.value}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '1rem', fontWeight: 800, color: 'var(--amz-red)',
                  borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 4,
                }}>
                  <span>Order Total</span>
                  <span>KES {fmtKes(total)}</span>
                </div>
              </div>

              <div style={{ marginTop: 14, textAlign: 'center', fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <i className="bi bi-lock-fill" style={{ color: 'var(--amz-link)' }} />
                Secure &amp; encrypted checkout
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}