// src/hooks/useWishlist.js
import { useState, useEffect } from 'react';
import { getWishlist, addToWishlist, removeFromWishlist } from '../api';
import { useAuth } from '../context/AuthContext';

// Simple module-level cache
let wishlistCache = [];
let listeners = [];

function notify() { listeners.forEach(fn => fn([...wishlistCache])); }

export function useWishlist(productId) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([...wishlistCache]);

  useEffect(() => {
    const handler = (w) => setWishlist(w);
    listeners.push(handler);

    if (user && wishlistCache.length === 0) {
      getWishlist().then(({ data }) => {
        wishlistCache = data;
        notify();
      }).catch(() => {});
    }

    return () => { listeners = listeners.filter(fn => fn !== handler); };
  }, [user]);

  const item = wishlist.find(w => w.product?.id === productId || w.product?.slug === productId);
  const isWishlisted = Boolean(item);

  const toggle = async (pid) => {
    if (!user) { window.location.href = '/login'; return; }
    if (isWishlisted && item) {
      await removeFromWishlist(item.id);
      wishlistCache = wishlistCache.filter(w => w.id !== item.id);
    } else {
      const { data } = await addToWishlist(pid);
      wishlistCache = [...wishlistCache, data];
    }
    notify();
  };

  return { wishlist, isWishlisted, toggle };
}