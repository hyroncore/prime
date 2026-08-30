using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Data;

public static class DbSeeder
{
    public const string AdminPasswordEnvVar = "PRIME_ADMIN_PASSWORD";
    public const string AdminResetEnvVar = "PRIME_RESET_ADMIN";

    public static void Seed(PrimeDbContext db)
    {
        // For test databases (in-memory SQLite), use EnsureCreated
        // For production databases with migrations, use Migrate
        var isSqlite = db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true;
        var pendingMigrations = db.Database.GetPendingMigrations().Any();
        
        if (isSqlite && !db.Database.CanConnect())
        {
            db.Database.EnsureCreated();
        }
        else if (!isSqlite && db.Database.GetPendingMigrations().Any())
        {
            db.Database.Migrate();
        }
        else
        {
            db.Database.EnsureCreated();
        }
        
        SeedAdminUser(db);
        SeedPermissions(db);
    }

    private static void SeedAdminUser(PrimeDbContext db)
    {
        var overridePassword = Environment.GetEnvironmentVariable(AdminPasswordEnvVar);
        var resetRequested = Environment.GetEnvironmentVariable(AdminResetEnvVar) == "1";
        var admin = db.Users.SingleOrDefault(u => u.Username == "admin");
        var hasher = new PasswordHasher<AppUser>();

        if (admin is not null)
        {
            if (!string.IsNullOrEmpty(overridePassword) && resetRequested)
            {
                admin.PasswordHash = hasher.HashPassword(admin, overridePassword);
                db.SaveChanges();
                Console.WriteLine("=============================================");
                Console.WriteLine("تمت إعادة تعيين كلمة مرور المسؤول (PRIME_ADMIN_PASSWORD):");
                Console.WriteLine($"  اسم المستخدم: {admin.Username}");
                Console.WriteLine($"  كلمة المرور : {overridePassword}");
                Console.WriteLine("=============================================");
            }
            else if (!string.IsNullOrEmpty(overridePassword))
            {
                Console.WriteLine("[تحذير] PRIME_ADMIN_PASSWORD مضبوطة لكن PRIME_RESET_ADMIN=1 غير مضبوط —");
                Console.WriteLine("         تم تجاهل إعادة التعيين حتى لا تُستبدل كلمة مرور المسؤول الحالية.");
            }
            return;
        }

        var password = !string.IsNullOrEmpty(overridePassword)
            ? overridePassword
            : GeneratePassword(14);
        var user = new AppUser
        {
            Username = "admin",
            DisplayName = "مدير النظام",
            Role = UserRoles.Admin,
            PasswordHash = new PasswordHasher<AppUser>().HashPassword(new AppUser(), password),
        };

        db.Users.Add(user);
        db.SaveChanges();

        Console.WriteLine("=============================================");
        Console.WriteLine("تم إنشاء حساب المسؤول الأول:");
        Console.WriteLine($"  اسم المستخدم: {user.Username}");
        Console.WriteLine($"  كلمة المرور : {password}");
        Console.WriteLine("يرجى تغيير كلمة المرور بعد أول تسجيل دخول.");
        Console.WriteLine("=============================================");
    }

    private static void SeedPermissions(PrimeDbContext db)
    {
        var permissions = new List<Permission>
        {
            // Requisition permissions
            new() { Key = "req:create", Description = "Create new requisition draft", Category = "requisition" },
            new() { Key = "req:edit", Description = "Edit requisition details", Category = "requisition" },
            new() { Key = "req:delete", Description = "Hard delete requisition (NEW state only)", Category = "requisition" },
            new() { Key = "req:submit_review", Description = "Submit for review (NEW → REVIEW)", Category = "requisition" },
            new() { Key = "req:review_action", Description = "Review action (REVIEW → PROCESSING/DECLINED)", Category = "requisition" },
            new() { Key = "req:request_submit", Description = "Request internal sign-off (PROCESSING → SUBMITTED)", Category = "requisition" },
            new() { Key = "req:approve_internal", Description = "Internal sign-off (SUBMITTED → APPROVED)", Category = "requisition" },
            new() { Key = "req:request_revision", Description = "Request revision (SUBMITTED → REVISE)", Category = "requisition" },
            new() { Key = "req:mark_outcome", Description = "Record client outcome (WON/LOST)", Category = "requisition" },
            
            // Admin
            new() { Key = "admin:manage_system", Description = "Manage users and permission matrix", Category = "admin" },
        };

        foreach (var perm in permissions)
        {
            if (!db.Permissions.Any(p => p.Key == perm.Key))
            {
                db.Permissions.Add(perm);
            }
        }
        db.SaveChanges();

        // Seed default role permissions
        var defaults = new Dictionary<string, string[]>
        {
            ["Admin"] = new[] { "admin:manage_system", "req:create", "req:edit", "req:delete", "req:submit_review", "req:review_action", "req:request_submit", "req:approve_internal", "req:request_revision", "req:mark_outcome" },
            ["Manager"] = new[] { "req:review_action", "req:approve_internal", "req:request_revision" },
            ["User"] = new[] { "req:create", "req:edit", "req:submit_review", "req:request_submit", "req:mark_outcome" }
        };

        foreach (var (role, perms) in defaults)
        {
            foreach (var permKey in perms)
            {
                var perm = db.Permissions.First(p => p.Key == permKey);
                if (!db.RolePermissions.Any(rp => rp.Role == role && rp.PermissionId == perm.Id))
                {
                    db.RolePermissions.Add(new RolePermission { Role = role, PermissionId = perm.Id, IsGranted = true });
                }
            }
        }
        db.SaveChanges();
    }

    private const string Alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";

    private static string GeneratePassword(int length)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        }
        return new string(chars);
    }
}