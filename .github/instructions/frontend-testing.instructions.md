---
description: "Use when writing or editing frontend tests with Vitest and React Testing Library. Covers mocking strategy, query selection, user interaction, async patterns, and accessibility assertions."
applyTo: "test/frontend/**"
---

# Frontend Testing Guidelines (Vitest + React Testing Library)

## Test Setup

- Test framework: **Vitest** with `jsdom` environment.
- Imports `@testing-library/jest-dom` via `src/frontend/src/test-setup.ts` — all `expect` matchers (`.toBeInTheDocument()`, `.toBeDisabled()`, etc.) are available globally.
- Do not import `describe`, `it`, `expect`, or `vi` — they are Vitest globals.

## File Organization

- Mirror the source tree: `test/frontend/components/ProductCard/ProductCard.test.tsx` tests `src/frontend/src/components/ProductCard/ProductCard.tsx`.
- One test file per component or hook.

## Mocking

- Mock entire modules at the top of the file with `vi.mock('../../path/to/module')`.
- Reference typed mocks with `vi.mocked()`:
  ```ts
  vi.mock('../../api');
  import { fetchProducts } from '../../api';
  const mockFetchProducts = vi.mocked(fetchProducts);
  ```
- Use `.mockReturnValue()` for synchronous mocks, `.mockResolvedValue()` / `.mockRejectedValue()` for async.
- **Always** call `vi.restoreAllMocks()` in `afterEach`:
  ```ts
  afterEach(() => {
    vi.restoreAllMocks();
  });
  ```

## Querying the DOM

Prefer queries in this order (most accessible → least):
1. `getByRole` — first choice for interactive elements and landmarks
2. `getByLabelText` — form fields
3. `getByText` — visible text content
4. `getByTestId` — only as a last resort

Use `findBy*` variants (which return Promises) for elements that appear asynchronously:
```ts
const heading = await screen.findByRole('heading', { name: /product name/i });
```

## User Interactions

- Use `@testing-library/user-event` via `userEvent.setup()` for realistic interactions:
  ```ts
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /add to cart/i }));
  ```
- Avoid `fireEvent` except for events that `userEvent` does not support.

## Async Patterns

- Use `waitFor()` for assertions that depend on state updates after async operations.
- Use `renderHook()` from `@testing-library/react` for testing custom hooks:
  ```ts
  const { result } = renderHook(() => useProducts());
  await waitFor(() => expect(result.current.loading).toBe(false));
  ```

## Accessibility Assertions

- Test meaningful ARIA roles and labels — not implementation details.
- Validate that loading states use `role="status"`, error regions use appropriate roles.
- Confirm buttons have accessible names via `aria-label` or visible text.

## Test Naming

- Use `describe` blocks per component or hook, then descriptive `it` strings:
  ```ts
  describe('ProductCard', () => {
    it('renders the product name and price', () => { ... });
    it('calls onAddToCart with the product when the button is clicked', async () => { ... });
    it('disables the button while loading', () => { ... });
  });
  ```
