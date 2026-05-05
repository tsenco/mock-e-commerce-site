import type { Product, AddToCartRequest, CartItem, CartSummary, UpdateCartRequest } from '../types';

const BASE_URL = '/api';

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function fetchProductById(id: number): Promise<Product> {
  const response = await fetch(`${BASE_URL}/products/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch product ${id}`);
  return response.json();
}

export async function addToCart(request: AddToCartRequest): Promise<CartItem> {
  const response = await fetch(`${BASE_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to add item to cart');
  return response.json();
}

export async function fetchCart(): Promise<CartSummary> {
  const response = await fetch(`${BASE_URL}/cart`);
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
}

export async function updateCartItem(
  productId: number,
  request: UpdateCartRequest
): Promise<CartItem> {
  const response = await fetch(`${BASE_URL}/cart/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
}

export async function removeFromCart(productId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/cart/${productId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(response.statusText);
}

export async function clearCart(): Promise<void> {
  const response = await fetch(`${BASE_URL}/cart`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(response.statusText);
}

