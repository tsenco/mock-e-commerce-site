import { useState, useEffect } from 'react';
import type { CartSummary } from '../types';
import { fetchCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api';

interface UseCartResult {
  cart: CartSummary | null;
  loading: boolean;
  error: string | null;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  emptyCart: () => Promise<void>;
  loadCart: () => Promise<void>;
}

export function useCart(): UseCartResult {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCart() {
    setLoading(true);
    setError(null);
    fetchCart()
      .then((data) => setCart(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      })
      .finally(() => setLoading(false));
  }

  async function addItem(productId: number, quantity: number) {
    await addToCart({ productId, quantity });
    await loadCart();
  }

  async function updateItem(productId: number, quantity: number) {
    await updateCartItem(productId, { quantity });
    await loadCart();
  }

  async function removeItem(productId: number) {
    await removeFromCart(productId);
    await loadCart();
  }

  async function emptyCart() {
    await clearCart();
    await loadCart();
  }

  useEffect(() => {
    loadCart();
  }, []);

  return { cart, loading, error, addItem, updateItem, removeItem, emptyCart, loadCart };
}
