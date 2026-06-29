namespace ShagoFinote.Api.Domain.Entities;

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public string Name { get; set; } = null!;
    
    public string? Icon { get; set; }
    
    public string Color { get; set; } = "#c9152a";
    
    public string CategoryType { get; set; } = "Expense"; // Expense, Income, Transfer
    
    public bool IsDefault { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
}
