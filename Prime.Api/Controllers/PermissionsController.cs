using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/permissions")]
[Authorize(Roles = "Admin")]
public class PermissionsController : ControllerBase
{
    private readonly PrimeDbContext _db;
    private readonly PermissionService _permService;

    public PermissionsController(PrimeDbContext db, PermissionService permService)
    {
        _db = db;
        _permService = permService;
    }

    [HttpGet("matrix")]
    public async Task<ActionResult<PermissionMatrixDto>> GetMatrix()
    {
        var allPermissions = await _db.Permissions.OrderBy(p => p.Category).ThenBy(p => p.Key).ToListAsync();
        var rolePermissions = await _db.RolePermissions
            .Include(rp => rp.Permission)
            .ToListAsync();

        var roleRows = new List<RolePermissionDto>();

        foreach (var role in UserRoles.All)
        {
            var cells = new List<PermissionCellDto>();
            foreach (var p in allPermissions)
            {
                var granted = rolePermissions
                    .Where(rp => rp.Role == role && rp.PermissionId == p.Id)
                    .Select(rp => rp.IsGranted)
                    .FirstOrDefault();
                
                cells.Add(new PermissionCellDto(p.Id, p.Key, granted));
            }
            
            roleRows.Add(new RolePermissionDto(role, cells));
        }

        var permissionDtos = allPermissions.Select(p => new PermissionDto(p.Id, p.Key, p.Description, p.Category)).ToList();

        return Ok(new PermissionMatrixDto(roleRows, permissionDtos));
    }

    [HttpPut("role/{role}")]
    public async Task<IActionResult> UpdateRolePermissions(string role, [FromBody] UpdateRolePermissionsRequest request)
    {
        if (!UserRoles.All.Contains(role)) return BadRequest("Invalid role");

        foreach (var perm in request.Permissions)
        {
            var rp = await _db.RolePermissions
                .FirstOrDefaultAsync(rp => rp.Role == role && rp.PermissionId == perm.PermissionId);

            if (rp == null)
            {
                _db.RolePermissions.Add(new RolePermission { Role = role, PermissionId = perm.PermissionId, IsGranted = perm.IsGranted });
            }
            else
            {
                rp.IsGranted = perm.IsGranted;
            }
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("user/{userId:int}")]
    public async Task<IActionResult> UpdateUserPermissions(int userId, [FromBody] UpdateUserPermissionsRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found");

        foreach (var perm in request.Permissions)
        {
            var up = await _db.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.PermissionId == perm.PermissionId);

            if (up == null)
            {
                _db.UserPermissions.Add(new UserPermission { UserId = userId, PermissionId = perm.PermissionId, IsGranted = perm.IsGranted });
            }
            else
            {
                up.IsGranted = perm.IsGranted;
            }
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("my-permissions")]
    public async Task<ActionResult<List<string>>> GetMyPermissions()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var perms = await _permService.GetEffectivePermissionsAsync(userId);
        return Ok(perms.ToList());
    }
}