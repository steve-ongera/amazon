import { Suspense, lazy } from 'react';
import './global_style.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { Spinner } from './components/common/index.jsx';
import Layout from './components/layout/Layout';

// ── Lazy pages ────────────────────────────────────────────
const HomePage        = lazy(() => import('./pages/HomePage'));
const StorePage       = lazy(() => import('./pages/StorePage'));
const ProductPage     = lazy(() => import('./pages/ProductPage'));
const CartPage        = lazy(() => import('./pages/CartPage'));
const CheckoutPage    = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage      = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const WishlistPage    = lazy(() => import('./pages/WishlistPage'));
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const RegisterPage    = lazy(() => import('./pages/RegisterPage'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage    = lazy(() => import('./pages/NotFoundPage'));

// ── Auth guard ────────────────────────────────────────────
import { useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
          <Suspense fallback={<div className="page-wrapper"><Spinner /></div>}>
            <Routes>
              {/* Public routes (with Layout) */}
              <Route element={<Layout />}>
                <Route path="/"               element={<HomePage />} />
                <Route path="/store"          element={<StorePage />} />
                <Route path="/product/:slug"  element={<ProductPage />} />
                <Route path="/cart"           element={<CartPage />} />
                <Route path="/login"          element={<LoginPage />} />
                <Route path="/register"       element={<RegisterPage />} />

                {/* Protected routes */}
                <Route path="/checkout"       element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
                <Route path="/orders"         element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
                <Route path="/orders/:id"     element={<PrivateRoute><OrderDetailPage /></PrivateRoute>} />
                <Route path="/wishlist"       element={<PrivateRoute><WishlistPage /></PrivateRoute>} />
                <Route path="/profile"        element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

                {/* Fallback */}
                <Route path="*"              element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}