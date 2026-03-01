import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { EmptyState } from '../components/common/index.jsx';
import ProductCard from '../components/common/ProductCard';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20 }}>
          <i className="bi bi-heart-fill" style={{ color: '#e74c3c', marginRight: 8 }} />
          Wishlist ({wishlist.length})
        </h1>

        {wishlist.length === 0 ? (
          <EmptyState
            icon="bi-heart"
            title="Your wishlist is empty"
            text="Save items you love by clicking the heart icon on any product."
            action={<Link to="/store" className="btn-amz-orange" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 4, display: 'inline-block', marginTop: 8 }}>Browse Products</Link>}
          />
        ) : (
          <div className="product-grid">
            {wishlist.map(item => item.product && (
              <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}