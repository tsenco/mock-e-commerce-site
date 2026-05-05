---
description: "Use when writing or editing C# backend code in src/backend. Covers Minimal API endpoint patterns, service layer conventions, model design, DI registration, nullability, and XML documentation."
applyTo: "src/backend/**/*.cs"
---

# C# + ASP.NET Core Backend Guidelines

## Minimal API Endpoints

- Use **Minimal APIs** — do not introduce MVC controllers.
- Define endpoints in `src/backend/MockEcommerce.Api/Endpoints/` as a **static class** with an extension method:
  ```csharp
  public static class ProductEndpoints
  {
      public static void MapProductEndpoints(this WebApplication app)
      {
          var group = app.MapGroup("api/products")
              .WithTags("Products");

          group.MapGet("/", GetAll)
              .WithName("GetAllProducts")
              .WithSummary("Returns all products in the catalog.");

          group.MapGet("/{id:int}", GetById)
              .WithName("GetProductById")
              .WithSummary("Returns a single product by ID.");
      }

      internal static Ok<IEnumerable<Product>> GetAll(IProductService productService) =>
          TypedResults.Ok(productService.GetAll());

      internal static Results<Ok<Product>, NotFound> GetById(int id, IProductService productService) =>
          productService.GetById(id) is Product product
              ? TypedResults.Ok(product)
              : TypedResults.NotFound();
  }
  ```
- Mark handler methods `internal static`.
- Inject services via **method parameters** (Minimal API DI), not constructor injection.
- Always use **`TypedResults`** and **`Results<T1, T2>`** for strongly-typed return types — never return plain `IResult`.
- Call the extension method from `Program.cs`: `app.MapProductEndpoints();`

## Service Layer

- Every service must have an **interface** in `Services/I{Name}Service.cs` and an **implementation** in `Services/{Name}Service.cs`.
- Interfaces use nullable return types where the resource may be absent: `Product? GetById(int id);`
- Register all services as **singletons** in `Program.cs`:
  ```csharp
  builder.Services.AddSingleton<IProductService, MockProductService>();
  ```
- There is no database — in-memory state only. `InMemoryCartService` uses a private dictionary + `Lock` for thread safety.

## Models

- Use **POCO classes** (not records) with auto-properties:
  ```csharp
  namespace MockEcommerce.Api.Models;

  /// <summary>Represents a product in the catalog.</summary>
  public class Product
  {
      /// <summary>Unique product identifier.</summary>
      public int Id { get; set; }

      /// <summary>Display name of the product.</summary>
      public string Name { get; set; } = string.Empty;

      public decimal Price { get; set; }

      public string ImageUrl { get; set; } = string.Empty;
  }
  ```
- Initialize all `string` properties to `string.Empty` to prevent null deserialization issues.
- Computed properties use arrow syntax: `public decimal TotalPrice => UnitPrice * Quantity;`

## C# Conventions

- **File-scoped namespaces**: `namespace MockEcommerce.Api.Models;` (no braces).
- **ImplicitUsings** is enabled — don't add redundant `using` directives for `System.*`.
- **Nullable reference types** are enabled (`<Nullable>enable</Nullable>`). Mark all potentially-null returns explicitly (`Product?`).
- Private fields use underscore prefix: `_cart`, `_lock`, `_client`.
- Interface names are prefixed with `I`: `IProductService`, `ICartService`.
- Static/readonly fields use PascalCase: `private static readonly List<Product> Products = ...`

## XML Documentation

- All public and internal members must have `/// <summary>` documentation.
- Use `/// <param name="...">` and `/// <returns>` for non-obvious members.
- Use `<see cref="..."/>` for cross-references.
- Implementations may use `/// <inheritdoc />` instead of repeating the interface summary.

## OpenAPI

- Every endpoint group gets `.WithTags(...)`.
- Every endpoint gets `.WithName(...)` (camelCase) and `.WithSummary(...)` (human-readable sentence).
