---
description: "Use when writing or editing backend tests in test/backend. Covers xUnit conventions, WebApplicationFactory integration tests, unit test patterns, test naming, and assertion style."
applyTo: "test/backend/**/*.cs"
---

# Backend Testing Guidelines (xUnit)

## Test Framework

- **xUnit** is the only test framework in use — do not introduce NUnit or MSTest.
- `Xunit` is a global using (declared in the `.csproj`) — no need to add `using Xunit;`.
- `Microsoft.AspNetCore.Mvc.Testing` provides `WebApplicationFactory` for integration tests.

## Integration Tests (Endpoint Tests)

Use `WebApplicationFactory<Program>` to spin up the real application in-process:

```csharp
public class ProductEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ProductEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAllProducts_ReturnsOkWithNonEmptyList()
    {
        var response = await _client.GetAsync("/api/products");

        response.EnsureSuccessStatusCode();
        var products = await response.Content.ReadFromJsonAsync<List<Product>>();
        Assert.NotNull(products);
        Assert.NotEmpty(products);
    }
}
```

- Inherit `IClassFixture<WebApplicationFactory<Program>>` — one factory instance per test class.
- Receive the factory via constructor injection; build `HttpClient` in the constructor.
- Use `response.EnsureSuccessStatusCode()` for 2xx assertions; use `Assert.Equal(HttpStatusCode.NotFound, response.StatusCode)` for expected error responses.
- Deserialize with `ReadFromJsonAsync<T>()` from `System.Net.Http.Json`.

## Unit Tests (Service Tests)

Instantiate services directly — there is no mocking library:

```csharp
public class MockProductServiceTests
{
    private readonly MockProductService _service = new();

    [Fact]
    public void GetAll_ReturnsAllProducts()
    {
        var products = _service.GetAll().ToList();
        Assert.NotEmpty(products);
    }

    [Fact]
    public void GetById_WithValidId_ReturnsMatchingProduct()
    {
        var product = _service.GetById(1);
        Assert.NotNull(product);
        Assert.Equal(1, product.Id);
    }

    [Fact]
    public void GetById_WithInvalidId_ReturnsNull()
    {
        var product = _service.GetById(-1);
        Assert.Null(product);
    }
}
```

- No mocking libraries (Moq, NSubstitute, etc.) — use real implementations or hand-written stubs.
- Do not use `IClassFixture` for unit tests; instantiate in the field initializer or constructor.

## Test Naming

Follow the `MethodName_Condition_ExpectedResult` pattern:
- `GetAll_ReturnsAllProducts`
- `GetById_WithValidId_ReturnsMatchingProduct`
- `GetById_WithInvalidId_ReturnsNull`
- `AddToCart_NewProduct_AddsItemToCart`

## Assertions

- Use plain `Assert.*` methods — **no fluent assertion libraries** (FluentAssertions, Shouldly).
- Prefer the most specific assertion available: `Assert.Equal`, `Assert.NotNull`, `Assert.NotEmpty`, `Assert.True/False`, `Assert.IsType<T>`.
- For collections: `Assert.NotEmpty(list)`, `Assert.Equal(expected, actual.Count)`.

## File Organization

- Mirror the source tree: `test/backend/.../Endpoints/ProductEndpointTests.cs` tests `src/backend/.../Endpoints/ProductEndpoints.cs`.
- Suffix all test classes with `Tests`.
