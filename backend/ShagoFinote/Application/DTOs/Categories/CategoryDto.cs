namespace ShagoFinote.Api.Application.DTOs.Categories;

public class CategoryDto
{
    public Guid Id { get; set; }
    
    public string Name { get; set; } = null!;
    
    public string? Icon { get; set; }
    
    public string Color { get; set; } = null!;
    
    public string CategoryType { get; set; } = null!;
    
    public bool IsDefault { get; set; }
    
    public DateTime CreatedAt { get; set; }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = null!;
    
    public string? Icon { get; set; }
    
    public string Color { get; set; } = "#c9152a";
    
    public string CategoryType { get; set; } = "Expense";
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = null!;
    
    public string? Icon { get; set; }
    
    public string Color { get; set; } = null!;
    
    public string CategoryType { get; set; } = null!;
}
