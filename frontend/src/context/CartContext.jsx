// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await getCart();
      setCart(data);
    } catch { /* silent fail */ }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = async (product_id, variant_id = null, quantity = 1) => {
    setLoading(true);
    try {
      const payload = { product_id, quantity };
      if (variant_id) payload.variant_id = variant_id;
      const { data } = await addToCart(payload);
      setCart(data);
      showToast('Added to cart!', 'success');
      return true;
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to add to cart', 'error');
      return false;
    } finally { setLoading(false); }
  };

  const updateItem = async (item_id, quantity) => {
    try {
      const { data } = await updateCartItem(item_id, quantity);
      setCart(data);
    } catch { showToast('Update failed', 'error'); }
  };

  const removeItem = async (item_id) => {
    try {
      const { data } = await removeFromCart(item_id);
      setCart(data);
      showToast('Removed from cart', 'info');
    } catch { showToast('Remove failed', 'error'); }
  };

  const emptyCart = async () => {
    try {
      const { data } = await clearCart();
      setCart(data);
    } catch { /* silent */ }
  };

  const itemCount = cart?.item_count ?? 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, fetchCart, addItem, updateItem, removeItem, emptyCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);