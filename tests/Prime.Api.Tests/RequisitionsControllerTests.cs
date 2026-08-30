using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using System.Security.Claims;

namespace Prime.Api.Tests;

public class RequisitionsControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly RequisitionsController _controller;
    private readonly string _contentRoot;

    public RequisitionsControllerTests()
    {
        _contentRoot = Path.Combine(Path.GetTempPath(), $"prime-tests-{Guid.NewGuid():N}");
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();
        
        // Seed test user with ID 1
        _db.Users.Add(new AppUser { Id = 1, Username = "testuser", DisplayName = "Test User", Role = "User", PasswordHash = "dummy", IsActive = true, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();
        
        var controller = new RequisitionsController(_db, new FakeEnvironment(_contentRoot));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Role, "User")
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

    private async Task<int> SeedClientAndPlantAsync(string shortCode = "TT")
    {
        var client = new Client { Name = "جهة اختبار" };
        var plant = new Plant
        {
            PlantName = "مصنع اختبار",
            ShortCode = shortCode,
            Client = client,
        };
        client.Plants.Add(plant);
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();
        return plant.Id;
    }

    private static CreateRequisitionRequest ValidRequest(int plantId, string externalRef = "SL75-2026") => new(
        externalRef,
        plantId,
        "03",
        "توريد قطع غيار",
        new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
        null);

    private static RequisitionDto Dto(ActionResult<RequisitionDto> result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        return Assert.IsType<RequisitionDto>(objectResult.Value);
    }

    private static string ErrorMessage(ActionResult<RequisitionDto> result)
    {
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var value = badRequest.Value!;
        var property = value.GetType().GetProperty("message");
        Assert.NotNull(property);
        return (string?)property.GetValue(value) ?? string.Empty;
    }

    // ---------- Create ----------

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedWithIdentifierAndAuditLog()
    {
        var plantId = await SeedClientAndPlantAsync();

        var result = await _controller.Create(ValidRequest(plantId));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<RequisitionDto>(created.Value);
        Assert.Equal("TT-03-0001", dto.Identifier);
        Assert.Equal("NEW", dto.Status);
        Assert.Equal("03", dto.SectorCode);
        Assert.Equal("SL75-2026", dto.ExternalRef);
        Assert.NotEmpty(dto.SectorName);

        var logs = await _db.RequisitionAuditLogs.ToListAsync();
        var log = Assert.Single(logs);
        Assert.Equal(dto.Id, log.RequisitionId);
        Assert.Equal("Created", log.Action);
        Assert.Equal("NEW", log.StatusTo);
    }

    [Fact]
    public async Task Create_InvalidPlant_ReturnsBadRequest()
    {
        var result = await _controller.Create(ValidRequest(plantId: 999));

        Assert.Equal("Invalid plant.", ErrorMessage(result));
    }

    [Fact]
    public async Task Create_SetsReceivedAt()
    {
        var plantId = await SeedClientAndPlantAsync();
        var received = new DateTime(2026, 7, 5, 0, 0, 0, DateTimeKind.Utc);
        var request = ValidRequest(plantId) with { ReceivedAt = received };

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<RequisitionDto>(created.Value);
        Assert.Equal(received, dto.ReceivedAt);
    }

    [Fact]
    public async Task Create_DefaultsReceivedAtToNow()
    {
        var plantId = await SeedClientAndPlantAsync();

        var result = await _controller.Create(ValidRequest(plantId));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<RequisitionDto>(created.Value);
        Assert.Equal(DateTime.UtcNow.Date, dto.ReceivedAt.Date);
    }

    [Fact]
    public async Task Create_InvalidSector_ReturnsBadRequestWithArabicMessage()
    {
        var plantId = await SeedClientAndPlantAsync();
        var request = ValidRequest(plantId) with { SectorCode = "99" };

        var result = await _controller.Create(request);

        Assert.Contains("قسم غير صالح", ErrorMessage(result));
    }

    [Fact]
    public async Task Create_MissingTitle_ReturnsBadRequest()
    {
        var plantId = await SeedClientAndPlantAsync();
        var request = ValidRequest(plantId) with { Title = "  " };

        var result = await _controller.Create(request);

        Assert.Equal("Title is required.", ErrorMessage(result));
    }

    [Fact]
    public async Task Create_SamePlantAndSector_IncrementsSequence()
    {
        var plantId = await SeedClientAndPlantAsync();

        var first = Dto(await _controller.Create(ValidRequest(plantId)));
        var second = Dto(await _controller.Create(ValidRequest(plantId, "REF-2")));

        Assert.Equal("TT-03-0001", first.Identifier);
        Assert.Equal("TT-03-0002", second.Identifier);
    }

    [Fact]
    public async Task Create_DifferentSectors_HaveSeparateSequences()
    {
        var plantId = await SeedClientAndPlantAsync();
        var sector05 = ValidRequest(plantId) with { SectorCode = "05" };

        var first = Dto(await _controller.Create(ValidRequest(plantId)));
        var second = Dto(await _controller.Create(sector05));

        Assert.Equal("TT-03-0001", first.Identifier);
        Assert.Equal("TT-05-0001", second.Identifier);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_SectorChange_RegeneratesIdentifier()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));

        var request = new UpdateRequisitionRequest(
            "REF-UPDATED",
            plantId,
            "05",
            "عنوان محدث",
            new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            "ملاحظات جديدة");

        var result = await _controller.Update(created.Id, request);

        var updated = Dto(result);
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("REF-UPDATED", updated.ExternalRef);
        Assert.Equal("05", updated.SectorCode);
        Assert.Equal("عنوان محدث", updated.Title);
        Assert.Equal("ملاحظات جديدة", updated.ClientNotes);
        Assert.NotEqual(created.Identifier, updated.Identifier);
        Assert.StartsWith("TT-05-", updated.Identifier);
    }

    [Fact]
    public async Task Update_SameSector_KeepsIdentifier()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));

        var request = new UpdateRequisitionRequest(
            "REF-UPDATED",
            plantId,
            created.SectorCode,
            "عنوان محدث",
            new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            null);

        var result = await _controller.Update(created.Id, request);

        var updated = Dto(result);
        Assert.Equal(created.Identifier, updated.Identifier);

        var logs = await _db.RequisitionAuditLogs.OrderBy(l => l.Id).ToListAsync();
        Assert.Equal(2, logs.Count);
        Assert.Equal("Updated", logs[1].Action);
    }

    [Fact]
    public async Task Update_InvalidPlant_ReturnsBadRequest()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));
        var request = ValidRequest(plantId) with { PlantId = 999 };
        var updateRequest = new UpdateRequisitionRequest(
            request.ExternalRef,
            request.PlantId,
            request.SectorCode,
            request.Title,
            request.DueDate,
            request.ClientNotes);

        var result = await _controller.Update(created.Id, updateRequest);

        Assert.Equal("Invalid plant.", ErrorMessage(result));
    }

    [Fact]
    public async Task Update_NotFound_ReturnsNotFound()
    {
        var plantId = await SeedClientAndPlantAsync();
        var request = ValidRequest(plantId);
        var updateRequest = new UpdateRequisitionRequest(
            request.ExternalRef,
            request.PlantId,
            request.SectorCode,
            request.Title,
            request.DueDate,
            request.ClientNotes);

        var result = await _controller.Update(id: 12345, updateRequest);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_Existing_ReturnsNoContentAndRemovesRequisitionWithLogs()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));

        var result = await _controller.Delete(created.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await _db.PurchaseRequisitions.FindAsync(created.Id));
        Assert.Empty(await _db.RequisitionAuditLogs.ToListAsync());
    }

    [Fact]
    public async Task Delete_NotFound_ReturnsNotFound()
    {
        var result = await _controller.Delete(id: 12345);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WithAttachments_RemovesRowsAndFilesFromDisk()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));

        var folder = Path.Combine(_contentRoot, "uploads", "requisitions", created.Id.ToString());
        Directory.CreateDirectory(folder);
        var filePath = Path.Combine(folder, "stored.pdf");
        await File.WriteAllTextAsync(filePath, "content");

        _db.RequisitionAttachments.Add(new RequisitionAttachment
        {
            RequisitionId = created.Id,
            FileName = "spec.pdf",
            StoredFileName = "stored.pdf",
            ContentType = "application/pdf",
            SizeBytes = 7,
        });
        await _db.SaveChangesAsync();

        var result = await _controller.Delete(created.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(await _db.RequisitionAttachments.ToListAsync());
        Assert.False(File.Exists(filePath));
    }

    // ---------- Read (supporting add/edit/delete flows) ----------

    [Fact]
    public async Task GetById_ReturnsAuditLogs()
    {
        var plantId = await SeedClientAndPlantAsync();
        var created = Dto(await _controller.Create(ValidRequest(plantId)));

        var result = await _controller.GetById(created.Id);

        var dto = Dto(result);
        Assert.Equal(created.Identifier, dto.Identifier);
        var log = Assert.Single(dto.AuditLogs!);
        Assert.Equal("Created", log.Action);
    }

    // ---------- Stats / overdue boundary ----------

    [Fact]
    public async Task Stats_RequisitionDueToday_IsNotOverdue()
    {
        var plantId = await SeedClientAndPlantAsync();
        var dueToday = new DateTime(
            DateTime.UtcNow.Date.Year,
            DateTime.UtcNow.Date.Month,
            DateTime.UtcNow.Date.Day,
            0, 0, 0, DateTimeKind.Utc);
        var request = ValidRequest(plantId) with { DueDate = dueToday };
        await _controller.Create(request);

        var result = await _controller.Stats();
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        var stats = Assert.IsType<RequisitionStatsDto>(objectResult.Value);

        Assert.Equal(0, stats.OverdueCount);
    }

    [Fact]
    public async Task Stats_RequisitionDueYesterday_IsOverdue()
    {
        var plantId = await SeedClientAndPlantAsync();
        var dueYesterday = new DateTime(
            DateTime.UtcNow.Date.AddDays(-1).Year,
            DateTime.UtcNow.Date.AddDays(-1).Month,
            DateTime.UtcNow.Date.AddDays(-1).Day,
            0, 0, 0, DateTimeKind.Utc);
        var request = ValidRequest(plantId) with { DueDate = dueYesterday };
        await _controller.Create(request);

        var result = await _controller.Stats();
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        var stats = Assert.IsType<RequisitionStatsDto>(objectResult.Value);

        Assert.Equal(1, stats.OverdueCount);
    }

    private sealed class FakeEnvironment : IWebHostEnvironment
    {
        public FakeEnvironment(string contentRoot)
        {
            ContentRootPath = contentRoot;
            WebRootPath = contentRoot;
        }

        public string ApplicationName { get; set; } = "Prime.Api.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; }
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}