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
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly PrimeDbContext _db;
    private readonly IPasswordHasher<AppUser> _hasher = new PasswordHasher<AppUser>();

    public UsersController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> List() =>
        Ok(await _db.Users.OrderBy(u => u.Id).Select(u => ToDto(u)).ToListAsync());

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request)
    {
        var username = request.Username?.Trim() ?? string.Empty;
        var displayName = request.DisplayName?.Trim() ?? string.Empty;

        if (username.Length == 0 || displayName.Length == 0)
        {
            return BadRequest(new { message = "يرجى إدخال اسم المستخدم واسم العرض" });
        }

        var role = ValidRole(request.Role);
        if (role is null)
        {
            return BadRequest(new { message = "دور غير صالح — الأدوار المتاحة: Admin, User" });
        }

        if (!AuthController.IsValidPassword(request.InitialPassword))
        {
            return BadRequest(new { message = "كلمة المرور الابتدائية يجب ألا تقل عن 8 أحرف" });
        }

        if (await _db.Users.AnyAsync(u => u.Username == username))
        {
            return Conflict(new { message = "اسم المستخدم مستخدم بالفعل" });
        }

        var user = new AppUser
        {
            Username = username,
            DisplayName = displayName,
            Role = role,
            PasswordHash = _hasher.HashPassword(new AppUser(), request.InitialPassword),
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "المستخدم غير موجود" });

        var role = ValidRole(request.Role);
        if (role is null)
        {
            return BadRequest(new { message = "دور غير صالح — الأدوار المتاحة: Admin, User" });
        }

        var currentId = CurrentUserId();
        var demotingOrDeactivatingSelf = currentId == id
            && (role != UserRoles.Admin || !request.IsActive);
        if (demotingOrDeactivatingSelf)
        {
            return BadRequest(new { message = "لا يمكنك تعديل دورك أو تعطيل حسابك" });
        }

        if (!await CanRemoveAdminAsync(user, deactivated: !request.IsActive, role))
        {
            return BadRequest(new { message = "لا يمكن تعديل آخر مسؤول نشط في النظام" });
        }

        user.DisplayName = request.DisplayName?.Trim() ?? user.DisplayName;
        user.Role = role;
        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, ResetPasswordRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "المستخدم غير موجود" });

        if (!AuthController.IsValidPassword(request.NewPassword))
        {
            return BadRequest(new { message = "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف" });
        }

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "تمت إعادة تعيين كلمة المرور بنجاح" });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "المستخدم غير موجود" });

        if (CurrentUserId() == id)
        {
            return BadRequest(new { message = "لا يمكنك حذف حسابك الحالي" });
        }

        if (!await CanRemoveAdminAsync(user, deactivated: true, role: null))
        {
            return BadRequest(new { message = "لا يمكن حذف آخر مسؤول نشط في النظام" });
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return Ok(new { message = "تم حذف المستخدم بنجاح" });
    }

    private int? CurrentUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out var id) ? id : null;
    }

    private async Task<bool> CanRemoveAdminAsync(AppUser user, bool deactivated, string? role)
    {
        if (user.Role != UserRoles.Admin) return true;
        var isStillAdmin = role is null || role == UserRoles.Admin;
        if (isStillAdmin && !deactivated) return true;

        var otherActiveAdmins = await _db.Users.CountAsync(u =>
            u.Role == UserRoles.Admin && u.IsActive && u.Id != user.Id);
        return otherActiveAdmins > 0;
    }

    private static string? ValidRole(string? role) =>
        UserRoles.All.Contains(role) ? role : null;

    public static UserDto ToDto(AppUser user) => new(
        user.Id,
        user.Username,
        user.DisplayName,
        user.Role,
        user.IsActive,
        user.CreatedAt,
        user.LastLoginAt);
}