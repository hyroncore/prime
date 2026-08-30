using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Prime.Api.Data;

namespace Prime.Api.Authorization;

public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly PrimeDbContext _db;
    private readonly IHttpContextAccessor _httpContext;

    public PermissionHandler(PrimeDbContext db, IHttpContextAccessor httpContext)
    {
        _db = db;
        _httpContext = httpContext;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var userId = _httpContext.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return;

        var permissions = await GetEffectivePermissionsAsync(int.Parse(userId));

        if (permissions.Contains(requirement.PermissionKey))
            context.Succeed(requirement);
    }

    private async Task<HashSet<string>> GetEffectivePermissionsAsync(int userId)
    {
        var perms = new HashSet<string>();

        // Role permissions
        var rolePerms = await _db.RolePermissions
            .Where(rp => rp.IsGranted)
            .Include(rp => rp.Permission)
            .Join(_db.Users.Where(u => u.Id == userId), rp => rp.Role, u => u.Role, (rp, u) => rp.Permission.Key)
            .ToListAsync();

        // User overrides
        var userPerms = await _db.UserPermissions
            .Where(up => up.UserId == userId)
            .Include(up => up.Permission)
            .Select(up => new { up.Permission.Key, up.IsGranted })
            .ToListAsync();

        foreach (var p in rolePerms) perms.Add(p);
        foreach (var p in userPerms)
        {
            if (p.IsGranted) perms.Add(p.Key);
            else perms.Remove(p.Key);
        }

        return perms;
    }
}