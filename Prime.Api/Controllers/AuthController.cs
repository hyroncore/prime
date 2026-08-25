using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly PrimeDbContext _db;
    private readonly TokenService _tokens;
    private readonly LoginThrottle _throttle;
    private readonly IPasswordHasher<AppUser> _hasher = new PasswordHasher<AppUser>();

    public AuthController(PrimeDbContext db, TokenService tokens, LoginThrottle throttle)
    {
        _db = db;
        _tokens = tokens;
        _throttle = throttle;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "يرجى إدخال اسم المستخدم وكلمة المرور" });
            }

            var username = request.Username.Trim();
            if (_throttle.LockedUntil(username) is { } until)
            {
                var minutes = Math.Max(1, (int)Math.Ceiling((until - DateTimeOffset.UtcNow).TotalMinutes));
                return StatusCode(
                    StatusCodes.Status429TooManyRequests,
                    new { message = $"تم إيقاف المحاولات مؤقتاً — حاول مرة أخرى بعد {minutes} دقيقة" });
            }

            var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == username);
            var valid = user is not null
                && user.IsActive
                && _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password)
                    != PasswordVerificationResult.Failed;

            if (user is null || !valid)
            {
                _throttle.RegisterFailure(username);
                return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
            }

            _throttle.Reset(username);
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = _tokens.CreateToken(user);
            return Ok(new LoginResponse(token, ToDto(user)));
        }
        catch (Exception ex)
        {
            // Log the actual error for debugging
            return StatusCode(500, new { message = "حدث خطأ أثناء تسجيل الدخول", error = ex.Message });
        }
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await CurrentUserAsync();
        if (user is null) return Unauthorized();
        return Ok(ToDto(user));
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await CurrentUserAsync();
        if (user is null) return Unauthorized();

        if (!IsValidPassword(request.NewPassword))
        {
            return BadRequest(new { message = "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف" });
        }

        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword ?? string.Empty)
            == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "كلمة المرور الحالية غير صحيحة" });
        }

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "تم تغيير كلمة المرور بنجاح" });
    }

    private async Task<AppUser?> CurrentUserAsync()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(idClaim, out var userId)) return null;
        var user = await _db.Users.FindAsync(userId);
        return user is { IsActive: true } ? user : null;
    }

    public static bool IsValidPassword(string? password) =>
        !string.IsNullOrWhiteSpace(password) && password.Length >= 8;

    public static UserDto ToDto(AppUser user) => new(
        user.Id,
        user.Username,
        user.DisplayName,
        user.Role,
        user.IsActive,
        user.CreatedAt,
        user.LastLoginAt);
}