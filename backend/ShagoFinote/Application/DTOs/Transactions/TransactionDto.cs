namespace ShagoFinote.Api.Application.DTOs.Transactions;

using ShagoFinote.Api.Domain.Entities;

public class TransactionDto
{
    public Guid Id { get; set; }
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = null!;
    
    public TransactionType Type { get; set; }
    
    public TransactionSource Source { get; set; }
    
    public string? Description { get; set; }
    
    public string? Merchant { get; set; }
    
    public string? ReferenceNumber { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public string? CategoryName { get; set; }
    
    public DateTime TransactionDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsSynced { get; set; }
    
    public double? ParserConfidence { get; set; }
}

public class CreateTransactionRequest
{
    public decimal Amount { get; set; }
    
    public TransactionType Type { get; set; }
    
    public string? Description { get; set; }
    
    public string? Merchant { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public DateTime TransactionDate { get; set; }
}

public class UpdateTransactionRequest
{
    public decimal Amount { get; set; }
    
    public TransactionType Type { get; set; }
    
    public string? Description { get; set; }
    
    public string? Merchant { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public DateTime TransactionDate { get; set; }
}

public class BulkSyncTransactionsRequest
{
    public List<SyncTransactionData> Transactions { get; set; } = null!;
    
    public string DeviceId { get; set; } = null!;
    
    public string DeviceName { get; set; } = null!;
    
    public DateTime LastSyncAt { get; set; }
}

public class SyncTransactionData
{
    public string MobileLocalId { get; set; } = null!;
    
    public decimal Amount { get; set; }
    
    public TransactionType Type { get; set; }
    
    public TransactionSource Source { get; set; }
    
    public string? Description { get; set; }
    
    public string? Merchant { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public DateTime TransactionDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}

public class TransactionFilterRequest
{
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
    
    public TransactionType? Type { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public string? SearchQuery { get; set; }
    
    public int Page { get; set; } = 1;
    
    public int PageSize { get; set; } = 50;
}
