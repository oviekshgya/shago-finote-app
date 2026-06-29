namespace ShagoFinote.Api.Domain.Entities;

public enum TransactionType
{
    Income = 0,
    Expense = 1,
    Transfer = 2
}

public enum TransactionSource
{
    Manual = 0,
    Notification = 1,
    Import = 2,
    Mobile = 3
}

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = "IDR";
    
    public TransactionType Type { get; set; }
    
    public TransactionSource Source { get; set; }
    
    public string? Description { get; set; }
    
    public string? Merchant { get; set; }
    
    public string? ReferenceNumber { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public DateTime TransactionDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? SyncedAt { get; set; }
    
    public string? MobileLocalId { get; set; }
    
    public bool IsSynced { get; set; } = false;
    
    public string? NotificationRawData { get; set; }
    
    public double? ParserConfidence { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
    
    public Category? Category { get; set; }
}
