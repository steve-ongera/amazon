import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getOrder, getMpesaStatus } from '../api';
import { Spinner } from '../components/common/index.jsx';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_COLORS = {
  pending:    { bg: '#fff3cd', color: '#856404' },
  confirmed:  { bg: '#cce5ff', color: '#004085' },
  processing: { bg: '#d4edda', color: '#155724' },
  shipped:    { bg: '#d1ecf1', color: '#0c5460' },
  delivered:  { bg: '#d4edda', color: '#155724' },
  cancelled:  { bg: '#f8d7da', color: '#721c24' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mpesaStatus, setMpesaStatus] = useState(null);
  const pollRef = useRef(null);

  const paymentPending = searchParams.get('payment') === 'pending';

  useEffect(() => {
    getOrder(id)
      .then(r => setOrder(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  // Poll M-Pesa status if awaiting payment
  useEffect(() => {
    if (!paymentPending || !order) return;
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await getMpesaStatus(id);
        setMpesaStatus(data);
        if (data.payment_status === 'completed' || data.payment_status === 'failed' || attempts >= 12) {
          clearInterval(pollRef.current);
          if (data.payment_status === 'completed') {
            getOrder(id).then(r => setOrder(r.data));
          }
        }
      } catch { clearInterval(pollRef.current); }
      attempts++;
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [paymentPending, order]);

  if (loading) return <div className="page-wrapper"><Spinner /></div>;
  if (!order) return <div className="page-wrapper"><div className="amz-container" style={{ padding: 32 }}>Order not found.</div></div>;

  const statusIdx = STATUS_STEPS.indexOf(order.status);
  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.pending;

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px', maxWidth: 860 }}>

        {/* M-Pesa Pending Banner */}
        {paymentPending && (
          <div style={{ background: mpesaStatus?.payment_status === 'completed' ? '#d4edda' : '#fff3cd', border: `1px solid ${mpesaStatus?.payment_status === 'completed' ? '#c3e6cb' : '#ffeeba'}`, borderRadius: 8, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {mpesaStatus?.payment_status === 'completed' ? (
              <i className="bi bi-check-circle-fill" style={{ color: '#28a745', fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }} />
            ) : mpesaStatus?.payment_status === 'failed' ? (
              <i className="bi bi-x-circle-fill" style={{ color: '#dc3545', fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }} />
            ) : (
              <div className="spinner" style={{ width: 24, height: 24, flexShrink: 0, marginTop: 4 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {mpesaStatus?.payment_status === 'completed' ? 'Payment Received!' :
                  mpesaStatus?.payment_status === 'failed' ? 'Payment Failed' :
                  'Waiting for M-Pesa Payment…'}
              </div>
              <div style={{ fontSize: '.85rem', color: '#555' }}>
                {mpesaStatus?.payment_status === 'completed'
                  ? 'Your payment was received successfully. Your order is being processed.'
                  : mpesaStatus?.payment_status === 'failed'
                  ? 'The payment was not completed. Please contact support or retry.'
                  : 'Check your phone for an M-Pesa STK push prompt and enter your PIN to complete payment.'}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Order Details</h1>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              Order #{order.order_number || order.id.toString().slice(0, 8).toUpperCase()} ·{' '}
              Placed {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <span style={{ fontSize: '.82rem', fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, textTransform: 'capitalize' }}>
            {order.status}
          </span>
        </div>

        {/* Progress Tracker */}
        {!['cancelled', 'refunded'].includes(order.status) && (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STATUS_STEPS.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: i <= statusIdx ? 'var(--amz-orange)' : '#eee',
                      color: i <= statusIdx ? '#111' : '#aaa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '.75rem'
                    }}>
                      {i < statusIdx ? <i className="bi bi-check" /> : i + 1}
                    </div>
                    <span style={{ fontSize: '.68rem', textTransform: 'capitalize', whiteSpace: 'nowrap', fontWeight: i === statusIdx ? 700 : 400, color: i === statusIdx ? '#111' : '#888' }}>{s}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < statusIdx ? 'var(--amz-orange)' : '#eee', margin: '0 4px', marginBottom: 18 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* Items */}
          <div>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: '#f7f7f7', padding: '10px 16px', fontWeight: 700, fontSize: '.88rem', borderBottom: '1px solid #ddd' }}>
                Order Items
              </div>
              <div style={{ padding: '0 16px' }}>
                {(order.items || []).map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < order.items.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: 68, height: 68, border: '1px solid #eee', borderRadius: 4, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                      {item.product_image
                        ? <img src={item.product_image} alt={item.product_name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        : <i className="bi bi-image" style={{ color: '#ccc', fontSize: '1.4rem' }} />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <Link to={`/product/${item.product_slug}`} style={{ fontWeight: 600, color: '#111', textDecoration: 'none', fontSize: '.9rem' }}>
                        {item.product_name}
                      </Link>
                      {item.variant_name && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.variant_name}</div>}
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Qty: {item.quantity} · KES {Number(item.unit_price_kes).toLocaleString()} each
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap' }}>
                      KES {Number(item.subtotal_kes).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary + Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Order Summary */}
            <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#f7f7f7', padding: '10px 16px', fontWeight: 700, fontSize: '.88rem', borderBottom: '1px solid #ddd' }}>Order Summary</div>
              <div style={{ padding: '12px 16px', fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>KES {Number(order.subtotal_kes || order.total_kes).toLocaleString()}</span></div>
                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c7511f' }}><span>Discount</span><span>−KES {Number(order.discount_amount).toLocaleString()}</span></div>
                )}
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '.95rem' }}><span>Total</span><span>KES {Number(order.total_kes).toLocaleString()}</span></div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Payment: <strong style={{ textTransform: 'capitalize' }}>{order.payment_method}</strong>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.address && (
              <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#f7f7f7', padding: '10px 16px', fontWeight: 700, fontSize: '.88rem', borderBottom: '1px solid #ddd' }}>Shipping Address</div>
                <div style={{ padding: '12px 16px', fontSize: '.85rem', lineHeight: 1.7 }}>
                  <strong>{order.address.full_name}</strong><br />
                  {order.address.address_line1}<br />
                  {order.address.city}, {order.address.county}<br />
                  {order.address.phone}
                </div>
              </div>
            )}
          </div>
        </div>

        <Link to="/orders" style={{ color: 'var(--amz-teal)', textDecoration: 'none', fontSize: '.88rem' }}>
          ← Back to Orders
        </Link>
      </div>
    </div>
  );
}