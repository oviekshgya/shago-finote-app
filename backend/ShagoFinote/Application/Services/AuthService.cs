namespace ShagoFinote.Api.Application.Services;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShagoFinote.Api.Application.DTOs.Auth;
using ShagoFinote.Api.Domain.Entities;
using ShagoFinote.Api.Infrastructure.Data;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task<UserDto> GetCurrentUserAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email || u.Username == request.Username);

            if (existingUser != null)
                throw new InvalidOperationException("User dengan email atau username ini sudah terdaftar.");

            // Create new user
            var user = new User
            {
                Email = request.Email.ToLower(),
                Username = request.Username,
                FullName = request.FullName,
                PhoneNumber = request.PhoneNumber,
                CurrencyCode = request.CurrencyCode,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            };

            // Add default categories
            user.Categories = new List<Category>
            {
                new() { Name = "Gaji", CategoryType = "Income", IsDefault = true },
                new() { Name = "Makan", CategoryType = "Expense", IsDefault = true },
                new() { Name = "Transport", CategoryType = "Expense", IsDefault = true },
                new() { Name = "Shopping", CategoryType = "Expense", IsDefault = true },
                new() { Name = "Utilities", CategoryType = "Expense", IsDefault = true },
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User registered: {Email}", user.Email);

            // Generate tokens
            var accessToken = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();

            // Store refresh token (in production, store in secure way or database)
            // For now, we'll just return it
            var response = new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = MapToUserDto(user),
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            throw;
        }
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower());

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                throw new InvalidOperationException("Email atau password tidak valid.");

            if (!user.IsActive)
                throw new InvalidOperationException("User account sudah dinonaktifkan.");

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User logged in: {Email}", user.Email);

            // Generate tokens
            var accessToken = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();

            var response = new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = MapToUserDto(user),
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            throw;
        }
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        try
        {
            // In production, validate refresh token from database
            // For now, just create new token for valid request
            var principal = GetPrincipalFromExpiredToken(request.RefreshToken);
            
            if (principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value is not string userIdString ||
                !Guid.TryParse(userIdString, out var userId))
                throw new InvalidOperationException("Invalid refresh token.");

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                throw new InvalidOperationException("User tidak ditemukan atau tidak aktif.");

            var accessToken = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();

            var response = new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = MapToUserDto(user),
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            throw;
        }
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User tidak ditemukan.");

        return MapToUserDto(user);
    }

    private string GenerateAccessToken(User user)
    {
        var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret not configured");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "ShagoFinote";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "ShagoFinoteApp";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("FullName", user.FullName),
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }

    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT secret not configured");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "ShagoFinote";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "ShagoFinoteApp";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateLifetime = false
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

        if (!(securityToken is JwtSecurityToken jwtSecurityToken) ||
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            throw new SecurityTokenException("Invalid token");

        return principal;
    }

    private UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            CurrencyCode = user.CurrencyCode,
            CreatedAt = user.CreatedAt,
            IsActive = user.IsActive
        };
    }
}
