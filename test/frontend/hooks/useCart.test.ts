import { renderHook, waitFor, act } from '@testing-library/react';
import { useCart } from '../../../src/frontend/src/hooks/useCart';
import type { CartSummary, CartItem } from '../../../src/frontend/src/types';

vi.mock('../../../src/frontend/src/api', () => ({
  fetchCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
}));

import {
  fetchCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../../../src/frontend/src/api';

const mockedFetchCart = vi.mocked(fetchCart);
const mockedAddToCart = vi.mocked(addToCart);
const mockedUpdateCartItem = vi.mocked(updateCartItem);
const mockedRemoveFromCart = vi.mocked(removeFromCart);
const mockedClearCart = vi.mocked(clearCart);

const emptyCartSummary: CartSummary = { items: [], totalItems: 0, subtotal: 0 };

const mockCartItem: CartItem = {
  productId: 1,
  productName: 'Wireless Headphones',
  unitPrice: 79.99,
  quantity: 1,
  totalPrice: 79.99,
};

const cartWithItem: CartSummary = {
  items: [mockCartItem],
  totalItems: 1,
  subtotal: 79.99,
};

describe('useCart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches cart on mount', async () => {
    mockedFetchCart.mockResolvedValue(emptyCartSummary);

    const { result } = renderHook(() => useCart());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedFetchCart).toHaveBeenCalledTimes(1);
    expect(result.current.cart).toEqual(emptyCartSummary);
  });

  it('addItem calls addToCart then reloads cart', async () => {
    mockedFetchCart.mockResolvedValue(cartWithItem);
    mockedAddToCart.mockResolvedValue(mockCartItem);

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addItem(1, 1);
    });

    expect(mockedAddToCart).toHaveBeenCalledWith({ productId: 1, quantity: 1 });
    expect(mockedFetchCart).toHaveBeenCalledTimes(2);
  });

  it('updateItem calls updateCartItem then reloads cart', async () => {
    mockedFetchCart.mockResolvedValue(cartWithItem);
    mockedUpdateCartItem.mockResolvedValue({ ...mockCartItem, quantity: 3, totalPrice: 239.97 });

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateItem(1, 3);
    });

    expect(mockedUpdateCartItem).toHaveBeenCalledWith(1, { quantity: 3 });
    expect(mockedFetchCart).toHaveBeenCalledTimes(2);
  });

  it('removeItem calls removeFromCart then reloads cart', async () => {
    mockedFetchCart.mockResolvedValue(emptyCartSummary);
    mockedRemoveFromCart.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeItem(1);
    });

    expect(mockedRemoveFromCart).toHaveBeenCalledWith(1);
    expect(mockedFetchCart).toHaveBeenCalledTimes(2);
  });

  it('emptyCart calls clearCart then reloads cart', async () => {
    mockedFetchCart.mockResolvedValue(emptyCartSummary);
    mockedClearCart.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.emptyCart();
    });

    expect(mockedClearCart).toHaveBeenCalledTimes(1);
    expect(mockedFetchCart).toHaveBeenCalledTimes(2);
  });

  it('sets error state when fetchCart fails', async () => {
    mockedFetchCart.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useCart());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.cart).toBeNull();
  });
});
