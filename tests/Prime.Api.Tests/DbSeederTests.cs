using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class DbSeederTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly PasswordHasher<AppUser> _hasher = new();

    public DbSeederTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public void Seed_CreatesAdminOnce()
    {
        DbSeeder.Seed(_db);
        DbSeeder.Seed(_db);

        var admins = _db.Users.Where(u => u.Role == UserRoles.Admin).ToList();
        Assert.Single(admins);
        Assert.Equal("admin", admins[0].Username);
        Assert.NotNull(admins[0].PasswordHash);
    }

    [Fact]
    public void Seed_AdminPassword_Verifies()
    {
        DbSeeder.Seed(_db);

        var admin = _db.Users.Single(u => u.Username == "admin");
        var result = _hasher.VerifyHashedPassword(admin, admin.PasswordHash, "wrong");
        Assert.Equal(PasswordVerificationResult.Failed, result);
    }

    [Fact]
    public void Seed_WithEnvVarOnly_DoesNotOverwriteExistingAdminPassword()
    {
        DbSeeder.Seed(_db);
        var before = _db.Users.Single(u => u.Username == "admin").PasswordHash;

        Environment.SetEnvironmentVariable(DbSeeder.AdminPasswordEnvVar, "LingeringPass123");
        try
        {
            DbSeeder.Seed(_db);

            var admin = _db.Users.Single(u => u.Username == "admin");
            Assert.Equal(before, admin.PasswordHash);
            var result = _hasher.VerifyHashedPassword(admin, admin.PasswordHash, "LingeringPass123");
            Assert.Equal(PasswordVerificationResult.Failed, result);
        }
        finally
        {
            Environment.SetEnvironmentVariable(DbSeeder.AdminPasswordEnvVar, null);
        }
    }

    [Fact]
    public void Seed_WithEnvVarAndResetFlag_ResetsExistingAdminPassword()
    {
        Environment.SetEnvironmentVariable(DbSeeder.AdminPasswordEnvVar, "RecoveryPass123");
        Environment.SetEnvironmentVariable(DbSeeder.AdminResetEnvVar, "1");
        try
        {
            DbSeeder.Seed(_db);
            DbSeeder.Seed(_db);

            var admin = _db.Users.Single(u => u.Username == "admin");
            var result = _hasher.VerifyHashedPassword(admin, admin.PasswordHash, "RecoveryPass123");
            Assert.NotEqual(PasswordVerificationResult.Failed, result);
        }
        finally
        {
            Environment.SetEnvironmentVariable(DbSeeder.AdminPasswordEnvVar, null);
            Environment.SetEnvironmentVariable(DbSeeder.AdminResetEnvVar, null);
        }
    }
}