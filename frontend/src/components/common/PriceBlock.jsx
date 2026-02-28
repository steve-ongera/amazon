// src/components/common/PriceBlock.jsx
export default function PriceBlock({ priceKes, priceUsd, oldKes, discount, large }) {
  const fmt = (n) => n ? Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 }) : '0';

  return (
    <div className="price-block">
      <div>
        <span className="price-currency">KES </span>
        <span className="price-whole" style={large ? { fontSize: '1.6rem' } : {}}>
          {fmt(priceKes)}
        </span>
        {discount > 0 && (
          <span className="badge badge-sale" style={{ marginLeft: 6, verticalAlign: 'middle' }}>-{discount}%</span>
        )}
      </div>
      {oldKes && <div className="price-old">Was KES {fmt(oldKes)}</div>}
      {priceUsd && <div className="price-usd">≈ USD {Number(priceUsd).toFixed(2)}</div>}
    </div>
  );
}