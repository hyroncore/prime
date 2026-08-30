using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class UsersControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly UsersController _controller;
    private readonly AuthController _authController;
    private readonly PasswordHasher<AppUser> _hasher = new();

    public UsersControllerTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();

        _controller = new UsersController(_db);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "test-secret-key-long-enough-for-hmac-sha256-signing-0123456789",
                ["Jwt:Issuer"] = "Prime.Api",
                ["Jwt:Audience"] = "Prime.Web",
            })
            .Build();
        _authController = new AuthController(_db, new TokenService(config, TimeProvider.System), new LoginThrottle(TimeProvider.System));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<AppUser> CreateUserAsync(
        string username,
        string displayName = "مستخدم",
        string password = "Passw0rd!",
        string role = UserRoles.User)
    {
        var user = new AppUser
        {
            Username = username,
            DisplayName = displayName,
            Role = role,
            PasswordHash = _hasher.HashPassword(new AppUser(), password),
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private void SetPrincipal(int userId, string role = UserRoles.Admin)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, "admin"),
            new Claim(ClaimTypes.Role, role),
        };

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "test")),
            },
        };
    }

    private static UserDto OkValue(ActionResult<UserDto> result)
    {
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<UserDto>(ok.Value);
    }

    [Fact]
    public async Task List_ReturnsUsers()
    {
        await CreateUserAsync("user1");
        await CreateUserAsync("user2");

        var result = await _controller.List();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var users = Assert.IsType<List<UserDto>>(ok.Value);
        Assert.Equal(2, users.Count);
    }

    [Fact]
    public async Task Create_ValidUser_ReturnsUser()
    {
        SetPrincipal(1);

        var result = await _controller.Create(new CreateUserRequest("newuser", "مستخدم جديد", UserRoles.User, "Passw0rd!"));

        var user = OkValue(result);
        Assert.Equal("newuser", user.Username);
        Assert.Equal(UserRoles.User, user.Role);
        Assert.True(user.IsActive);

        var exists = await _db.Users.SingleAsync(u => u.Username == "newuser");
        Assert.True(_hasher.VerifyHashedPassword(exists, exists.PasswordHash, "Passw0rd!") != PasswordVerificationResult.Failed);
    }

    [Fact]
    public async Task Create_DuplicateUsername_Returns409()
    {
        await CreateUserAsync("dup");
        SetPrincipal(1);

        var result = await _controller.Create(new CreateUserRequest("dup", "مستخدم", UserRoles.User, "Passw0rd!"));

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidRole_Returns400()
    {
        SetPrincipal(1);

        var result = await _controller.Create(new CreateUserRequest("x", "مستخدم", "SuperAdmin", "Passw0rd!"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ShortPassword_Returns400()
    {
        SetPrincipal(1);

        var result = await _controller.Create(new CreateUserRequest("x", "مستخدم", UserRoles.User, "short"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ChangesRoleAndActive()
    {
        var user = await CreateUserAsync("user1");
        SetPrincipal(999);

        var result = await _controller.Update(user.Id, new UpdateUserRequest("اسم معدل", UserRoles.Admin, false));

        var updated = OkValue(result);
        Assert.Equal("اسم معدل", updated.DisplayName);
        Assert.Equal(UserRoles.Admin, updated.Role);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task Update_CannotDemoteSelf()
    {
        var admin = await CreateUserAsync("admin", role: UserRoles.Admin);
        SetPrincipal(admin.Id);

        var result = await _controller.Update(admin.Id, new UpdateUserRequest("admin", UserRoles.User, true));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_CannotDeactivateLastAdmin()
    {
        var admin = await CreateUserAsync("admin", role: UserRoles.Admin);
        SetPrincipal(admin.Id, UserRoles.Admin);

        var result = await _controller.Update(admin.Id, new UpdateUserRequest("admin", UserRoles.Admin, false));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task ResetPassword_ThenLoginWithNewPassword()
    {
        var user = await CreateUserAsync("user1");
        SetPrincipal(999);

        var result = await _controller.ResetPassword(user.Id, new ResetPasswordRequest("FreshPassw0rd!"));

        Assert.IsType<OkObjectResult>(result);

        var login = await _authController.Login(new LoginRequest("user1", "FreshPassw0rd!"));
        Assert.IsType<OkObjectResult>(login.Result);
    }

    [Fact]
    public async Task ResetPassword_Short_Returns400()
    {
        var user = await CreateUserAsync("user1");
        SetPrincipal(999);

        var result = await _controller.ResetPassword(user.Id, new ResetPasswordRequest("tiny"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Delete_RemovesUser()
    {
        var user = await CreateUserAsync("user1");
        SetPrincipal(999);

        var result = await _controller.Delete(user.Id);

        Assert.IsType<OkObjectResult>(result);
        Assert.False(await _db.Users.AnyAsync(u => u.Id == user.Id));
    }

    [Fact]
    public async Task Delete_CannotDeleteSelf()
    {
        var user = await CreateUserAsync("user1");
        SetPrincipal(user.Id);

        var result = await _controller.Delete(user.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Delete_CannotDeleteLastAdmin()
    {
        var admin = await CreateUserAsync("admin", role: UserRoles.Admin);
        SetPrincipal(999);

        var result = await _controller.Delete(admin.Id);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}