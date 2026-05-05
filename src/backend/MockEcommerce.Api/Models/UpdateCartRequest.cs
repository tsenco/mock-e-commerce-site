namespace MockEcommerce.Api.Models;

/// <summary>Request body for updating a cart item's quantity.</summary>
public class UpdateCartRequest
{
    /// <summary>The new absolute quantity to set (1–5 inclusive).</summary>
    public int Quantity { get; set; }
}
