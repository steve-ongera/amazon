import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getProducts, getProductsByCategory, searchProducts, getCategories, getBrands } from '../api';
import { Spinner, EmptyState } from '../components/common/index.jsx';
import ProductCard from '../components/common/ProductCard';

const SORT_OPTIONS = [
  { value: '-created_at',    label: 'Newest First' },
  { value: 'price_kes',      label: 'Price: Low to High' },
  { value: '-price_kes',     label: 'Price: High to Low' },
  { value: '-average_rating',label: 'Avg. Customer Review' },
];

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category      = searchParams.get('category') || '';
  const q             = searchParams.get('q') || '';
  const filter        = searchParams.get('filter') || '';
  const sort          = searchParams.get('sort') || '-created_at';
  const page          = parseInt(searchParams.get('page') || '1', 10);
  const selectedBrands = searchParams.getAll('brand');
  const minPrice      = searchParams.get('min_price') || '';
  const maxPrice      = searchParams.get('max_price') || '';

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

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.results || r.data)).catch(() => {});
    getBrands().then(r => setBrands(r.data.results || r.data)).catch(() => {});
  }, []);

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
        res = await getProductsByCategory(category, {
          ...params,
          ...(selectedBrands.length ? { brand: selectedBrands.join(',') } : {}),
        });
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

  // Close drawer on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 900) setDrawerOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const pageCount = Math.ceil(pagination.count / 20);

  const activeFilterCount = [
    category, filter, minPrice, maxPrice, ...selectedBrands
  ].filter(Boolean).length;

  const pageTitle = q         ? `Results for "${q}"` :
    category                  ? category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
    filter === 'best_sellers' ? '🔥 Best Sellers' :
    filter === 'new_arrivals' ? '✨ New Arrivals' :
    filter === 'featured'     ? '⭐ Featured Products' :
    'All Products';

  const FilterContent = () => (
    <>
      <div className="filter-drawer-close">
        <h3>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</h3>
        <button onClick={() => setDrawerOpen(false)} aria-label="Close filters">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* Categories */}
      <div className="filter-section">
        <div className="filter-title">Department</div>
        <label className="filter-option">
          <input type="radio" name="cat" checked={!category} onChange={() => { updateParam('category', ''); setDrawerOpen(false); }} />
          All Categories
        </label>
        {categories.flatMap(c => [c, ...(c.subcategories || [])]).map(c => (
          <label key={c.id} className="filter-option">
            <input type="radio" name="cat" checked={category === c.slug} onChange={() => { updateParam('category', c.slug); setDrawerOpen(false); }} />
            {c.name}
            {c.product_count !== undefined && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '.72rem' }}>
                {c.product_count}
              </span>
            )}
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="number" placeholder="Min" value={minPrice}
            className="form-control" style={{ padding: '5px 8px', width: 80 }}
            onChange={e => updateParam('min_price', e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input
            type="number" placeholder="Max" value={maxPrice}
            className="form-control" style={{ padding: '5px 8px', width: 80 }}
            onChange={e => updateParam('max_price', e.target.value)}
          />
        </div>
        {[
          ['0',     '5000',  'Under KES 5,000'],
          ['5000',  '15000', 'KES 5,000 – 15,000'],
          ['15000', '50000', 'KES 15,000 – 50,000'],
          ['50000', '',      'Above KES 50,000'],
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

      {/* Quick Filters */}
      <div className="filter-section">
        <div className="filter-title">Quick Filters</div>
        {[
          ['best_sellers', '🔥 Best Sellers'],
          ['new_arrivals', '✨ New Arrivals'],
          ['featured',     '⭐ Featured'],
        ].map(([val, label]) => (
          <label key={val} className="filter-option">
            <input type="radio" name="qfilter" checked={filter === val} onChange={() => updateParam('filter', val)} />
            {label}
          </label>
        ))}
      </div>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <Link
          to="/store"
          style={{ display: 'block', textAlign: 'center', fontSize: '.82rem', color: 'var(--amz-link)', marginTop: 8, padding: '6px 0' }}
          onClick={() => setDrawerOpen(false)}
        >
          <i className="bi bi-x-circle" style={{ marginRight: 4 }} />Clear all filters
        </Link>
      )}
    </>
  );

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

          {/* ── Mobile Overlay ──────────────────────── */}
          <div className={`filter-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

          {/* ── Sidebar ─────────────────────────────── */}
          <aside>
            {/* Mobile toggle */}
            <button className="filter-toggle-btn" onClick={() => setDrawerOpen(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-funnel-fill" />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{
                    background: 'var(--amz-orange)', color: '#111',
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.65rem', fontWeight: 800
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <i className="bi bi-chevron-right" />
            </button>

            {/* Desktop sidebar */}
            <div className="filters-sidebar">
              <FilterContent />
            </div>

            {/* Mobile drawer */}
            {drawerOpen && (
              <div className="filters-sidebar drawer">
                <FilterContent />
              </div>
            )}
          </aside>

          {/* ── Product Listing ──────────────────────── */}
          <main>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap',
              gap: 8, marginBottom: 14,
              padding: '10px 14px',
              background: '#fff', borderRadius: 'var(--radius-sm)',
              border: '1px solid #e3e6e6'
            }}>
              <div>
                <h1 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{pageTitle}</h1>
                {!loading && (
                  <div className="search-results-header" style={{ marginBottom: 0, paddingBottom: 0 }}>
                    <strong>{pagination.count.toLocaleString()}</strong> results
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</label>
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

            {/* Products */}
            {loading ? (
              <Spinner />
            ) : products.length === 0 ? (
              <EmptyState
                icon="bi-search"
                title="No products found"
                text="Try adjusting your filters or search term"
                action={
                  <Link to="/store" className="btn-amz-orange" style={{ textDecoration: 'none', marginTop: 8, display: 'inline-flex', padding: '8px 20px', borderRadius: 4 }}>
                    <i className="bi bi-x-circle" style={{ marginRight: 6 }} /> Clear Filters
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
                    <button className="page-btn" disabled={page === 1} onClick={() => updateParam('page', String(page - 1))}>
                      <i className="bi bi-chevron-left" />
                    </button>
                    {(() => {
                      const pages = [];
                      const start = Math.max(1, page - 3);
                      const end = Math.min(pageCount, page + 3);
                      if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < pageCount) { if (end < pageCount - 1) pages.push('...'); pages.push(pageCount); }
                      return pages.map((p, i) => p === '...'
                        ? <span key={`e${i}`} style={{ padding: '0 8px', color: 'var(--text-muted)' }}>…</span>
                        : <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => updateParam('page', String(p))}>{p}</button>
                      );
                    })()}
                    <button className="page-btn" disabled={!pagination.next} onClick={() => updateParam('page', String(page + 1))}>
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