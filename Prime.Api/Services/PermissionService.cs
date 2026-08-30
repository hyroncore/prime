using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class PermissionService
{
    private readonly PrimeDbContext _db;

    public PermissionService(PrimeDbContext db)
    {
        _db = db;
    }

    public async Task<List<Permission>> GetAllPermissionsAsync()
    {
        return await _db.Permissions.OrderBy(p => p.Category).ThenBy(p => p.Key).ToListAsync();
    }

    public async Task<Dictionary<string, List<string>>> GetRolePermissionsAsync()
    {
        var rolePerms = await _db.RolePermissions
            .Include(rp => rp.Permission)
            .ToListAsync();

        return _db.Users
            .Select(u => u.Role)
            .Distinct()
            .ToDictionary(
                r => r,
                r => _db.RolePermissions
                    .Where(rp => rp.Role == r && rp.IsGranted)
                    .Include(rp => rp.Permission)
                    .Select(rp => rp.Permission.Key)
                    .ToList()
            );
    }

    public async Task<HashSet<string>> GetEffectivePermissionsAsync(int userId)
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