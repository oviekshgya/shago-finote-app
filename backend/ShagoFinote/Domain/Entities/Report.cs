namespace ShagoFinote.Api.Domain.Entities;

public enum ReportType
{
    Monthly = 0,
    Quarterly = 1,
    Yearly = 2,
    Custom = 3
}

public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public ReportType Type { get; set; }
    
    public string Title { get; set; } = null!;
    
    public DateTime StartDate { get; set; }
    
    public DateTime EndDate { get; set; }
    
    public decimal TotalIncome { get; set; } = 0;
    
    public decimal TotalExpense { get; set; } = 0;
    
    public decimal NetCashFlow { get; set; } = 0;
    
    public int TransactionCount { get; set; } = 0;
    
    public int CategoryCount { get; set; } = 0;
    
    public string? TopCategory { get; set; }
    
    public string? DataJson { get; set; } // Stores category breakdown and other metrics as JSON
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsArchived { get; set; } = false;
    
    // Navigation properties
    public User User { get; set; } = null!;
}
