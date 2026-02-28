// src/pages/StorePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getProducts, getProductsByCategory, searchProducts, getCategories, getBrands } from '../api';
import { Spinner, EmptyState } from '../components/common/index.jsx';
import ProductCard from '../components/common/ProductCard';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'price_kes', label: 'Price: Low to High' },
  { value: '-price_kes', label: 'Price: High to Low' },
  { value: '-average_rating', label: 'Avg. Customer Review' },
];

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const q = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || '';
  const sort = searchParams.get('sort') || '-created_at';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedBrands = searchParams.getAll('brand');
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  const updateParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.set('page', '1');
    setSearchParams(p);
  };

  const toggleBrand = (slug) => {
    const p = new URLSearchParams(searchParams);
    const existing = p.getAll('brand');
    p.delete('brand');
    if (existing.includes(slug)) {
      existing.filter(b => b !== slug).forEach(b => p.append('brand', b));
    } else {
      [...existing, slug].forEach(b => p.append('brand', b));
    }
    p.set('page', '1');
    setSearchParams(p);
  };

  // Load side data
  useEffect(() => {
    getCategories().then(r => setCategories(r.data.results || r.data)).catch(() => {});
    getBrands().then(r => setBrands(r.data.results || r.data)).catch(() => {});
  }, []);

  // Load products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = { page, ordering: sort };
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      if (q) {
        res = await searchProducts(q, params);
      } else if (category) {
        const brandList = selectedBrands;
        res = await getProductsByCategory(category, { ...params, ...(brandList.length ? { brand: brandList.join(',') } : {}) });
      } else {
        if (filter === 'best_sellers') params.is_best_seller = true;
        else if (filter === 'new_arrivals') params.is_new_arrival = true;
        else if (filter === 'featured') params.is_featured = true;
        if (selectedBrands.length) params['brand__slug__in'] = selectedBrands.join(',');
        res = await getProducts(params);
      }

      const d = res.data;
      if (d.results !== undefined) {
        setProducts(d.results);
        setPagination({ count: d.count, next: d.next, previous: d.previous });
      } else {
        setProducts(Array.isArray(d) ? d : []);
        setPagination({ count: Array.isArray(d) ? d.length : 0 });
      }
    } catch {
      setProducts([]);
    } finally { setLoading(false); }
  }, [q, category, filter, sort, page, minPrice, maxPrice, selectedBrands.join(',')]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const pageCount = Math.ceil(pagination.count / 20);

  const pageTitle = q ? `Results for "${q}"` :
    category ? category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
    filter === 'best_sellers' ? '🔥 Best Sellers' :
    filter === 'new_arrivals' ? '✨ New Arrivals' :
    filter === 'featured' ? 'Featured Products' :
    'All Products';

  return (
    <div className="page-wrapper">
      <div className="amz-container" style={{ padding: '16px' }}>
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{pageTitle}</span>
        </nav>

        <div className="store-layout">
          {/* ── Filters Sidebar ──────────────────────────── */}
          <aside>
            <button
              className="btn-amz-secondary"
              style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowFilters(v => !v)}
            >
              <i className="bi bi-funnel" /> Filters
              <i className={`bi bi-chevron-${showFilters ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} />
            </button>

            <div className="filters-sidebar" style={{ display: showFilters || window.innerWidth >= 768 ? 'block' : 'none' }}>
              {/* Categories */}
              <div className="filter-section">
                <div className="filter-title">Department</div>
                <label className="filter-option">
                  <input type="radio" name="cat" checked={!category} onChange={() => updateParam('category', '')} />
                  All Categories
                </label>
                {categories.flatMap(c => [c, ...(c.subcategories || [])]).map(c => (
                  <label key={c.id} className="filter-option">
                    <input type="radio" name="cat" checked={category === c.slug} onChange={() => updateParam('category', c.slug)} />
                    {c.name} {c.product_count !== undefined && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({c.product_count})</span>}
                  </label>
                ))}
              </div>

              {/* Brands */}
              {brands.length > 0 && (
                <div className="filter-section">
                  <div className="filter-title">Brand</div>
                  {brands.slice(0, 12).map(b => (
                    <label key={b.id} className="filter-option">
                      <input type="checkbox" checked={selectedBrands.includes(b.slug)} onChange={() => toggleBrand(b.slug)} />
                      {b.name}
                    </label>
                  ))}
                </div>
              )}

              {/* Price Range */}
              <div className="filter-section">
                <div className="filter-title">Price (KES)</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number" placeholder="Min" value={minPrice}
                    className="form-control" style={{ padding: '5px 8px', width: 80 }}
                    onChange={e => updateParam('min_price', e.target.value)}
                  />
                  <span>–</span>
                  <input
                    type="number" placeholder="Max" value={maxPrice}
                    className="form-control" style={{ padding: '5px 8px', width: 80 }}
                    onChange={e => updateParam('max_price', e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {[
                    ['0', '5000', 'Under KES 5,000'],
                    ['5000', '15000', 'KES 5,000 – 15,000'],
                    ['15000', '50000', 'KES 15,000 – 50,000'],
                    ['50000', '', 'Above KES 50,000'],
                  ].map(([min, max, label]) => (
                    <label key={label} className="filter-option">
                      <input
                        type="radio" name="price_range"
                        checked={minPrice === min && maxPrice === max}
                        onChange={() => { updateParam('min_price', min); updateParam('max_price', max); }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="filter-section">
                <div className="filter-title">Quick Filters</div>
                {[
                  ['best_sellers', '🔥 Best Sellers'],
                  ['new_arrivals', '✨ New Arrivals'],
                  ['featured', '⭐ Featured'],
                ].map(([val, label]) => (
                  <label key={val} className="filter-option">
                    <input type="radio" name="filter" checked={filter === val} onChange={() => updateParam('filter', val)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Product Listing ──────────────────────────── */}
          <main>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 2 }}>{pageTitle}</h1>
                <div className="search-results-header">
                  {!loading && <span><strong>{pagination.count}</strong> results</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Sort by:</label>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: '.82rem' }}
                  value={sort}
                  onChange={e => updateParam('sort', e.target.value)}
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <Spinner />
            ) : products.length === 0 ? (
              <EmptyState
                icon="bi-search"
                title="No products found"
                text="Try adjusting your filters or search term"
                action={
                  <Link to="/store" className="btn-amz" style={{ textDecoration: 'none', marginTop: 8, display: 'inline-flex' }}>
                    Clear Filters
                  </Link>
                }
              />
            ) : (
              <>
                <div className="product-grid">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="pagination">
                    <button
                      className="page-btn"
                      disabled={page === 1}
                      onClick={() => updateParam('page', String(page - 1))}
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    {[...Array(Math.min(pageCount, 7))].map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          className={`page-btn ${p === page ? 'active' : ''}`}
                          onClick={() => updateParam('page', String(p))}
                        >
                          {p}
                        </button>
                      );
                    })}
                    {pageCount > 7 && <span style={{ padding: '0 8px' }}>...</span>}
                    <button
                      className="page-btn"
                      disabled={!pagination.next}
                      onClick={() => updateParam('page', String(page + 1))}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}