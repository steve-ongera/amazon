// src/components/common/StarRating.jsx
export default function StarRating({ rating, count, size = 'sm' }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars.push('bi-star-fill');
    else if (i === full + 1 && half) stars.push('bi-star-half');
    else stars.push('bi-star');
  }
  return (
    <div className="star-rating">
      <span className="stars">
        {stars.map((s, i) => <i key={i} className={`bi ${s}`} />)}
      </span>
      {count !== undefined && (
        <span className="count">({count.toLocaleString()})</span>
      )}
    </div>
  );
}