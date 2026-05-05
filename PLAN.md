# Cart Feature — Implementation Plan

This plan assumes the spec in `SPEC.md` is authoritative. Steps are ordered so each builds on the last — complete them in sequence. All backend steps precede frontend steps; tests follow implementation.

---

## Step 1 — Backend: Add `UpdateCartRequest` Model

**File**: `src/backend/MockEcommerce.Api/Models/UpdateCartRequest.cs` (new file)

Create a record or class to represent the PUT request body:

```csharp
namespace MockEcommerce.Api.Models;

/// <summary>Request body for updating a cart item's quantity.</summary>
public class UpdateCartRequest
{
    /// <summary>The new absolute quantity to set (1–5 inclusive).</summary>
    public int Quantity { get; set; }
}
```

No other model changes are needed. `CartSummary` (GET response) is a value computed in the endpoint handler, not a stored model — create it as a record in the same `Models` folder:

**File**: `src/backend/MockEcommerce.Api/Models/CartSummary.cs` (new file)

```csharp
namespace MockEcommerce.Api.Models;

/// <summary>Summary response returned by GET /api/cart.</summary>
public class CartSummary
{
    public IEnumerable<CartItem> Items { get; set; } = [];
    public int TotalItems { get; set; }
    public decimal Subtotal { get; set; }
}
```

---

## Step 2 — Backend: Extend `ICartService`

**File**: `src/backend/MockEcommerce.Api/Services/ICartService.cs`

Add the following method signature:

```csharp
/// <summary>
/// Sets the quantity of an existing cart item to the specified value.
/// </summary>
/// <param name="productId">The product whose cart entry to update.</param>
/// <param name="quantity">The new quantity (caller must validate range).</param>
/// <returns>The updated <see cref="CartItem"/>, or <c>null</c> if not found.</returns>
CartItem? UpdateQuantity(int productId, int quantity);
```

---

## Step 3 — Backend: Implement `InMemoryCartService`

**File**: `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs`

Implement all six methods. All mutations acquire `_lock` before modifying `_cart`.

| Method | Implementation notes |
|---|---|
| `GetAll()` | `lock (_lock)` — return `_cart.ToList()` (copy to avoid external mutation) |
| `GetByProductId(int)` | `lock (_lock)` — `_cart.FirstOrDefault(x => x.ProductId == productId)` |
| `Add(CartItem)` | `lock (_lock)` — find existing by `ProductId`; if found, increment `Quantity` and return; otherwise add new item and return it |
| `Remove(int)` | `lock (_lock)` — find and remove; return `true` if removed, `false` if not found |
| `Clear()` | `lock (_lock)` — `_cart.Clear()` |
| `UpdateQuantity(int, int)` | `lock (_lock)` — find by `ProductId`; if found, set `Quantity = quantity` and return the item; if not found, return `null` |

---

## Step 4 — Backend: Implement All `CartEndpoints` Handlers

**File**: `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs`

### 4a — Register PUT route in `MapCartEndpoints`

Add inside the `group` registration block:

```csharp
group.MapPut("/{productId:int}", UpdateCartItem)
    .WithName("UpdateCartItem")
    .WithSummary("Sets the quantity of an existing cart item.");
```

### 4b — Implement `GetCart`

```csharp
internal static Ok<CartSummary> GetCart(ICartService cartService)
{
    var items = cartService.GetAll().ToList();
    var summary = new CartSummary
    {
        Items = items,
        TotalItems = items.Sum(i => i.Quantity),
        Subtotal = items.Sum(i => i.TotalPrice)
    };
    return TypedResults.Ok(summary);
}
```

Return type changes from `Ok<IEnumerable<CartItem>>` to `Ok<CartSummary>`.

### 4c — Implement `AddToCart`

Validation order: (1) validate `request.Quantity` range, (2) look up product in catalog, (3) check max-qty constraint.

