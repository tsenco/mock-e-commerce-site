# Cart Feature — Specification

## Overview

Users can view their shopping cart, see line-item and total pricing, manage quantities, and remove items before checkout. The cart is accessible from the existing cart icon in the `Header`. All quantity enforcement is applied at the API level. A new `PUT /api/cart/{productId}` endpoint lets callers set a cart item's quantity to an exact value.

---

## Data Models

### CartItem (existing, backend)

| Field | Type | Notes |
|---|---|---|
| `productId` | `int` | PK for cart lookup |
| `productName` | `string` | Snapshot at time of add |
| `unitPrice` | `decimal` | Snapshot at time of add |
| `quantity` | `int` | 1–5 inclusive |
| `totalPrice` | `decimal` | Computed: `unitPrice × quantity` |

### CartSummary — GET /api/cart response

```json
{
  "items": [ /* CartItem[] */ ],
  "totalItems": 3,
  "subtotal": 164.97
}
```

- `totalItems`: sum of all `quantity` values across all cart items.
- `subtotal`: sum of all `totalPrice` values across all cart items.
- Empty cart returns `200 OK` with `{ "items": [], "totalItems": 0, "subtotal": 0.00 }`.

### AddToCartRequest (existing)

```json
{ "productId": 1, "quantity": 1 }
```

### UpdateCartRequest (new)

```json
{ "quantity": 3 }
```

---

## API Endpoints

### GET /api/cart

Returns the current cart state.

- **Response `200 OK`**: `CartSummary` (always succeeds, even if cart is empty).

---

### POST /api/cart

Adds a product to the cart. If the product is already in the cart, increments the stored quantity by the requested amount.

**Request body**: `AddToCartRequest` — `{ productId: int, quantity: int }`

**Success responses**:

| Condition | Status | Body |
|---|---|---|
| Product not yet in cart | `201 Created` | The new `CartItem` |
| Product already in cart, quantity updated | `200 OK` | The updated `CartItem` |

**Error responses**:

| Condition | Status | Detail |
|---|---|---|
| `quantity < 1` | `400 Bad Request` | `ValidationProblem`: `errors.quantity = ["Quantity must be at least 1"]` |
| `quantity > 5` | `400 Bad Request` | `ValidationProblem`: `errors.quantity = ["Quantity must be between 1 and 5"]` |
| Product ID not found in catalog | `404 Not Found` | `"Product {productId} not found"` |
| `existingQuantity + requestedQuantity > 5` | `400 Bad Request` | `ValidationProblem`: `errors.quantity = ["Maximum quantity of 5 per item exceeded"]` |

**Max-quantity rule for POST**: The check is `existingQuantity + requestedQuantity > 5`. For example, if 3 units are already in the cart and the user requests 3 more, the request is rejected (3 + 3 = 6 > 5).

---

### PUT /api/cart/{productId}

Sets the quantity of an existing cart item to **exactly** the provided value. This is a replacement, not an increment.

**Route parameter**: `productId` — `int`

**Request body**: `UpdateCartRequest` — `{ quantity: int }`

**Success response**:

| Condition | Status | Body |
|---|---|---|
| Item found and quantity is valid | `200 OK` | The updated `CartItem` |

**Error responses**:

| Condition | Status | Detail |
|---|---|---|
| `quantity < 1` | `400 Bad Request` | `ValidationProblem`: `errors.quantity = ["Quantity must be at least 1"]` — use `DELETE` to remove items |
| `quantity > 5` | `400 Bad Request` | `ValidationProblem`: `errors.quantity = ["Quantity must be between 1 and 5"]` |
| `productId` not found in product catalog | `404 Not Found` | `"Product {productId} not found"` |
| `productId` not currently in cart | `404 Not Found` | `"Cart item for product {productId} not found"` |

**PUT semantics**: PUT is an absolute set operation. `PUT /api/cart/1` with `{ "quantity": 5 }` always results in quantity = 5, regardless of the previous value. It does not add to the existing quantity.

---

### DELETE /api/cart/{productId}

Removes a single item from the cart.

| Condition | Status | Body |
|---|---|---|
| Item found and removed | `204 No Content` | — |
| Item not in cart | `404 Not Found` | — |

---

### DELETE /api/cart

Clears all items from the cart. Always returns `204 No Content`.

---

## Validation Rules Summary

| Rule | Applies to | Enforcement level |
|---|---|---|
| `quantity` ≥ 1 | POST, PUT | Endpoint handler (ValidationProblem) |
| `quantity` ≤ 5 | POST, PUT | Endpoint handler (ValidationProblem) |
| `existingQty + requestedQty` ≤ 5 | POST only | Endpoint handler (ValidationProblem) |
| Product must exist in catalog | POST, PUT | Endpoint handler (NotFound) |
| Item must exist in cart | PUT | Endpoint handler (NotFound) |

Validation is performed in the endpoint handler (not the service layer). The service layer is responsible only for in-memory storage operations; it does not enforce business rules.

---

## Service Layer Changes

`ICartService` needs one new method:

