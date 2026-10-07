using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Services;
using System.Security.Claims;

namespace Prime.Api.Tests;

public sealed class AdminControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly AdminController _controller;

    public AdminControllerTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();

        var loggerFactory = new LoggerFactory();
        var logger = loggerFactory.CreateLogger<AdminController>();
        _controller = new AdminController(
            _db,
            new DatabaseBackupService(_db, loggerFactory.CreateLogger<DatabaseBackupService>()),
            logger,
            new ConfigurationBuilder().Build())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.Role, "Admin") },
                        "test"))
                }
            }
        };
    }

    [Fact]
    public async Task GetSystemHealth_ReturnsTableCountsFromSingleRawAggregate()
    {
        var result = await _controller.GetSystemHealth();

        var health = Assert.IsType<SystemHealthDto>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(0, health.TableCounts.Users);
        Assert.Equal(0, health.TableCounts.ActiveUsers);
        Assert.Equal(0, health.TableCounts.Clients);
        Assert.Equal(0, health.TableCounts.Requisitions);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
