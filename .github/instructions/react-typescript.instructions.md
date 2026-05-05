---
description: "Use when writing or editing React components, hooks, or frontend TypeScript in src/frontend/src. Covers component structure, state management, CSS conventions, TypeScript patterns, and import organization."
applyTo: "src/frontend/src/**"
---

# React + TypeScript Frontend Guidelines

## Component Structure

- Use **functional components** only — no class components.
- Export components as **named exports** (`export function ProductCard`), not default exports.
- Create a barrel `index.ts` in every component folder re-exporting the named export:
  ```ts
  // components/ProductCard/index.ts
  export { ProductCard } from './ProductCard';
  ```
- Define a `{ComponentName}Props` interface **inside** the component file, not in `types/index.ts`.
- Destructure props in the function signature:
  ```tsx
  interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
  }

  export function ProductCard({ product, onAddToCart }: ProductCardProps) { ... }
  ```

## State Management

- **No Redux, Context API, or third-party state managers.** Use component-level `useState` and custom hooks.
- Extract data-fetching or reusable logic into a custom hook in `src/hooks/`.
- Custom hooks must return an **explicitly typed interface**:
  ```ts
  interface UseProductsResult {
    products: Product[];
    loading: boolean;
    error: string | null;
  }
  export function useProducts(): UseProductsResult { ... }
  ```
- Use `useRef<ReturnType<typeof setTimeout>>` to hold timer IDs; always clear in the `useEffect` cleanup to prevent memory leaks:
  ```ts
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(() => ..., 3000);
    return () => clearTimeout(timerRef.current);
  }, [dep]);
  ```
- Prefer `.then()/.catch()/.finally()` for async operations inside `useEffect` (avoids async effect function).

## TypeScript Conventions

- Use `import type` for type-only imports (`import type { Product } from '../types'`).
- Shared domain types (`Product`, `AddToCartRequest`) live in `src/types/index.ts`; component-local types stay local.
- Nullable state uses explicit union types: `useState<string | null>(null)`.
- Always handle unknown `catch` errors safely:
  ```ts
  catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred');
  }
  ```
- Typed callbacks: `(product: Product) => void`, not plain `Function`.
- No path aliases (`@/`, `~/`). Use relative imports.

## Import Order

1. React and React hooks (`import { useState, useEffect } from 'react'`)
2. Type imports (`import type { Product } from '../types'`)
3. Child component imports
4. API / utility imports
5. CSS imports (`import './ProductCard.css'`)

## Styling

- **BEM naming** for all CSS class names: `.product-card__image--placeholder`.
- All colors, spacing, and typography use **CSS custom properties** defined in `src/index.css` — never hardcode hex values or pixel sizes that already have a variable.
- Available variables include: `--blue`, `--blue-hover`, `--blue-active`, `--yellow`, `--text`, `--text-h`, `--bg`, `--bg-page`, `--border`, `--shadow`, `--shadow-hover`, `--sans`, `--radius`, `--radius-lg`.
- Use CSS Grid and Flexbox for layout. Product grids use `repeat(auto-fill, minmax(240px, 1fr))`.
- Support dark mode via `@media (prefers-color-scheme: dark)` — do not override OS preference.
- No CSS modules, no styled-components, no Tailwind.

## API Calls

- All `fetch` calls belong in `src/api/index.ts`. Components and hooks call the typed functions from there.
- Never hardcode the API base URL. Use `/api` — Vite proxies it to `http://localhost:5063`.
- Always check `if (!response.ok) throw new Error(response.statusText)` before parsing JSON.