```
if quantity < 1 → ValidationProblem(errors: { quantity: ["Quantity must be at least 1"] })
if quantity > 5 → ValidationProblem(errors: { quantity: ["Quantity must be between 1 and 5"] })
product = productService.GetById(request.ProductId)
if product is null → NotFound("Product {id} not found")
existing = cartService.GetByProductId(request.ProductId)
if existing != null && existing.Quantity + request.Quantity > 5
    → ValidationProblem(errors: { quantity: ["Maximum quantity of 5 per item exceeded"] })
item = cartService.Add(new CartItem { ProductId, ProductName, UnitPrice, Quantity })
if was new item → Created($"/api/cart", item)
else → Ok(item)
```

To distinguish "new vs updated": capture `existing` before calling `Add`; if `existing` was null, return 201; otherwise 200.

### 4d — Implement `UpdateCartItem` (new handler)

Signature:
```csharp
internal static Results<Ok<CartItem>, NotFound<string>, ValidationProblem> UpdateCartItem(
    int productId,
    UpdateCartRequest request,
    IProductService productService,
    ICartService cartService)
```

Validation order: (1) validate `request.Quantity` range, (2) look up product in catalog, (3) look up item in cart.

```
if quantity < 1 → ValidationProblem(errors: { quantity: ["Quantity must be at least 1"] })
if quantity > 5 → ValidationProblem(errors: { quantity: ["Quantity must be between 1 and 5"] })
product = productService.GetById(productId)
if product is null → NotFound("Product {productId} not found")
updated = cartService.UpdateQuantity(productId, request.Quantity)
if updated is null → NotFound("Cart item for product {productId} not found")
return Ok(updated)
```

### 4e — Implement `RemoveFromCart`

```csharp
internal static Results<NoContent, NotFound> RemoveFromCart(int productId, ICartService cartService)
{
    var removed = cartService.Remove(productId);
    return removed ? TypedResults.NoContent() : TypedResults.NotFound();
}
```

### 4f — Implement `ClearCart`

```csharp
internal static NoContent ClearCart(ICartService cartService)
{
    cartService.Clear();
    return TypedResults.NoContent();
}
```

---

## Step 5 — Frontend: Update Types

**File**: `src/frontend/src/types/index.ts`

Export `CartItem`, `CartSummary`, and `UpdateCartRequest` (move the local `CartItem` definition from `api/index.ts` here and add the new types):

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

Remove the local `interface CartItem` declaration from `src/frontend/src/api/index.ts` and import it from `../types`.

---

## Step 6 — Frontend: Add Cart API Functions

**File**: `src/frontend/src/api/index.ts`

Add three new exported functions (import new types from `../types`):

```typescript
export async function fetchCart(): Promise<CartSummary> { ... }
// GET /api/cart — always 200

export async function updateCartItem(
  productId: number,
  request: UpdateCartRequest
): Promise<CartItem> { ... }
// PUT /api/cart/{productId} — 200 on success

export async function removeFromCart(productId: number): Promise<void> { ... }
// DELETE /api/cart/{productId} — 204 on success

export async function clearCart(): Promise<void> { ... }
// DELETE /api/cart — 204 on success
```

For error responses, throw an `Error` with the response status text (consistent with existing pattern).

---

## Step 7 — Frontend: Create `useCart` Hook

**File**: `src/frontend/src/hooks/useCart.ts` (new file)

```typescript
export function useCart() {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCart() { ... }        // fetchCart(), update state
  async function addItem(productId, qty) { ... }   // addToCart(), then loadCart()
  async function updateItem(productId, qty) { ... } // updateCartItem(), then loadCart()
  async function removeItem(productId) { ... }      // removeFromCart(), then loadCart()
  async function emptyCart() { ... }       // clearCart(), then loadCart()

  useEffect(() => { loadCart(); }, []);    // fetch on mount

  return { cart, loading, error, addItem, updateItem, removeItem, emptyCart, loadCart };
}
```

Each mutating function re-fetches the full cart after the mutation to keep state consistent with the server.

---

## Step 8 — Frontend: Create `CartPanel` Component

**File**: `src/frontend/src/components/CartPanel/CartPanel.tsx` (new file)
**File**: `src/frontend/src/components/CartPanel/index.ts` (new file, re-exports)

Props:

```typescript
interface CartPanelProps {
  cart: CartSummary | null;
  loading: boolean;
  error: string | null;
  onUpdateItem: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onClose: () => void;
}
```

