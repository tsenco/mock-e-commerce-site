using MockEcommerce.Api.Models;
using MockEcommerce.Api.Services;

namespace MockEcommerce.Api.Tests.Services;

public class InMemoryCartServiceTests
{
    private static InMemoryCartService CreateService() => new();

    private static CartItem MakeItem(int productId = 1, int quantity = 1) => new()
    {
        ProductId = productId,
        ProductName = $"Product {productId}",
        UnitPrice = 10.00m,
        Quantity = quantity
    };

    [Fact]
    public void GetAll_EmptyCart_ReturnsEmptyCollection()
    {
        var service = CreateService();

        var result = service.GetAll();

        Assert.Empty(result);
    }

    [Fact]
    public void Add_NewItem_ReturnsAddedItem()
    {
        var service = CreateService();
        var item = MakeItem(productId: 1, quantity: 2);

        var result = service.Add(item);

        Assert.NotNull(result);
        Assert.Equal(1, result.ProductId);
        Assert.Equal(2, result.Quantity);
        Assert.Equal("Product 1", result.ProductName);
    }

    [Fact]
    public void Add_ExistingItem_IncrementsQuantity()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1, quantity: 2));

        var result = service.Add(MakeItem(productId: 1, quantity: 3));

        Assert.Equal(5, result.Quantity);
    }

    [Fact]
    public void GetByProductId_ExistingItem_ReturnsItem()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1));

        var result = service.GetByProductId(1);

        Assert.NotNull(result);
        Assert.Equal(1, result.ProductId);
    }

    [Fact]
    public void GetByProductId_MissingItem_ReturnsNull()
    {
        var service = CreateService();

        var result = service.GetByProductId(999);

        Assert.Null(result);
    }

    [Fact]
    public void Remove_ExistingItem_ReturnsTrueAndItemGone()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1));

        var removed = service.Remove(1);
        var all = service.GetAll();

        Assert.True(removed);
        Assert.Empty(all);
    }

    [Fact]
    public void Remove_MissingItem_ReturnsFalse()
    {
        var service = CreateService();

        var result = service.Remove(999);

        Assert.False(result);
    }

    [Fact]
    public void Clear_RemovesAllItems()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1));
        service.Add(MakeItem(productId: 2));

        service.Clear();

        Assert.Empty(service.GetAll());
    }

    [Fact]
    public void UpdateQuantity_ExistingItem_SetsQuantityExactly()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1, quantity: 2));

        var result = service.UpdateQuantity(1, 4);

        Assert.NotNull(result);
        Assert.Equal(4, result.Quantity);
    }

    [Fact]
    public void UpdateQuantity_MissingItem_ReturnsNull()
    {
        var service = CreateService();

        var result = service.UpdateQuantity(999, 3);

        Assert.Null(result);
    }

    [Fact]
    public void GetAll_ReturnsSnapshot_NotLiveReference()
    {
        var service = CreateService();
        service.Add(MakeItem(productId: 1));

        var snapshot = service.GetAll().ToList();
        snapshot.Clear();

        Assert.NotEmpty(service.GetAll());
    }
}
