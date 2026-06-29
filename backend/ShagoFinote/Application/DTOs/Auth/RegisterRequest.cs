namespace ShagoFinote.Api.Application.DTOs.Auth;

public class RegisterRequest
{
    public string Email { get; set; } = null!;
    
    public string Username { get; set; } = null!;
    
    public string Password { get; set; } = null!;
    
    public string FullName { get; set; } = null!;
    
    public string? PhoneNumber { get; set; }
    
    public string CurrencyCode { get; set; } = "IDR";
}

public class LoginRequest
{
    public string Email { get; set; } = null!;
    
    public string Password { get; set; } = null!;
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = null!;
}

public class AuthResponse
{
    public string AccessToken { get; set; } = null!;
    
    public string RefreshToken { get; set; } = null!;
    
    public UserDto User { get; set; } = null!;
    
    public DateTime ExpiresAt { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    
    public string Email { get; set; } = null!;
    
    public string Username { get; set; } = null!;
    
    public string FullName { get; set; } = null!;
    
    public string? PhoneNumber { get; set; }
    
    public string CurrencyCode { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; }
    
    public bool IsActive { get; set; }
}
