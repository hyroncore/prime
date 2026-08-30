using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Controllers;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Tests;

public class NotificationsTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PrimeDbContext _db;
    private readonly NotificationsController _controller;

    private static readonly DateTime Now = new(2026, 8, 16, 10, 0, 0, DateTimeKind.Utc);

    public NotificationsTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PrimeDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new PrimeDbContext(options);
        _db.Database.EnsureCreated();
        _controller = new NotificationsController(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<PurchaseRequisition> SeedOpenRequisitionAsync(DateTime? dueDate = null)
    {
        var client = new Client { Name = "جهة اختبار" };
        var plant = new Plant { PlantName = "مصنع اختبار", ShortCode = "TT", Client = client };
        client.Plants.Add(plant);
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        var requisition = new PurchaseRequisition
        {
            Identifier = "LB-03-0001",
            ExternalRef = "SL75-2026",
            PlantId = plant.Id,
            SectorCode = "03",
            Title = "توريد قطع غيار",
            Status = nameof(RequisitionStatus.NEW),
            DueDate = dueDate ?? DateTime.SpecifyKind(Now.Date.AddDays(1), DateTimeKind.Utc),
        };
        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();
        return requisition;
    }

    private static NotificationsListDto List(ActionResult<NotificationsListDto> result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        return Assert.IsType<NotificationsListDto>(objectResult.Value);
    }

    [Fact]
    public async Task Engine_CreatesOverdue_AndIsIdempotent()
    {
        var req = await SeedOpenRequisitionAsync(Now.Date.AddDays(-1));
        var engine = new NotificationEngine(7, 30, 7);

        await engine.RunAsync(_db, Now);
        var first = await _db.Notifications.ToListAsync();

        var notification = Assert.Single(first);
        Assert.Equal(NotificationTypes.Overdue, notification.Type);
        Assert.Equal(req.Id, notification.RequisitionId);
        Assert.Null(notification.ReadAt);

        await engine.RunAsync(_db, Now);
        Assert.Single(await _db.Notifications.ToListAsync());
    }

    [Fact]
    public async Task Engine_Autoreads_WhenRequisitionClosed()
    {
        await SeedOpenRequisitionAsync(Now.Date.AddDays(-1));
        var engine = new NotificationEngine(7, 30, 7);
        await engine.RunAsync(_db, Now);

        var req = await _db.PurchaseRequisitions.SingleAsync();
        req.Status = nameof(RequisitionStatus.WON);
        await _db.SaveChangesAsync();

        await engine.RunAsync(_db, Now.AddDays(1));

        var notification = await _db.Notifications.AsNoTracking().SingleAsync();
        Assert.NotNull(notification.ReadAt);
    }

    [Fact]
    public async Task Engine_SubmittedFollowUp_After30Days()
    {
        var req = await SeedOpenRequisitionAsync();
        req.Status = nameof(RequisitionStatus.SUBMITTED);
        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = req.Id,
            Action = "StatusChanged",
            StatusTo = nameof(RequisitionStatus.SUBMITTED),
            CreatedAt = Now.Date.AddDays(-30)
        });
        await _db.SaveChangesAsync();

        var engine = new NotificationEngine(7, 30, 7);
        await engine.RunAsync(_db, Now);

        var notification = Assert.Single(await _db.Notifications.ToListAsync());
        Assert.Equal(NotificationTypes.SubmittedFollowUp, notification.Type);
    }

    [Fact]
    public async Task List_ReturnsUnreadCount()
    {
        await SeedOpenRequisitionAsync(Now.Date.AddDays(-1));
        var engine = new NotificationEngine(7, 30, 7);
        await engine.RunAsync(_db, Now);

        var result = await _controller.List(limit: 50, unreadOnly: false);

        var list = List(result);
        var notification = Assert.Single(list.Items);
        Assert.Equal(1, list.UnreadCount);
        Assert.Equal("LB-03-0001", notification.Identifier);
        Assert.Null(notification.ReadAt);
    }

    [Fact]
    public async Task MarkRead_DecrementsUnread()
    {
        await SeedOpenRequisitionAsync(Now.Date.AddDays(-1));
        var engine = new NotificationEngine(7, 30, 7);
        await engine.RunAsync(_db, Now);

        var id = (await _db.Notifications.SingleAsync()).Id;

        var result = await _controller.MarkRead(id);
        Assert.IsType<NoContentResult>(result);

        var list = List(await _controller.List(limit: 50, unreadOnly: false));
        Assert.Equal(0, list.UnreadCount);
        Assert.NotNull(list.Items.Single().ReadAt);
    }

    [Fact]
    public async Task ReadAll_MarksEverythingRead()
    {
        await SeedOpenRequisitionAsync(Now.Date.AddDays(-1));
        var engine = new NotificationEngine(7, 30, 7);
        await engine.RunAsync(_db, Now);

        var result = await _controller.MarkAllRead();
        Assert.IsType<NoContentResult>(result);

        var list = List(await _controller.List(limit: 50, unreadOnly: false));
        Assert.Equal(0, list.UnreadCount);
        Assert.Empty(list.Items.Where(n => n.ReadAt == null));
    }
}