```csharp
/// <summary>Sets the quantity of an existing cart item to the specified value.</summary>
/// <returns>The updated item, or null if not found.</returns>
CartItem? UpdateQuantity(int productId, int quantity);
```

All existing methods in `InMemoryCartService` must be implemented (currently throw `NotImplementedException`):

- `GetAll()` — returns snapshot of all cart items.
- `GetByProductId(int)` — returns matching item or `null`.
- `Add(CartItem)` — adds new item or increments quantity of existing item.
- `Remove(int)` — removes item by productId, returns `false` if not found.
- `Clear()` — empties the cart.
- `UpdateQuantity(int, int)` — sets quantity, returns updated item or `null` if not found.

All mutations use the existing `Lock _lock` for thread safety.

---

## Frontend

### Cart Panel

A slide-in or overlay panel rendered inside `App.tsx`. Toggled open/closed by clicking the header cart icon. No client-side routing is used; the panel is a conditionally rendered component.

**When open, the panel displays:**
- A header: "Your Cart" with a close button (×).
- If cart is empty: message "Your cart is empty."
- If cart has items:
  - A scrollable list of `CartItem` rows, each showing:
    - Product name
    - Unit price
    - Quantity controls: `−` button | current quantity | `+` button
    - Line total (`unitPrice × quantity`)
    - "Remove" button
  - Cart subtotal (sum of all line totals)
  - "Clear cart" button — removes all items
  - "Proceed to checkout" button — always **disabled**, labeled "Coming soon"

### Quantity Controls (in Cart Panel)

| User action | Behavior |
|---|---|
| Click `+` | Calls `PUT /api/cart/{productId}` with `quantity + 1`. Disabled when `quantity === 5`. |
| Click `−` | If `quantity > 1`: calls `PUT /api/cart/{productId}` with `quantity - 1`. If `quantity === 1`: calls `DELETE /api/cart/{productId}` (removes item). |
| Click "Remove" | Calls `DELETE /api/cart/{productId}`. |
| Click "Clear cart" | Calls `DELETE /api/cart`. |

### Cart Item Count Badge

- The `Header` cart icon badge shows the total number of **distinct items** in the cart (i.e., `items.length`, not sum of quantities).
- Alternatively, if the design preference is total units, the badge shows `totalItems` from the `CartSummary`. **Decision**: use `totalItems` (sum of quantities) to reflect units, consistent with how physical carts display counts.

### State Management

- Cart state (`CartItem[]`, loading, error) is managed in `App.tsx` via `useState`.
- A `useCart` custom hook encapsulates all cart API calls and state:
  - `cart`: `CartSummary | null`
  - `loadCart()`: fetches `GET /api/cart`
  - `addItem(productId, quantity)`: calls `POST /api/cart`
  - `updateItem(productId, quantity)`: calls `PUT /api/cart/{productId}`
  - `removeItem(productId)`: calls `DELETE /api/cart/{productId}`
  - `clearCart()`: calls `DELETE /api/cart`
  - `loading`: `boolean`
  - `error`: `string | null`
- On app mount, `useCart` fetches the current cart to initialize the badge count.

### New Frontend Types

```typescript
export interface CartItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}

export interface UpdateCartRequest {
  quantity: number;
}
```

### New API Functions

```typescript
fetchCart(): Promise<CartSummary>
updateCartItem(productId: number, request: UpdateCartRequest): Promise<CartItem>
removeFromCart(productId: number): Promise<void>
clearCart(): Promise<void>
```

---

## Edge Cases

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | Add a product that does not exist in the catalog | `404 Not Found` — `"Product {id} not found"` |
| 2 | POST with `quantity = 0` | `400 Bad Request` — `ValidationProblem` on `quantity` |
| 3 | POST with `quantity = 6` (exceeds max directly) | `400 Bad Request` — `ValidationProblem` on `quantity` |
| 4 | POST where `existingQty (3) + requestedQty (3) = 6` | `400 Bad Request` — `"Maximum quantity of 5 per item exceeded"` |
| 5 | PUT on a valid product not yet in the cart | `404 Not Found` — `"Cart item for product {id} not found"` |
| 6 | PUT on a product ID not in the catalog | `404 Not Found` — `"Product {id} not found"` (catalog check precedes cart check) |
| 7 | PUT with `quantity = 0` | `400 Bad Request` — `ValidationProblem` — direct to use DELETE |
| 8 | PUT with `quantity = 6` | `400 Bad Request` — `ValidationProblem` |
| 9 | GET when cart is empty | `200 OK` — `{ items: [], totalItems: 0, subtotal: 0.00 }` |
| 10 | DELETE on a product not in the cart | `404 Not Found` |
| 11 | `+` button pressed when quantity is already 5 | Button is disabled; no API call made |
| 12 | `−` button pressed when quantity is 1 | Item is removed via `DELETE /api/cart/{productId}` |
| 13 | Clear cart when cart is empty | `204 No Content` (idempotent) |
| 14 | Cart panel opened when cart has not yet been fetched | Shows loading indicator while fetching |
