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

## Key Files

| File | Purpose |
|------|---------|
| `src/backend/MockEcommerce.Api/Program.cs` | Service registration, middleware, endpoint mapping |
| `src/backend/MockEcommerce.Api/Endpoints/*.cs` | Route definitions (Minimal API extension methods) |
| `src/backend/MockEcommerce.Api/Services/` | `IProductService`, `ICartService` interfaces + implementations |
| `src/frontend/src/types/index.ts` | Shared TypeScript domain types (`Product`, `AddToCartRequest`) |
| `src/frontend/src/api/index.ts` | All `fetch` calls to the backend |
| `src/frontend/src/index.css` | CSS custom properties (colors, spacing, typography) |
