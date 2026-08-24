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
        db.Database.Migrate();
        SeedAdminUser(db);
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
            PasswordHash = hasher.HashPassword(new AppUser(), password),
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