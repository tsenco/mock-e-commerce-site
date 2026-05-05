import type { CartSummary } from '../../types';
import './CartPanel.css';

interface CartPanelProps {
  cart: CartSummary | null;
  loading: boolean;
  error: string | null;
  onUpdateItem: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onClose: () => void;
}

export function CartPanel({
  cart,
  loading,
  error,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  onClose,
}: CartPanelProps) {
  const items = cart?.items ?? [];

  return (
    <div className="cart-panel">
      <div className="cart-panel__header">
        <h2>Your Cart</h2>
        <button className="cart-panel__close" onClick={onClose} aria-label="Close cart">
          ×
        </button>
      </div>

      <div className="cart-panel__body">
        {loading && <p className="cart-panel__loading">Loading…</p>}
        {error && <p className="cart-panel__error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="cart-panel__empty">Your cart is empty.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <ul className="cart-panel__list">
              {items.map((item) => (
                <li key={item.productId} className="cart-panel__item">
                  <span className="cart-panel__item-name">{item.productName}</span>
                  <span className="cart-panel__item-price">${item.unitPrice.toFixed(2)}</span>
                  <div className="cart-panel__item-controls">
                    <button
                      className="cart-panel__qty-btn"
                      onClick={() =>
                        item.quantity === 1
                          ? onRemoveItem(item.productId)
                          : onUpdateItem(item.productId, item.quantity - 1)
                      }
                      aria-label={`Decrease quantity of ${item.productName}`}
                    >
                      −
                    </button>
                    <span className="cart-panel__qty">{item.quantity}</span>
                    <button
                      className="cart-panel__qty-btn"
                      onClick={() => onUpdateItem(item.productId, item.quantity + 1)}
                      disabled={item.quantity === 5}
                      aria-label={`Increase quantity of ${item.productName}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="cart-panel__item-total">${item.totalPrice.toFixed(2)}</span>
                  <button
                    className="cart-panel__remove"
                    onClick={() => onRemoveItem(item.productId)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="cart-panel__footer">
              <p className="cart-panel__subtotal">Subtotal: ${cart!.subtotal.toFixed(2)}</p>
              <button className="cart-panel__clear" onClick={onClearCart}>
                Clear cart
              </button>
              <button
                className="cart-panel__checkout"
                disabled
                title="Coming soon"
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
