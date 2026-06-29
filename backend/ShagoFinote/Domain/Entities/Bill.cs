namespace ShagoFinote.Api.Domain.Entities;

public enum BillStatus
{
    Pending = 0,
    Paid = 1,
    Overdue = 2,
    Cancelled = 3
}

public enum BillFrequency
{
    OneTime = 0,
    Daily = 1,
    Weekly = 2,
    BiWeekly = 3,
    Monthly = 4,
    Quarterly = 5,
    Yearly = 6
}

public class Bill
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public string Name { get; set; } = null!;
    
    public string? Description { get; set; }
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = "IDR";
    
    public DateTime DueDate { get; set; }
    
    public BillStatus Status { get; set; } = BillStatus.Pending;
    
    public BillFrequency Frequency { get; set; } = BillFrequency.OneTime;
    
    public bool IsRecurring { get; set; } = false;
    
    public Guid? CategoryId { get; set; }
    
    public DateTime? PaidDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? SyncedAt { get; set; }
    
    public string? MobileLocalId { get; set; }
    
    public bool IsSynced { get; set; } = false;
    
    // Navigation properties
    public User User { get; set; } = null!;
    
    public Category? Category { get; set; }
}
