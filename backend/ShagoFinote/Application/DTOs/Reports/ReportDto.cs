namespace ShagoFinote.Api.Application.DTOs.Reports;

using ShagoFinote.Api.Domain.Entities;

public class ReportDto
{
    public Guid Id { get; set; }
    
    public ReportType Type { get; set; }
    
    public string Title { get; set; } = null!;
    
    public DateTime StartDate { get; set; }
    
    public DateTime EndDate { get; set; }
    
    public decimal TotalIncome { get; set; }
    
    public decimal TotalExpense { get; set; }
    
    public decimal NetCashFlow { get; set; }
    
    public int TransactionCount { get; set; }
    
    public int CategoryCount { get; set; }
    
    public string? TopCategory { get; set; }
    
    public DateTime GeneratedAt { get; set; }
}

public class GenerateReportRequest
{
    public ReportType Type { get; set; }
    
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
}

public class CategoryBreakdown
{
    public string CategoryName { get; set; } = null!;
    
    public decimal Amount { get; set; }
    
    public decimal Percentage { get; set; }
    
    public int TransactionCount { get; set; }
}

public class ReportDetailDto
{
    public ReportDto Report { get; set; } = null!;
    
    public List<CategoryBreakdown> CategoryBreakdowns { get; set; } = new();
    
    public List<MonthlyTrendDto> MonthlyTrends { get; set; } = new();
}

public class MonthlyTrendDto
{
    public string Month { get; set; } = null!;
    
    public decimal Income { get; set; }
    
    public decimal Expense { get; set; }
    
    public decimal NetCashFlow { get; set; }
}
