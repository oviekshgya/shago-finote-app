namespace ShagoFinote.Api.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Email { get; set; } = null!;
    
    public string Username { get; set; } = null!;
    
    public string PasswordHash { get; set; } = null!;
    
    public string FullName { get; set; } = null!;
    
    public string? PhoneNumber { get; set; }
    
    public string? CurrencyCode { get; set; } = "IDR";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime? LastLoginAt { get; set; }
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
    
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    
    public ICollection<SyncLog> SyncLogs { get; set; } = new List<SyncLog>();
    
    public ICollection<Report> Reports { get; set; } = new List<Report>();
}
