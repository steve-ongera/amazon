// src/pages/OrdersPage.jsx
import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getOrders, getOrder } from '../api';
import { Spinner, EmptyState } from '../components/common/index.jsx';

function statusClass(s) {
  const map = { pending: 'status-pending', payment_pending: 'status-pending', confirmed: 'status-confirmed', processing: 'status-processing', shipped: 'status-shipped', out_for_delivery: 'status-shipped', delivered: 'status-delivered', cancelled: 'status-cancelled', refunded: 'status-cancelled' };
  return map[s] || 'status-pending';
}

function statusIcon(s) {
  const map = { pending: 'bi-clock', payment_pending: 'bi-hourglass-split', confirmed: 'bi-check-circle', processing: 'bi-gear', shipped: 'bi-truck', delivered: 'bi-check2-all', cancelled: 'bi-x-circle', refunded: 'bi-arrow-counterclockwise' };
  return map[s] || 'bi-circle';
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then(r => setOrders(r.data.results || r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtKes = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

  if (loading) return <div className="page-wrapper"><Spinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>
          <i className="bi bi-bag-check" style={{ color: 'var(--amz-orange)', marginRight: 8 }} />
          Your Orders
        </h1>

        {orders.length === 0 ? (
          <div className="amz-panel">
            <EmptyState
              icon="bi-bag"
              title="No orders yet"
              text="You haven't placed any orders. Start shopping!"
              action={
                <Link to="/store" style={{
                  display: 'inline-block', marginTop: 12, padding: '10px 24px', borderRadius: 4,
                  background: 'linear-gradient(to bottom,#f0c14b,#e47911)', border: '1px solid #c45500',
                  color: '#111', fontWeight: 700, textDecoration: 'none'
                }}>
                  Shop Now
                </Link>
              }
            />
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div><div style={{ textTransform: 'uppercase', fontSize: '.65rem' }}>Order Placed</div><strong>{new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></div>
                <div><div style={{ textTransform: 'uppercase', fontSize: '.65rem' }}>Total</div><strong>KES {fmtKes(order.total)}</strong></div>
                <div><div style={{ textTransform: 'uppercase', fontSize: '.65rem' }}>Ship To</div><strong>{order.full_name}</strong></div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '.65rem', textTransform: 'uppercase' }}>Order #{order.order_number}</div>
                  <Link to={`/orders/${order.id}`} style={{ color: 'var(--amz-link)', fontSize: '.78rem' }}>View order details</Link>
                </div>
              </div>
              <div className="order-card-body">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <span className={`order-status ${statusClass(order.status)}`}>
                      <i className={`bi ${statusIcon(order.status)}`} />
                      {order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>

                    {/* Item thumbnails */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {(order.items || []).slice(0, 4).map(item => (
                        <div key={item.id} style={{ fontSize: '.78rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                          {item.image_url && (
                            <img src={item.image_url} alt={item.product_name} style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid #eee', borderRadius: 3 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                            <div style={{ color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
                    <Link to={`/orders/${order.id}`} className="btn-amz-secondary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                      Order Details
                    </Link>
                    {order.status === 'delivered' && (
                      <button className="btn-amz-secondary">Write Review</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getOrder(id).then(r => setOrder(r.data)).catch(() => navigate('/orders')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-wrapper"><Spinner /></div>;
  if (!order) return null;

  const fmtKes = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });

  const timeline = [
    { status: 'pending', label: 'Order Placed', icon: 'bi-check2' },
    { status: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle' },
    { status: 'processing', label: 'Processing', icon: 'bi-gear' },
    { status: 'shipped', label: 'Shipped', icon: 'bi-truck' },
    { status: 'delivered', label: 'Delivered', icon: 'bi-check2-all' },
  ];
  const statusOrder = ['pending', 'payment_pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        {/* Success banner */}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 16, fontSize: '1rem', justifyContent: 'center' }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: '1.4rem' }} />
            <div>
              <strong>Order placed successfully!</strong>
              <div style={{ fontSize: '.82rem' }}>Thank you for shopping with PhonePlace Kenya. Order #{order.order_number}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Order #{order.order_number}</h1>
          <Link to="/orders" style={{ color: 'var(--amz-link)', fontSize: '.82rem' }}>
            <i className="bi bi-arrow-left" /> Back to orders
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Order timeline */}
          {!['cancelled', 'refunded'].includes(order.status) && (
            <div className="amz-panel">
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '.9rem' }}>Order Status</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {/* Progress bar */}
                <div style={{
                  position: 'absolute', top: 20, left: '10%', right: '10%', height: 3,
                  background: '#eee', zIndex: 0
                }}>
                  <div style={{ height: '100%', background: 'var(--amz-orange)', width: `${(currentIdx / (statusOrder.length - 1)) * 100}%`, transition: 'width .5s' }} />
                </div>
                {timeline.map((t, i) => {
                  const done = statusOrder.indexOf(t.status) <= currentIdx;
                  return (
                    <div key={t.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, flex: 1 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: done ? 'var(--amz-orange)' : '#eee',
                        color: done ? '#111' : '#aaa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `3px solid ${done ? 'var(--amz-orange-dark)' : '#ddd'}`,
                        fontSize: '1rem', transition: 'all .3s'
                      }}>
                        <i className={`bi ${t.icon}`} />
                      </div>
                      <div style={{ fontSize: '.68rem', textAlign: 'center', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 700 : 400 }}>{t.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main order info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {/* Items */}
            <div className="amz-panel">
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '.9rem' }}>
                <i className="bi bi-box-seam" style={{ marginRight: 6 }} /> Items Ordered
              </div>
              {(order.items || []).map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.product_name} style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #eee', borderRadius: 3, background: '#f7f7f7' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{item.product_name}</div>
                    {item.variant_name && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{item.variant_name}</div>}
                    <div style={{ fontSize: '.78rem' }}>Qty: {item.quantity} · SKU: {item.sku}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', textAlign: 'right' }}>
                    <div>KES {fmtKes(item.subtotal)}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>KES {fmtKes(item.price)} each</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16 }}>
              {/* Delivery info */}
              <div className="amz-panel">
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '.9rem' }}>
                  <i className="bi bi-truck" style={{ marginRight: 6 }} /> Delivery
                </div>
                <div style={{ fontSize: '.82rem', lineHeight: 1.8 }}>
                  <div><strong>{order.full_name}</strong></div>
                  <div>{order.shipping_address}</div>
                  <div>{order.shipping_city}{order.shipping_county_name ? `, ${order.shipping_county_name}` : ''}</div>
                  <div>{order.phone}</div>
                  {order.tracking_number && (
                    <div style={{ marginTop: 6, color: 'var(--amz-link)', fontWeight: 600 }}>
                      <i className="bi bi-box-seam" /> Tracking: {order.tracking_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="amz-panel">
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '.9rem' }}>
                  <i className="bi bi-credit-card" style={{ marginRight: 6 }} /> Payment
                </div>
                <div style={{ fontSize: '.82rem', lineHeight: 1.8 }}>
                  <div><strong>{order.payment_method === 'mpesa' ? 'M-Pesa' : order.payment_method}</strong></div>
                  {order.mpesa_phone && <div>Phone: {order.mpesa_phone}</div>}
                  <div style={{ marginTop: 4 }}>
                    <span className={`order-status ${order.payment_status === 'paid' ? 'status-delivered' : 'status-pending'}`}>
                      {order.payment_status === 'paid' ? '✓ Paid' : 'Pending Payment'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order totals */}
              <div className="amz-panel">
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '.9rem' }}>
                  <i className="bi bi-receipt" style={{ marginRight: 6 }} /> Order Summary
                </div>
                <div style={{ fontSize: '.82rem' }}>
                  {[
                    ['Items:', fmtKes(order.subtotal)],
                    ['Shipping:', fmtKes(order.shipping_fee)],
                    ['VAT (16%):', fmtKes(order.tax)],
                    order.discount > 0 && ['Discount:', `−${fmtKes(order.discount)}`],
                  ].filter(Boolean).map(([label, val], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{label}</span><span>KES {val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 6, marginTop: 4, fontWeight: 700, fontSize: '.9rem', color: 'var(--amz-red)' }}>
                    <span>Order Total:</span><span>KES {fmtKes(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}