import axios from 'axios';

// ── Axios Instance ────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh/`,
          { refresh }
        );
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────
export const register       = (data)           => api.post('/auth/register/', data);
export const login          = (data)           => api.post('/auth/login/', data);
export const refreshToken   = (refresh)        => api.post('/auth/refresh/', { refresh });
export const getProfile     = ()               => api.get('/auth/profile/');
export const updateProfile  = (data)           => api.patch('/auth/profile/', data);
export const changePassword = (data)           => api.post('/auth/change-password/', data);

// ── Homepage ──────────────────────────────────────────────
export const getHomepage    = ()               => api.get('/homepage/');

// ── Catalogue ─────────────────────────────────────────────
export const getCategories  = (params)         => api.get('/categories/', { params });
export const getCategory    = (slug)           => api.get(`/categories/${slug}/`);
export const getBrands      = (params)         => api.get('/brands/', { params });
export const getBrand       = (slug)           => api.get(`/brands/${slug}/`);

export const getProducts    = (params)         => api.get('/products/', { params });
export const getProduct     = (slug)           => api.get(`/products/${slug}/`);
export const searchProducts = (q, params)      => api.get('/products/', { params: { ...params, search: q } });
export const getProductsByCategory = (slug, params) =>
  api.get('/products/', { params: { ...params, category__slug: slug } });

export const getBanners     = (params)         => api.get('/banners/', { params });

// ── Cart ──────────────────────────────────────────────────
export const getCart        = ()               => api.get('/cart/');
export const addToCart      = (data)           => api.post('/cart/add_item/', data);
export const updateCartItem = (itemId, qty)    => api.patch(`/cart/update_item/`, { item_id: itemId, quantity: qty });
export const removeFromCart = (itemId)         => api.post('/cart/remove_item/', { item_id: itemId });
export const clearCart      = ()               => api.post('/cart/clear/');

// ── Wishlist ──────────────────────────────────────────────
export const getWishlist         = ()          => api.get('/wishlist/');
export const addToWishlist       = (productId) => api.post('/wishlist/', { product_id: productId });
export const removeFromWishlist  = (id)        => api.delete(`/wishlist/${id}/`);

// ── Addresses ─────────────────────────────────────────────
export const getAddresses   = ()               => api.get('/addresses/');
export const createAddress  = (data)           => api.post('/addresses/', data);
export const updateAddress  = (id, data)       => api.patch(`/addresses/${id}/`, data);
export const deleteAddress  = (id)             => api.delete(`/addresses/${id}/`);

// ── Orders ────────────────────────────────────────────────
export const getOrders      = (params)         => api.get('/orders/', { params });
export const getOrder       = (id)             => api.get(`/orders/${id}/`);
export const createOrder    = (data)           => api.post('/orders/', data);
export const cancelOrder    = (id)             => api.post(`/orders/${id}/cancel/`);

// ── Payments ──────────────────────────────────────────────
export const mpesaSTKPush       = (data)       => api.post('/payments/mpesa/stk-push/', data);
export const getMpesaStatus     = (orderId)    => api.get(`/payments/mpesa/status/${orderId}/`);
export const paypalCreateOrder  = (data)       => api.post('/payments/paypal/create/', data);
export const paypalCapture      = (data)       => api.post('/payments/paypal/capture/', data);

// ── Utilities ─────────────────────────────────────────────
export const validateCoupon     = (code, amount) => api.post('/coupons/validate/', { code, amount });
export const getRecentlyViewed  = ()             => api.get('/recently-viewed/');
export const getExchangeRates   = ()             => api.get('/exchange-rates/');

// ── Geography ─────────────────────────────────────────────
export const getCountries       = ()           => api.get('/countries/');
export const getCounties        = ()           => api.get('/counties/');
export const getPickupStations  = (params)     => api.get('/pickup-stations/', { params });