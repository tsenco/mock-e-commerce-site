# Mock E-Commerce Site — Project Guidelines

## Overview

Full-stack mock e-commerce application. React/TypeScript frontend and ASP.NET Core Minimal API backend in a single monorepo.

```
src/
  frontend/     # React 19 + TypeScript (Vite)
  backend/      # ASP.NET Core 10 Minimal API (MockEcommerce.Api)
test/
  frontend/     # Vitest + React Testing Library
  backend/      # xUnit integration + unit tests
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, CSS (BEM + custom properties) |
| Backend | ASP.NET Core 10 Minimal APIs, C# 13 |
| Frontend tests | Vitest, React Testing Library, @testing-library/user-event |
| Backend tests | xUnit, WebApplicationFactory (integration), direct instantiation (unit) |

## Build & Test Commands

```bash
# Frontend
cd src/frontend
npm install            # install dependencies
npm run dev            # dev server on :5173 (proxies /api → http://localhost:5063)
npm run build          # type-check + Vite bundle
npm run lint           # ESLint flat config
npm run test           # Vitest (watch)
npm run test -- --run  # Vitest (single run, CI)

# Backend
dotnet build src/backend/MockEcommerce.slnx
dotnet run --project src/backend/MockEcommerce.Api   # API on http://localhost:5063
dotnet test test/backend/MockEcommerce.Api.Tests
```

## Architecture Notes

- The frontend Vite dev server proxies all `/api` requests to `http://localhost:5063` (see `src/frontend/vite.config.ts`). Never hardcode the API base URL.
- Services are registered as **singletons** in `Program.cs`. In-memory state (cart) lives in `InMemoryCartService` — there is no database.
- No Redux, Context API, or third-party state manager on the frontend. Use component-level state and custom hooks.
- No CSS frameworks (no Tailwind, Bootstrap, etc.). Use BEM class names with CSS custom properties defined in `src/frontend/src/index.css`.

## Implementation Status

- **Product catalog** — fully implemented. `MockProductService` returns 5 fixed products; `ProductEndpoints` exposes `GET /api/products` and `GET /api/products/{id}`; the frontend fetches, renders, and tests them end-to-end.
- **Cart** — backend service (`InMemoryCartService`) and endpoint (`CartEndpoints`, `POST /api/cart`) exist. Frontend UI for displaying the cart and full cart flow may be incomplete — check before assuming it works.

## Product Catalog

The fixed catalog in `MockProductService` contains exactly **5 products**:

| Id | Name | Price | Category | Stock |
|----|------|-------|----------|-------|
| 1 | Wireless Headphones | $79.99 | Electronics | 25 |
| 2 | Running Shoes | $59.99 | Footwear | 40 |
| 3 | Stainless Steel Water Bottle | $24.99 | Accessories | 100 |
| 4 | Mechanical Keyboard | $109.99 | Electronics | 15 |
| 5 | Yoga Mat | $34.99 | Sports | 60 |

Use these exact names, IDs, and prices when writing tests or seed data — do not invent fictional products.

## Key Files

| File | Purpose |
|------|---------|
| `src/backend/MockEcommerce.Api/Program.cs` | Service registration, middleware, endpoint mapping |
| `src/backend/MockEcommerce.Api/Endpoints/ProductEndpoints.cs` | Product route definitions (`GET /api/products`, `GET /api/products/{id}`) |
| `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs` | Cart route definitions (`POST /api/cart`) |
| `src/backend/MockEcommerce.Api/Services/IProductService.cs` | Product service interface |
| `src/backend/MockEcommerce.Api/Services/MockProductService.cs` | In-memory product catalog (read-only, 5 products) |
| `src/backend/MockEcommerce.Api/Services/ICartService.cs` | Cart service interface |
| `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs` | In-memory cart state (dictionary + Lock for thread safety) |
| `src/frontend/src/types/index.ts` | Shared TypeScript domain types (`Product`, `AddToCartRequest`) |
| `src/frontend/src/api/index.ts` | All `fetch` calls to the backend |
| `src/frontend/src/index.css` | CSS custom properties (colors, spacing, typography) |
