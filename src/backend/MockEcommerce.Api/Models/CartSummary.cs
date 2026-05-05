namespace MockEcommerce.Api.Models;

/// <summary>Summary response returned by GET /api/cart.</summary>
public class CartSummary
{
    /// <summary>All items currently in the cart.</summary>
    public IEnumerable<CartItem> Items { get; set; } = [];

    /// <summary>Sum of all item quantities.</summary>
    public int TotalItems { get; set; }

    /// <summary>Sum of all item total prices.</summary>
    public decimal Subtotal { get; set; }
}
