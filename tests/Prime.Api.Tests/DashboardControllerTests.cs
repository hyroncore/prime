using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using System.Security.Claims;

namespace Prime.Api.Tests;

public class DashboardControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly DashboardController _controller;
    private readonly string _contentRoot;

    public DashboardControllerTests()
    {
        _contentRoot = Path.Combine(Path.GetTempPath(), $"prime-tests-{Guid.NewGuid():N}");
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();

        // Seed test data
        SeedTestData();

        var logger = new LoggerFactory().CreateLogger<DashboardController>();
        var controller = new DashboardController(_db, logger);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Role, "Manager")
                }))
            }
        };
        _controller = controller;
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        if (Directory.Exists(_contentRoot))
        {
            Directory.Delete(_contentRoot, recursive: true);
        }
    }

    private void SeedTestData()
    {
        // Manager (ID 1)
        var manager = new AppUser { Id = 1, Username = "manager", DisplayName = "Manager User", Role = "Manager", PasswordHash = "dummy", IsActive = true, CreatedAt = DateTime.UtcNow };
        _db.Users.Add(manager);

        // Subordinate 1 (ID 2)
        var sub1 = new AppUser { Id = 2, Username = "sub1", DisplayName = "Subordinate 1", Role = "User", PasswordHash = "dummy", IsActive = true, CreatedAt = DateTime.UtcNow, ManagerId = 1 };
        _db.Users.Add(sub1);

        // Subordinate 2 (ID 3)
        var sub2 = new AppUser { Id = 3, Username = "sub2", DisplayName = "Subordinate 2", Role = "User", PasswordHash = "dummy", IsActive = true, CreatedAt = DateTime.UtcNow, ManagerId = 1 };
        _db.Users.Add(sub2);

        // Unrelated user (ID 4)
        var unrelated = new AppUser { Id = 4, Username = "unrelated", DisplayName = "Unrelated User", Role = "User", PasswordHash = "dummy", IsActive = true, CreatedAt = DateTime.UtcNow };
        _db.Users.Add(unrelated);

        // Client and Plant - save first to get IDs
        var client = new Client { Name = "Test Client" };
        _db.Clients.Add(client);
        _db.SaveChanges();

        var plant = new Plant { PlantName = "Test Plant", ShortCode = "TP", ClientId = client.Id };
        _db.Plants.Add(plant);
        _db.SaveChanges();

        // Requisitions for sub1 (2)
        var req1 = new PurchaseRequisition { Identifier = "TP-01-0001", ExternalRef = "REF-1", PlantId = plant.Id, SectorCode = "01", Title = "Req 1", DueDate = DateTime.UtcNow.AddDays(5), Status = "REVIEW", CreatedById = 2, ReceivedAt = DateTime.UtcNow };
        var req2 = new PurchaseRequisition { Identifier = "TP-01-0002", ExternalRef = "REF-2", PlantId = plant.Id, SectorCode = "01", Title = "Req 2", DueDate = DateTime.UtcNow.AddDays(10), Status = "SUBMITTED", CreatedById = 2, ReceivedAt = DateTime.UtcNow, SubmittedAt = DateTime.UtcNow };
        
        // Requisitions for sub2 (3)
        var req3 = new PurchaseRequisition { Identifier = "TP-01-0003", ExternalRef = "REF-3", PlantId = plant.Id, SectorCode = "01", Title = "Req 3", DueDate = DateTime.UtcNow.AddDays(3), Status = "REVIEW", CreatedById = 3, ReceivedAt = DateTime.UtcNow };
        var req4 = new PurchaseRequisition { Identifier = "TP-01-0004", ExternalRef = "REF-4", PlantId = plant.Id, SectorCode = "01", Title = "Req 4", DueDate = DateTime.UtcNow.AddDays(7), Status = "APPROVED", CreatedById = 3, ReceivedAt = DateTime.UtcNow };
        
        // Requisition for unrelated user (4) - should NOT appear
        var req5 = new PurchaseRequisition { Identifier = "TP-01-0005", ExternalRef = "REF-5", PlantId = plant.Id, SectorCode = "01", Title = "Req 5", DueDate = DateTime.UtcNow.AddDays(1), Status = "REVIEW", CreatedById = 4, ReceivedAt = DateTime.UtcNow };
        
        // Won/Lost for win rate calculation
        var reqWon = new PurchaseRequisition { Identifier = "TP-01-0006", ExternalRef = "REF-6", PlantId = plant.Id, SectorCode = "01", Title = "Req Won", DueDate = DateTime.UtcNow.AddDays(-10), Status = "WON", CreatedById = 2, ReceivedAt = DateTime.UtcNow.AddDays(-20) };
        var reqLost = new PurchaseRequisition { Identifier = "TP-01-0007", ExternalRef = "REF-7", PlantId = plant.Id, SectorCode = "01", Title = "Req Lost", DueDate = DateTime.UtcNow.AddDays(-5), Status = "LOST", CreatedById = 3, ReceivedAt = DateTime.UtcNow.AddDays(-15) };

        _db.PurchaseRequisitions.AddRange(req1, req2, req3, req4, req5, reqWon, reqLost);
        _db.SaveChanges();
    }

    private static ManagerDashboardStatsDto Dto(ActionResult<ManagerDashboardStatsDto> result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        var value = objectResult.Value;
        if (value is ManagerDashboardStatsDto dto)
            return dto;
        
        // Debug: print the actual type and value
        var json = System.Text.Json.JsonSerializer.Serialize(value);
        System.Console.WriteLine($"DEBUG: Actual type: {value.GetType()}, Value: {json}");
        throw new InvalidOperationException($"Expected ManagerDashboardStatsDto but got {value.GetType()}: {json}");
    }

    [Fact]
    public async Task GetManagerStats_ReturnsCorrectPendingReviewCount()
    {
        // Arrange: 2 REVIEW from subordinates (req1, req3), 1 from unrelated (req5 - should be excluded)
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        Assert.Equal(2, dto.PendingReview); // Only subordinates' REVIEW
        Assert.Contains(dto.PendingReviews, r => r.Identifier == "TP-01-0001");
        Assert.Contains(dto.PendingReviews, r => r.Identifier == "TP-01-0003");
        Assert.DoesNotContain(dto.PendingReviews, r => r.Identifier == "TP-01-0005");
    }

    [Fact]
    public async Task GetManagerStats_ReturnsCorrectPendingSignOffCount()
    {
        // Arrange: 1 SUBMITTED from subordinates (req2)
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        Assert.Equal(1, dto.PendingSignOff); // Only subordinates' SUBMITTED
        Assert.Contains(dto.PendingSignOffs, r => r.Identifier == "TP-01-0002");
    }

    [Fact]
    public async Task GetManagerStats_ReturnsCorrectTeamVolume()
    {
        // TeamVolume = REVIEW + SUBMITTED from subordinates = 3
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        Assert.Equal(3, dto.TeamVolume); // req1 (REVIEW) + req2 (SUBMITTED) + req3 (REVIEW)
    }

    [Fact]
    public async Task GetManagerStats_ReturnsCorrectWinRate()
    {
        // Won: 1 (reqWon from sub1), Lost: 1 (reqLost from sub2) = 50%
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        Assert.Equal(1, dto.WonCount);
        Assert.Equal(1, dto.LostCount);
        Assert.Equal(50.0, dto.TeamWinRate);
    }

    [Fact]
    public async Task GetManagerStats_ExcludesUnrelatedUsersRequisitions()
    {
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        // req5 from unrelated user should not appear in any list
        Assert.DoesNotContain(dto.PendingReviews, r => r.Identifier == "TP-01-0005");
        Assert.DoesNotContain(dto.PendingSignOffs, r => r.Identifier == "TP-01-0005");
        
        // Team volume should only count subordinates
        Assert.Equal(3, dto.TeamVolume); // Not 4 (would include unrelated's REVIEW)
    }

    [Fact]
    public async Task GetManagerStats_TeamPerformance_IncludesCorrectMemberStats()
    {
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        Assert.Equal(2, dto.TeamPerformance.Count); // Only 2 subordinates

        var sub1Perf = dto.TeamPerformance.FirstOrDefault(p => p.DisplayName == "Subordinate 1");
        var sub2Perf = dto.TeamPerformance.FirstOrDefault(p => p.DisplayName == "Subordinate 2");

        Assert.NotNull(sub1Perf);
        Assert.NotNull(sub2Perf);

        // Sub1: 1 REVIEW (req1) + 1 SUBMITTED (req2) = 2 open, 1 WON, 0 LOST = 100% win rate
        Assert.Equal(2, sub1Perf.OpenRequisitions);
        Assert.Equal(1, sub1Perf.SubmittedCount);
        Assert.Equal(1, sub1Perf.WonCount);
        Assert.Equal(100.0, sub1Perf.WinRate);

        // Sub2: 1 REVIEW (req3), 0 SUBMITTED, 0 WON, 1 LOST = 0% win rate
        Assert.Equal(1, sub2Perf.OpenRequisitions);
        Assert.Equal(0, sub2Perf.SubmittedCount);
        Assert.Equal(0, sub2Perf.WonCount);
        Assert.Equal(0.0, sub2Perf.WinRate);
    }

    [Fact]
    public async Task GetManagerStats_OverdueCalculation_WorksCorrectly()
    {
        // Add an overdue REVIEW requisition for sub1
        var plant = _db.Plants.First();
        var overdueReq = new PurchaseRequisition 
        { 
            Identifier = "TP-01-0008", 
            ExternalRef = "REF-8", 
            PlantId = plant.Id, 
            SectorCode = "01", 
            Title = "Overdue Req", 
            DueDate = DateTime.UtcNow.AddDays(-2), // 2 days ago
            Status = "REVIEW", 
            CreatedById = 2, 
            ReceivedAt = DateTime.UtcNow.AddDays(-10) 
        };
        _db.PurchaseRequisitions.Add(overdueReq);
        await _db.SaveChangesAsync();

        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        // Should have 1 overdue in pendingReviews
        Assert.Contains(dto.PendingReviews, r => r.Identifier == "TP-01-0008" && r.DaysLeft < 0);
    }

    [Fact]
    public async Task GetManagerStats_AdminSeesAllActionableRequisitions()
    {
        // Change controller to admin
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Role, "Admin")
                }))
            }
        };

        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        // Admin should see all actionable (REVIEW + SUBMITTED) from all users
        // Total: req1(REVIEW) + req2(SUBMITTED) + req3(REVIEW) + req5(REVIEW) = 4
        Assert.Equal(4, dto.TeamVolume);
        Assert.Equal(3, dto.PendingReview); // req1, req3, req5
        Assert.Equal(1, dto.PendingSignOff); // req2
    }

    [Fact]
    public async Task GetManagerStats_PendingReviewsSortedByDueDate()
    {
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        var dueDates = dto.PendingReviews.Select(r => r.DueDate).ToList();
        var sorted = dueDates.OrderBy(d => d).ToList();
        
        Assert.Equal(sorted, dueDates);
    }

    [Fact]
    public async Task GetManagerStats_PendingSignOffsSortedBySubmittedAt()
    {
        var result = await _controller.GetManagerStats();
        var dto = Dto(result);

        var submittedDates = dto.PendingSignOffs.Select(r => r.SubmittedAt).ToList();
        var sorted = submittedDates.OrderBy(d => d).ToList();
        
        Assert.Equal(sorted, submittedDates);
    }
}