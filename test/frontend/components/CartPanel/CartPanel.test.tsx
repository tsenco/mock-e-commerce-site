import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartPanel } from '../../../../src/frontend/src/components/CartPanel/CartPanel';
import type { CartSummary } from '../../../../src/frontend/src/types';

const mockOnUpdateItem = vi.fn();
const mockOnRemoveItem = vi.fn();
const mockOnClearCart = vi.fn();
const mockOnClose = vi.fn();

const emptyCart: CartSummary = { items: [], totalItems: 0, subtotal: 0 };

const cartWithItems: CartSummary = {
  items: [
    {
      productId: 1,
      productName: 'Wireless Headphones',
      unitPrice: 79.99,
      quantity: 2,
      totalPrice: 159.98,
    },
    {
      productId: 2,
      productName: 'Running Shoes',
      unitPrice: 59.99,
      quantity: 5,
      totalPrice: 299.95,
    },
  ],
  totalItems: 7,
  subtotal: 459.93,
};

function renderCartPanel(overrides: Partial<Parameters<typeof CartPanel>[0]> = {}) {
  const props = {
    cart: cartWithItems,
    loading: false,
    error: null,
    onUpdateItem: mockOnUpdateItem,
    onRemoveItem: mockOnRemoveItem,
    onClearCart: mockOnClearCart,
    onClose: mockOnClose,
    ...overrides,
  };
  return render(<CartPanel {...props} />);
}

describe('CartPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Your cart is empty." when cart has no items', () => {
    renderCartPanel({ cart: emptyCart });

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('renders item name, unit price, quantity, and line total', () => {
    renderCartPanel();

    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('$79.99')).toBeInTheDocument();
    expect(screen.getByText('$159.98')).toBeInTheDocument();
  });

  it('disables + button when quantity is 5', () => {
    renderCartPanel();

    const increaseButtons = screen.getAllByLabelText(/increase quantity of running shoes/i);
    expect(increaseButtons[0]).toBeDisabled();
  });

  it('− button at quantity 1 calls onRemoveItem', async () => {
    const user = userEvent.setup();
    const singleItemCart: CartSummary = {
      items: [{ productId: 3, productName: 'Yoga Mat', unitPrice: 34.99, quantity: 1, totalPrice: 34.99 }],
      totalItems: 1,
      subtotal: 34.99,
    };
    renderCartPanel({ cart: singleItemCart });

    await user.click(screen.getByLabelText(/decrease quantity of yoga mat/i));

    expect(mockOnRemoveItem).toHaveBeenCalledWith(3);
  });

  it('− button at quantity > 1 calls onUpdateItem with qty - 1', async () => {
    const user = userEvent.setup();
    renderCartPanel();

    await user.click(screen.getByLabelText(/decrease quantity of wireless headphones/i));

    expect(mockOnUpdateItem).toHaveBeenCalledWith(1, 1);
  });

  it('+ button calls onUpdateItem with qty + 1', async () => {
    const user = userEvent.setup();
    renderCartPanel();

    await user.click(screen.getByLabelText(/increase quantity of wireless headphones/i));

    expect(mockOnUpdateItem).toHaveBeenCalledWith(1, 3);
  });

  it('"Remove" button calls onRemoveItem with correct productId', async () => {
    const user = userEvent.setup();
    renderCartPanel();

    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[0]);

    expect(mockOnRemoveItem).toHaveBeenCalledWith(1);
  });

  it('"Clear cart" button calls onClearCart', async () => {
    const user = userEvent.setup();
    renderCartPanel();

    await user.click(screen.getByText('Clear cart'));

    expect(mockOnClearCart).toHaveBeenCalledTimes(1);
  });

  it('"Proceed to checkout" button is disabled', () => {
    renderCartPanel();

    expect(screen.getByText('Proceed to checkout')).toBeDisabled();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    renderCartPanel();

    await user.click(screen.getByRole('button', { name: /close cart/i }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows subtotal value', () => {
    renderCartPanel();

    expect(screen.getByText(/subtotal:/i)).toBeInTheDocument();
    expect(screen.getByText(/459\.93/)).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    renderCartPanel({ loading: true, cart: null });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
