namespace ShagoFinote.Api.Application.DTOs.Bills;

using ShagoFinote.Api.Domain.Entities;

public class BillDto
{
    public Guid Id { get; set; }
    
    public string Name { get; set; } = null!;
    
    public string? Description { get; set; }
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = null!;
    
    public DateTime DueDate { get; set; }
    
    public BillStatus Status { get; set; }
    
    public BillFrequency Frequency { get; set; }
    
    public bool IsRecurring { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public string? CategoryName { get; set; }
    
    public DateTime? PaidDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public bool IsSynced { get; set; }
}

public class CreateBillRequest
{
    public string Name { get; set; } = null!;
    
    public string? Description { get; set; }
    
    public decimal Amount { get; set; }
    
    public DateTime DueDate { get; set; }
    
    public BillFrequency Frequency { get; set; } = BillFrequency.OneTime;
    
    public Guid? CategoryId { get; set; }
}

public class UpdateBillRequest
{
    public string Name { get; set; } = null!;
    
    public string? Description { get; set; }
    
    public decimal Amount { get; set; }
    
    public DateTime DueDate { get; set; }
    
    public BillFrequency Frequency { get; set; }
    
    public BillStatus Status { get; set; }
    
    public Guid? CategoryId { get; set; }
}

public class PayBillRequest
{
    public DateTime PaidDate { get; set; }
}

public class BillFilterRequest
{
    public BillStatus? Status { get; set; }
    
    public DateTime? DueDateFrom { get; set; }
    
    public DateTime? DueDateTo { get; set; }
    
    public Guid? CategoryId { get; set; }
    
    public int Page { get; set; } = 1;
    
    public int PageSize { get; set; } = 50;
}
