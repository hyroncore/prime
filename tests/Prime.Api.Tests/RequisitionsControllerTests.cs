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
using Prime.Api.Services;
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

        _controller = new RequisitionsController(_db, new FakeEnvironment(_contentRoot))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1"),
                        new Claim(ClaimTypes.Role, "User")
                    }))
                }
            }
        };
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

    private void SetCurrentUser(int userId, string role)
    {
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Role, role),
                }, "test"))
            }
        };
    }

    private async Task<int> SeedClientAndPlantAsync(string shortCode = "TT")
    {
        var client = new Client { Name = "جهة اختبار" };
        var plant = new Plant
        {
            Name = "مصنع اختبار",
            Code = shortCode,
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

    [Fact]
    public async Task List_FiltersByReceivedDateRange()
    {
        var plantId = await SeedClientAndPlantAsync();
        var from = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
        var insideStart = new PurchaseRequisition
        {
            Identifier = "TT-03-0001",
            ExternalRef = "REF-1",
            PlantId = plantId,
            SectorCode = "03",
            Title = "Inside start",
            DueDate = from.AddDays(10),
            ReceivedAt = from,
            Status = "REVIEW",
        };
        var insideEnd = new PurchaseRequisition
        {
            Identifier = "TT-03-0002",
            ExternalRef = "REF-2",
            PlantId = plantId,
            SectorCode = "03",
            Title = "Inside end",
            DueDate = from.AddDays(11),
            ReceivedAt = from.AddDays(1).AddHours(23),
            Status = "REVIEW",
        };
        var outside = new PurchaseRequisition
        {
            Identifier = "TT-03-0003",
            ExternalRef = "REF-3",
            PlantId = plantId,
            SectorCode = "03",
            Title = "Outside range",
            DueDate = from.AddDays(12),
            ReceivedAt = from.AddDays(2),
            Status = "REVIEW",
        };
        _db.PurchaseRequisitions.AddRange(insideStart, insideEnd, outside);
        await _db.SaveChangesAsync();

        var result = await _controller.List(from: from, to: from.AddDays(1));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var requisitions = Assert.IsType<PagedResultDto<RequisitionDto>>(ok.Value);
        Assert.Equal(
            new[] { "TT-03-0001", "TT-03-0002" },
            requisitions.Items.Select(requisition => requisition.Identifier).OrderBy(identifier => identifier));
    }

    [Fact]
    public async Task List_ReturnsRequestedPageWithTotalAndCapsPageSize()
    {
        var plantId = await SeedClientAndPlantAsync();
        var createdAt = DateTime.UtcNow;
        var rows = Enumerable.Range(1, 3).Select(index => new PurchaseRequisition
        {
            Identifier = $"TT-03-000{index}",
            ExternalRef = $"REF-{index}",
            PlantId = plantId,
            SectorCode = "03",
            Title = $"Request {index}",
            DueDate = createdAt.AddDays(index),
            CreatedAt = createdAt.AddMinutes(index),
            Status = "REVIEW",
            CreatedById = 1
        });
        _db.PurchaseRequisitions.AddRange(rows);
        await _db.SaveChangesAsync();

        var pageResult = await _controller.List(page: 2, pageSize: 1);
        var page = Assert.IsType<PagedResultDto<RequisitionDto>>(
            Assert.IsType<OkObjectResult>(pageResult.Result).Value);
        Assert.Equal(3, page.TotalCount);
        Assert.Equal(2, page.Page);
        Assert.Equal(1, page.PageSize);
        Assert.Equal("TT-03-0002", Assert.Single(page.Items).Identifier);

        var cappedResult = await _controller.List(pageSize: 500);
        var capped = Assert.IsType<PagedResultDto<RequisitionDto>>(
            Assert.IsType<OkObjectResult>(cappedResult.Result).Value);
        Assert.Equal(100, capped.PageSize);
        Assert.Equal(3, capped.Items.Count);
    }

    [Fact]
    public async Task List_AndStats_RestrictManagerToAssignedUsers()
    {
        var plantId = await SeedClientAndPlantAsync();
        _db.Users.AddRange(
            new AppUser
            {
                Id = 2,
                Username = "manager",
                DisplayName = "Manager",
                Role = "Manager",
                PasswordHash = "dummy",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AppUser
            {
                Id = 3,
                Username = "assigned",
                DisplayName = "Assigned user",
                Role = "User",
                PasswordHash = "dummy",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                ManagerId = 2
            });
        await _db.SaveChangesAsync();
        _db.PurchaseRequisitions.AddRange(
            new PurchaseRequisition
            {
                Identifier = "TT-03-0001",
                ExternalRef = "REF-1",
                PlantId = plantId,
                SectorCode = "03",
                Title = "Assigned",
                DueDate = DateTime.UtcNow.AddDays(1),
                Status = "REVIEW",
                CreatedById = 3
            },
            new PurchaseRequisition
            {
                Identifier = "TT-03-0002",
                ExternalRef = "REF-2",
                PlantId = plantId,
                SectorCode = "03",
                Title = "Unassigned",
                DueDate = DateTime.UtcNow.AddDays(1),
                Status = "REVIEW",
                CreatedById = 1
            });
        await _db.SaveChangesAsync();
        SetCurrentUser(2, "Manager");

        var listResult = await _controller.List();
        var page = Assert.IsType<PagedResultDto<RequisitionDto>>(
            Assert.IsType<OkObjectResult>(listResult.Result).Value);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal("TT-03-0001", Assert.Single(page.Items).Identifier);

        var statsResult = await _controller.Stats();
        var stats = Assert.IsType<RequisitionStatsDto>(
            Assert.IsType<OkObjectResult>(statsResult.Result).Value);
        Assert.Equal(1, stats.TotalCount);
    }

    [Fact]
    public async Task ClientAndPlantLists_ReturnAggregatedRequisitionCounts()
    {
        var plantId = await SeedClientAndPlantAsync();
        _db.PurchaseRequisitions.AddRange(
            new PurchaseRequisition
            {
                Identifier = "TT-03-0001",
                ExternalRef = "REF-1",
                PlantId = plantId,
                SectorCode = "03",
                Title = "Open request",
                DueDate = DateTime.UtcNow.AddDays(2),
                Status = "REVIEW"
            },
            new PurchaseRequisition
            {
                Identifier = "TT-03-0002",
                ExternalRef = "REF-2",
                PlantId = plantId,
                SectorCode = "03",
                Title = "Won request",
                DueDate = DateTime.UtcNow.AddDays(2),
                Status = "WON"
            });
        await _db.SaveChangesAsync();

        var clientResult = await new ClientsController(_db).List();
        var client = Assert.Single(Assert.IsType<List<ClientDto>>(
            Assert.IsType<OkObjectResult>(clientResult.Result).Value));
        Assert.Equal(1, client.OpenRequisitions);
        Assert.Equal(1, client.TotalWon);

        var plantResult = await new PlantsController(_db).List();
        var plant = Assert.Single(Assert.IsType<List<PlantDetailDto>>(
            Assert.IsType<OkObjectResult>(plantResult.Result).Value));
        Assert.Equal(2, plant.TotalRequisitions);
        Assert.Equal(1, plant.OpenRequisitions);
        Assert.Equal(1, plant.WonCount);
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
    public async Task RequestManagerInput_RequiresNotesAndKeepsRequisitionProcessing()
    {
        var plantId = await SeedClientAndPlantAsync();
        var requisition = new PurchaseRequisition
        {
            Identifier = "TT-03-0001",
            ExternalRef = "REF-1",
            PlantId = plantId,
            SectorCode = "03",
            Title = "طلب اختبار",
            DueDate = DateTime.UtcNow.AddDays(7),
            Status = nameof(RequisitionStatus.PROCESSING),
            CreatedById = 1,
        };
        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();

        var invalid = await _controller.RequestManagerInput(
            requisition.Id,
            new RequestManagerInputRequest("  "));
        Assert.Equal("Request notes are required.", ErrorMessage(invalid));

        var result = await _controller.RequestManagerInput(
            requisition.Id,
            new RequestManagerInputRequest("  أحتاج مراجعة نقطة السعر  "));

        var dto = Dto(result);
        Assert.Equal(nameof(RequisitionStatus.PROCESSING), dto.Status);
        var audit = Assert.Single(await _db.RequisitionAuditLogs.ToListAsync());
        Assert.Equal("ManagerInputRequested", audit.Action);
        Assert.Equal(nameof(RequisitionStatus.PROCESSING), audit.StatusFrom);
        Assert.Equal(nameof(RequisitionStatus.PROCESSING), audit.StatusTo);
        Assert.Equal("أحتاج مراجعة نقطة السعر", audit.Notes);

        var notification = Assert.Single(await _db.Notifications.ToListAsync());
        Assert.Equal(NotificationTypes.ManagerInputRequested, notification.Type);
        Assert.Equal(audit.Notes, notification.Message);
        Assert.Equal(requisition.Id, notification.RequisitionId);
    }

    [Fact]
    public async Task RequestManagerInput_RequiresRequisitionOwnership()
    {
        var plantId = await SeedClientAndPlantAsync();
        _db.Users.Add(new AppUser
        {
            Id = 2,
            Username = "otheruser",
            DisplayName = "Other User",
            Role = "User",
            PasswordHash = "dummy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        var requisition = new PurchaseRequisition
        {
            Identifier = "TT-03-0001",
            ExternalRef = "REF-1",
            PlantId = plantId,
            SectorCode = "03",
            Title = "طلب اختبار",
            DueDate = DateTime.UtcNow.AddDays(7),
            Status = nameof(RequisitionStatus.PROCESSING),
            CreatedById = 2,
        };
        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();

        var result = await _controller.RequestManagerInput(
            requisition.Id,
            new RequestManagerInputRequest("يرجى المراجعة"));

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Empty(await _db.RequisitionAuditLogs.ToListAsync());
        Assert.Empty(await _db.Notifications.ToListAsync());
    }

    [Fact]
    public async Task RequisitionWorkflow_SeparatesReviewApprovalAndClientSubmission()
    {
        var plantId = await SeedClientAndPlantAsync();
        var owner = await _db.Users.FindAsync(1);
        owner!.ManagerId = 2;
        _db.Users.Add(new AppUser
        {
            Id = 2,
            Username = "manager",
            DisplayName = "Manager",
            Role = "Manager",
            PasswordHash = "dummy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        var requisition = new PurchaseRequisition
        {
            Identifier = "TT-03-0001",
            ExternalRef = "REF-1",
            PlantId = plantId,
            SectorCode = "03",
            Title = "طلب اختبار",
            DueDate = DateTime.UtcNow.AddDays(7),
            Status = nameof(RequisitionStatus.PROCESSING),
            CreatedById = 1,
        };
        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();

        var invalid = await _controller.RequestManagerReview(
            requisition.Id,
            new RequestSubmitRequest(" "));
        Assert.Equal("Review notes are required.", ErrorMessage(invalid));

        var managerReview = await _controller.RequestManagerReview(
            requisition.Id,
            new RequestSubmitRequest("اكتمل العمل"));
        Assert.Equal(nameof(RequisitionStatus.MANAGER_REVIEW), Dto(managerReview).Status);
        Assert.Contains(await _db.Notifications.ToListAsync(),
            n => n.Type == NotificationTypes.ManagerReviewRequested);

        SetCurrentUser(2, "Manager");
        var accepted = await _controller.ManagerReview(
            requisition.Id,
            new InternalActionRequest("approve", "العمل مكتمل"));
        Assert.Equal(nameof(RequisitionStatus.READY_FOR_APPROVAL), Dto(accepted).Status);
        Assert.Contains(await _db.Notifications.ToListAsync(),
            n => n.Type == NotificationTypes.ManagerReviewAccepted);

        SetCurrentUser(1, "User");
        var approvalRequest = await _controller.RequestInternalApproval(
            requisition.Id,
            new RequestSubmitRequest("يرجى الاعتماد الداخلي"));
        Assert.Equal(nameof(RequisitionStatus.INTERNAL_APPROVAL), Dto(approvalRequest).Status);
        Assert.Contains(await _db.Notifications.ToListAsync(),
            n => n.Type == NotificationTypes.InternalApprovalRequested);

        SetCurrentUser(2, "Manager");
        var approved = await _controller.InternalAction(
            requisition.Id,
            new InternalActionRequest("approve", "تم الاعتماد"));
        Assert.Equal(nameof(RequisitionStatus.APPROVED), Dto(approved).Status);
        Assert.Contains(await _db.Notifications.ToListAsync(),
            n => n.Type == NotificationTypes.InternalApprovalGranted);

        SetCurrentUser(1, "User");
        var submitted = await _controller.SubmitToClient(
            requisition.Id,
            new RequestSubmitRequest("تم الإرسال للعميل"));
        Assert.Equal(nameof(RequisitionStatus.SUBMITTED), Dto(submitted).Status);
        Assert.NotNull(requisition.SubmittedAt);
        Assert.Contains(await _db.RequisitionAuditLogs.ToListAsync(),
            log => log.Action == "SubmittedToClient");
    }

    [Fact]
    public async Task ManagerReviewRevision_NotifiesOwnerAndAllowsResubmission()
    {
        var plantId = await SeedClientAndPlantAsync();
        var owner = await _db.Users.FindAsync(1);
        owner!.ManagerId = 2;
        _db.Users.Add(new AppUser
        {
            Id = 2,
            Username = "manager",
            DisplayName = "Manager",
            Role = "Manager",
            PasswordHash = "dummy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        var requisition = new PurchaseRequisition
        {
            Identifier = "TT-03-0001",
            ExternalRef = "REF-1",
            PlantId = plantId,
            SectorCode = "03",
            Title = "طلب اختبار",
            DueDate = DateTime.UtcNow.AddDays(7),
            Status = nameof(RequisitionStatus.PROCESSING),
            CreatedById = 1,
        };
        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();

        await _controller.RequestManagerReview(
            requisition.Id,
            new RequestSubmitRequest("اكتمل العمل"));
        SetCurrentUser(2, "Manager");
        var revised = await _controller.ManagerReview(
            requisition.Id,
            new InternalActionRequest("revise", "أكمل تفاصيل السعر"));

        Assert.Equal(nameof(RequisitionStatus.REVISE), Dto(revised).Status);
        Assert.Contains(await _db.Notifications.ToListAsync(),
            n => n.Type == NotificationTypes.RequisitionRevisionRequested &&
                 n.Message == "أكمل تفاصيل السعر");

        SetCurrentUser(1, "User");
        var resubmitted = await _controller.RequestManagerReview(
            requisition.Id,
            new RequestSubmitRequest("تم إكمال التعديل"));
        Assert.Equal(nameof(RequisitionStatus.MANAGER_REVIEW), Dto(resubmitted).Status);
    }

    [Fact]
    public void StatusService_InitializesAndAllowsDeclinedRequisitionsToArchive()
    {
        var transitions = RequisitionStatusService.GetValidTransitions(
            RequisitionStatus.DECLINED,
            "System",
            new[] { "system:archive" });

        Assert.Contains(RequisitionStatus.ARCHIVE, transitions);
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