Render structure (BEM class names):

```
.cart-panel                          // full overlay/sidebar wrapper
  .cart-panel__header
    "Your Cart" heading + close button (.cart-panel__close)
  .cart-panel__body
    [if loading] .cart-panel__loading  "Loading…"
    [if error]   .cart-panel__error
    [if empty]   .cart-panel__empty    "Your cart is empty."
    [if items]
      .cart-panel__list
        .cart-panel__item (× n)
          .cart-panel__item-name
          .cart-panel__item-price     (unit price)
          .cart-panel__item-controls
            button.cart-panel__qty-btn  "−"   (disabled when qty === 1? No — triggers remove)
            span.cart-panel__qty        qty
            button.cart-panel__qty-btn  "+"   (disabled when qty === 5)
          .cart-panel__item-total     (line total)
          button.cart-panel__remove   "Remove"
      .cart-panel__footer
        .cart-panel__subtotal         "Subtotal: ${subtotal}"
        button.cart-panel__clear      "Clear cart"
        button.cart-panel__checkout   "Proceed to checkout" (disabled, title="Coming soon")
```

The `−` button: if `quantity === 1`, calls `onRemoveItem`; otherwise calls `onUpdateItem(id, qty - 1)`.
The `+` button: calls `onUpdateItem(id, qty + 1)`; disabled when `qty === 5`.

Add styles to a new file `src/frontend/src/components/CartPanel/CartPanel.css`, using CSS custom properties from `index.css`.

---

## Step 9 — Frontend: Wire Up in `App.tsx`

**File**: `src/frontend/src/App.tsx`

Changes:
1. Replace `cartItemCount` local state and manual `setCartItemCount` with the `useCart` hook.
2. Add `isCartOpen` state (boolean, default `false`).
3. Pass `isCartOpen` toggle to `<Header>` via a new `onCartClick` prop (or via an `onClick` callback).
4. Update `<Header>` to accept `onCartClick: () => void` prop and wire the cart button to it.
5. Render `<CartPanel>` conditionally: `{isCartOpen && <CartPanel ... />}`.
6. Pass `cart.totalItems ?? 0` as `cartItemCount` to `<Header>`.
7. Update `handleAddToCart` to call `useCart.addItem` instead of the standalone `addToCart`.

---

## Step 10 — Backend Unit Tests: `InMemoryCartService`

**File**: `test/backend/MockEcommerce.Api.Tests/Services/InMemoryCartServiceTests.cs` (new file)

Test cases (xUnit, direct instantiation of `InMemoryCartService`):

| Test | Expectation |
|---|---|
| `GetAll_EmptyCart_ReturnsEmptyCollection` | Returns empty |
| `Add_NewItem_ReturnsAddedItem` | Returns item with correct fields |
| `Add_ExistingItem_IncrementsQuantity` | Quantity is sum of original + added |
| `GetByProductId_ExistingItem_ReturnsItem` | Returns correct item |
| `GetByProductId_MissingItem_ReturnsNull` | Returns null |
| `Remove_ExistingItem_ReturnsTrueAndItemGone` | Returns true; GetAll no longer contains item |
| `Remove_MissingItem_ReturnsFalse` | Returns false |
| `Clear_RemovesAllItems` | GetAll returns empty after Clear |
| `UpdateQuantity_ExistingItem_SetsQuantityExactly` | Quantity equals new value, not incremented |
| `UpdateQuantity_MissingItem_ReturnsNull` | Returns null |
| `GetAll_ReturnsSnapshot_NotLiveReference` | Modifying returned list does not mutate internal state |

---

## Step 11 — Backend Integration Tests: Cart Endpoints

**File**: `test/backend/MockEcommerce.Api.Tests/Endpoints/CartEndpointTests.cs` (new file)

Use `WebApplicationFactory<Program>` (already used in `ProductEndpointTests.cs`). Because `InMemoryCartService` is a singleton, each test that needs an empty cart should either clear it via `DELETE /api/cart` at the start, or use a fresh factory instance.

Test cases:

