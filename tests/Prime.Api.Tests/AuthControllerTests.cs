using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class AuthControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly AuthController _controller;
    private readonly TokenService _tokens;
    private readonly PasswordHasher<AppUser> _hasher = new();

    private static readonly string TestKey = "test-secret-key-long-enough-for-hmac-sha256-signing-0123456789";

    public AuthControllerTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = TestKey,
                ["Jwt:Issuer"] = "Prime.Api",
                ["Jwt:Audience"] = "Prime.Web",
                ["Jwt:ExpiryHours"] = "1",
            })
            .Build();
        _tokens = new TokenService(config, TimeProvider.System);
        _controller = new AuthController(_db, _tokens, new LoginThrottle(TimeProvider.System));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<AppUser> CreateUserAsync(
        string username = "user1",
        string password = "Passw0rd!",
        bool active = true,
        string role = UserRoles.User)
    {
        var user = new AppUser
        {
            Username = username,
            DisplayName = "مستخدم",
            Role = role,
            IsActive = active,
            PasswordHash = _hasher.HashPassword(new AppUser(), password),
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private static LoginResponse OkValue(ActionResult<LoginResponse> result)
    {
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<LoginResponse>(ok.Value);
    }

    [Fact]
    public async Task Login_Success_ReturnsTokenAndUser()
    {
        await CreateUserAsync();

        var result = await _controller.Login(new LoginRequest("user1", "Passw0rd!"));

        var response = OkValue(result);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.Equal("user1", response.User.Username);
        Assert.Equal(UserRoles.User, response.User.Role);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await CreateUserAsync();

        var result = await _controller.Login(new LoginRequest("user1", "wrong-password"));

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownUser_Returns401()
    {
        var result = await _controller.Login(new LoginRequest("ghost", "Passw0rd!"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_InactiveUser_Returns401()
    {
        await CreateUserAsync(active: false);

        var result = await _controller.Login(new LoginRequest("user1", "Passw0rd!"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_EmptyFields_Returns400()
    {
        var result = await _controller.Login(new LoginRequest("", ""));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_AfterFiveFailures_Returns429()
    {
        await CreateUserAsync();

        for (var i = 0; i < 5; i++)
        {
            await _controller.Login(new LoginRequest("user1", "bad"));
        }

        var result = await _controller.Login(new LoginRequest("user1", "Passw0rd!"));

        var throttled = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, throttled.StatusCode);
    }

    [Fact]
    public async Task Me_WithValidClaims_ReturnsUser()
    {
        var user = await CreateUserAsync();
        SetPrincipal(user);

        var result = await _controller.Me();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<UserDto>(ok.Value);
        Assert.Equal(user.Id, dto.Id);
        Assert.Equal("user1", dto.Username);
    }

    [Fact]
    public async Task Me_WithoutClaims_Returns401()
    {
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal() },
        };

        var result = await _controller.Me();

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task Me_ForDeactivatedUser_Returns401()
    {
        var user = await CreateUserAsync();
        user.IsActive = false;
        await _db.SaveChangesAsync();
        SetPrincipal(user);

        var result = await _controller.Me();

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task ChangePassword_Success_ThenNewPasswordWorks()
    {
        var user = await CreateUserAsync();
        SetPrincipal(user);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("Passw0rd!", "NewPassw0rd!"));

        Assert.IsType<OkObjectResult>(result);

        var relogin = await _controller.Login(new LoginRequest("user1", "NewPassw0rd!"));
        Assert.IsType<OkObjectResult>(relogin.Result);

        var oldFails = await _controller.Login(new LoginRequest("user1", "Passw0rd!"));
        Assert.IsType<UnauthorizedObjectResult>(oldFails.Result);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns400()
    {
        var user = await CreateUserAsync();
        SetPrincipal(user);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("nope", "NewPassw0rd!"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ChangePassword_TooShort_Returns400()
    {
        var user = await CreateUserAsync();
        SetPrincipal(user);

        var result = await _controller.ChangePassword(new ChangePasswordRequest("Passw0rd!", "short"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public void Token_RoundTrip_ValidatesWithJwtParameters()
    {
        var user = new AppUser 
        { 
            Id = 42, 
            Username = "admin", 
            Role = UserRoles.Admin
        };
        var token = _tokens.CreateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "Prime.Api",
            ValidateAudience = true,
            ValidAudience = "Prime.Web",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        var principal = handler.ValidateToken(token, parameters, out _);

        Assert.Equal("42", principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal("admin", principal.FindFirstValue(ClaimTypes.Name));
        Assert.Equal(UserRoles.Admin, principal.FindFirstValue(ClaimTypes.Role));
    }

    private void SetPrincipal(AppUser user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
        };

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                claims, authenticationType: "test")),
            },
        };
    }
}