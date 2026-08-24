using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly PrimeDbContext _db;

    public NotificationsController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<NotificationsListDto>> List(
        [FromQuery] int limit = 50,
        [FromQuery] bool unreadOnly = false)
    {
        if (limit < 1) limit = 50;
        if (limit > 200) limit = 200;

        var query = _db.Notifications
            .Where(n => n.DismissedAt == null)
            .AsQueryable();

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationDto(
                n.Id,
                n.RequisitionId,
                n.Requisition != null ? n.Requisition.Identifier : null,
                n.Type,
                n.Title,
                n.Message,
                n.CreatedAt,
                n.ReadAt))
            .ToListAsync();

        var unreadCount = await _db.Notifications
            .CountAsync(n => n.DismissedAt == null && n.ReadAt == null);

        return Ok(new NotificationsListDto(items, unreadCount));
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id);
        if (notification is null)
        {
            return NotFound();
        }

        notification.ReadAt ??= DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var now = DateTime.UtcNow;
        await _db.Notifications
            .Where(n => n.DismissedAt == null && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now));

        return NoContent();
    }
}