using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using MockEcommerce.Api.Models;

namespace MockEcommerce.Api.Tests.Endpoints;

public class CartEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public CartEndpointTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    private async Task ClearCartAsync()
    {
        await _client.DeleteAsync("/api/cart");
    }

    // GET /api/cart — empty cart
    [Fact]
    public async Task GetCart_EmptyCart_ReturnsOkWithEmptySummary()
    {
        await ClearCartAsync();

        var response = await _client.GetAsync("/api/cart");

        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<CartSummary>();
        Assert.NotNull(summary);
        Assert.Empty(summary.Items);
        Assert.Equal(0, summary.TotalItems);
        Assert.Equal(0m, summary.Subtotal);
    }

    // GET /api/cart — after adding item
    [Fact]
    public async Task GetCart_AfterAddingItem_ReturnsCorrectSummary()
    {
        await ClearCartAsync();
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 2 });

        var response = await _client.GetAsync("/api/cart");

        response.EnsureSuccessStatusCode();
        var summary = await response.Content.ReadFromJsonAsync<CartSummary>();
        Assert.NotNull(summary);
        Assert.Equal(2, summary.TotalItems);
        Assert.True(summary.Subtotal > 0);
    }

    // POST /api/cart — new item → 201
    [Fact]
    public async Task AddToCart_NewItem_ReturnsCreatedWithCartItem()
    {
        await ClearCartAsync();

        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 1 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<CartItem>();
        Assert.NotNull(item);
        Assert.Equal(1, item.ProductId);
        Assert.Equal(1, item.Quantity);
        Assert.True(item.UnitPrice > 0);
    }

    // POST /api/cart — existing item increments → 200
    [Fact]
    public async Task AddToCart_ExistingItem_ReturnsOkWithIncrementedQuantity()
    {
        await ClearCartAsync();
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 1 });

        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 2 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<CartItem>();
        Assert.NotNull(item);
        Assert.Equal(3, item.Quantity);
    }

    // POST /api/cart — quantity = 0 → 400
    [Fact]
    public async Task AddToCart_QuantityZero_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // POST /api/cart — quantity = -3 → 400
    [Fact]
    public async Task AddToCart_NegativeQuantity_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = -3 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // POST /api/cart — quantity = 6 → 400
    [Fact]
    public async Task AddToCart_QuantityExceedsMax_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 6 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // POST /api/cart — unknown productId → 404
    [Fact]
    public async Task AddToCart_UnknownProduct_ReturnsNotFound()
    {
        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 9999, quantity = 1 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // POST /api/cart — max qty exceeded (3 + 3 = 6) → 400
    [Fact]
    public async Task AddToCart_ExceedsMaxQuantityPerItem_ReturnsBadRequest()
    {
        await ClearCartAsync();
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 3 });

        var response = await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 3 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // PUT /api/cart/{id} — valid update → 200
    [Fact]
    public async Task UpdateCartItem_ValidUpdate_ReturnsOkWithUpdatedItem()
    {
        await ClearCartAsync();
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 1 });

        var response = await _client.PutAsJsonAsync("/api/cart/1", new { quantity = 4 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<CartItem>();
        Assert.NotNull(item);
        Assert.Equal(4, item.Quantity);
    }

    // PUT /api/cart/{id} — quantity = 0 → 400
    [Fact]
    public async Task UpdateCartItem_QuantityZero_ReturnsBadRequest()
    {
        var response = await _client.PutAsJsonAsync("/api/cart/1", new { quantity = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // PUT /api/cart/{id} — quantity = -3 → 400
    [Fact]
    public async Task UpdateCartItem_NegativeQuantity_ReturnsBadRequest()
    {
        var response = await _client.PutAsJsonAsync("/api/cart/1", new { quantity = -3 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // PUT /api/cart/{id} — quantity = 6 → 400
    [Fact]
    public async Task UpdateCartItem_QuantityExceedsMax_ReturnsBadRequest()
    {
        var response = await _client.PutAsJsonAsync("/api/cart/1", new { quantity = 6 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("quantity", body, StringComparison.OrdinalIgnoreCase);
    }

    // PUT /api/cart/{id} — product not in catalog → 404
    [Fact]
    public async Task UpdateCartItem_ProductNotInCatalog_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync("/api/cart/9999", new { quantity = 2 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("9999", body);
    }

    // PUT /api/cart/{id} — product in catalog but not in cart → 404
    [Fact]
    public async Task UpdateCartItem_ProductNotInCart_ReturnsNotFound()
    {
        await ClearCartAsync();

        var response = await _client.PutAsJsonAsync("/api/cart/1", new { quantity = 2 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("1", body);
    }

    // DELETE /api/cart/{id} — existing → 204
    [Fact]
    public async Task RemoveFromCart_ExistingItem_ReturnsNoContent()
    {
        await ClearCartAsync();
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 1 });

        var response = await _client.DeleteAsync("/api/cart/1");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // DELETE /api/cart/{id} — missing → 404
    [Fact]
    public async Task RemoveFromCart_MissingItem_ReturnsNotFound()
    {
        await ClearCartAsync();

        var response = await _client.DeleteAsync("/api/cart/1");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // DELETE /api/cart — non-empty → 204, then GET returns empty
    [Fact]
    public async Task ClearCart_NonEmptyCart_ReturnsNoContentAndCartIsEmpty()
    {
        await _client.PostAsJsonAsync("/api/cart", new { productId = 1, quantity = 1 });
        await _client.PostAsJsonAsync("/api/cart", new { productId = 2, quantity = 1 });

        var deleteResponse = await _client.DeleteAsync("/api/cart");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _client.GetAsync("/api/cart");
        var summary = await getResponse.Content.ReadFromJsonAsync<CartSummary>();
        Assert.NotNull(summary);
        Assert.Empty(summary.Items);
    }
}