| Endpoint | Test | Expected |
|---|---|---|
| GET /api/cart | Empty cart | `200` — `{ items: [], totalItems: 0, subtotal: 0 }` |
| GET /api/cart | After adding item | `200` — correct `totalItems` and `subtotal` |
| POST /api/cart | New item | `201` — correct CartItem fields |
| POST /api/cart | Existing item (increments) | `200` — updated quantity |
| POST /api/cart | `quantity = 0` | `400` — ValidationProblem |
| POST /api/cart | `quantity = 6` | `400` — ValidationProblem |
| POST /api/cart | Unknown `productId` | `404` |
| POST /api/cart | Exceeds max qty | `400` — ValidationProblem |
| PUT /api/cart/{id} | Valid update | `200` — quantity equals request |
| PUT /api/cart/{id} | `quantity = 0` | `400` — ValidationProblem |
| PUT /api/cart/{id} | `quantity = 6` | `400` — ValidationProblem |
| PUT /api/cart/{id} | Product not in catalog | `404` — "Product … not found" |
| PUT /api/cart/{id} | Product in catalog but not in cart | `404` — "Cart item for product … not found" |
| DELETE /api/cart/{id} | Existing item | `204` |
| DELETE /api/cart/{id} | Missing item | `404` |
| DELETE /api/cart | Non-empty cart | `204` — subsequent GET returns empty |

---

## Step 12 — Frontend Unit Tests: `useCart` Hook

**File**: `test/frontend/hooks/useCart.test.ts` (new file)

Use Vitest + React Testing Library `renderHook`. Mock `src/frontend/src/api/index.ts` module.

Test cases:

| Test | Expectation |
|---|---|
| Fetches cart on mount | `loadCart` called once; `cart` state set |
| `addItem` calls API then reloads cart | `addToCart` and `fetchCart` both called |
| `updateItem` calls PUT API then reloads | `updateCartItem` and `fetchCart` called |
| `removeItem` calls DELETE API then reloads | `removeFromCart` and `fetchCart` called |
| `emptyCart` calls clear API then reloads | `clearCart` and `fetchCart` called |
| Error from API sets `error` state | `error` is non-null on fetch failure |

---

## Step 13 — Frontend Unit Tests: `CartPanel` Component

**File**: `test/frontend/components/CartPanel/CartPanel.test.tsx` (new file)

Use Vitest + React Testing Library. Render `<CartPanel>` with controlled props.

Test cases:

| Test | Expectation |
|---|---|
| Renders "Your cart is empty." when `cart.items` is empty | Text present |
| Renders item name, unit price, quantity, and line total | Correct values displayed |
| `+` button disabled when quantity is 5 | Button has `disabled` attribute |
| `−` button at quantity 1 calls `onRemoveItem` | `onRemoveItem` called with correct `productId` |
| `−` button at quantity > 1 calls `onUpdateItem` with `qty - 1` | Called with `productId, qty - 1` |
| `+` button calls `onUpdateItem` with `qty + 1` | Called with `productId, qty + 1` |
| "Remove" button calls `onRemoveItem` | Called with correct `productId` |
| "Clear cart" button calls `onClearCart` | Called once |
| "Proceed to checkout" button is disabled | Button has `disabled` attribute |
| Close button calls `onClose` | Called once |
| Shows subtotal value | Correct formatted amount displayed |
| Shows loading state | Loading text visible when `loading = true` |

---

## Sequence Summary

```
Step 1  — Model: UpdateCartRequest, CartSummary
Step 2  — Interface: ICartService.UpdateQuantity
Step 3  — Service: InMemoryCartService (all methods)
Step 4  — Endpoints: implement GET, POST, PUT, DELETE handlers + register PUT route
Step 5  — Frontend types: CartItem, CartSummary, UpdateCartRequest
Step 6  — Frontend API: fetchCart, updateCartItem, removeFromCart, clearCart
Step 7  — Frontend hook: useCart
Step 8  — Frontend component: CartPanel
Step 9  — App.tsx: wire useCart + CartPanel + Header onCartClick
Step 10 — Tests: InMemoryCartService unit tests
Step 11 — Tests: Cart endpoint integration tests
Step 12 — Tests: useCart hook unit tests
Step 13 — Tests: CartPanel component tests
```
