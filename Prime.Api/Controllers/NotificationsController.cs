using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;
using System.Security.Claims;

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

        var query = VisibleNotifications(_db.Notifications.Where(n => n.DismissedAt == null));

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

        var unreadQuery = VisibleNotifications(
            _db.Notifications.Where(n => n.DismissedAt == null && n.ReadAt == null));

        var unreadCount = await unreadQuery.CountAsync();

        return Ok(new NotificationsListDto(items, unreadCount));
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var notification = await _db.Notifications
            .Include(n => n.Requisition)
                .ThenInclude(r => r!.CreatedBy)
            .FirstOrDefaultAsync(n => n.Id == id);
        if (notification is null)
        {
            return NotFound();
        }

        if (!CanSeeNotification(notification))
        {
            return Forbid();
        }

        notification.ReadAt ??= DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var now = DateTime.UtcNow;
        var query = VisibleNotifications(
            _db.Notifications.Where(n => n.DismissedAt == null && n.ReadAt == null));

        await query.ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now));

        return NoContent();
    }

    private IQueryable<Notification> VisibleNotifications(IQueryable<Notification> query)
    {
        var user = ControllerContext.HttpContext?.User;
        if (user?.IsInRole(UserRoles.Admin) == true)
        {
            return query;
        }

        if (user?.IsInRole(UserRoles.Manager) == true &&
            int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var managerId))
        {
            return query.Where(n =>
                (
                    (n.Type != NotificationTypes.ManagerInputRequested &&
                     n.Type != NotificationTypes.ManagerReviewRequested &&
                     n.Type != NotificationTypes.InternalApprovalRequested &&
                     n.Type != NotificationTypes.ManagerReviewAccepted &&
                     n.Type != NotificationTypes.InternalApprovalGranted &&
                     n.Type != NotificationTypes.RequisitionRevisionRequested) ||
                    (
                        (n.Type == NotificationTypes.ManagerInputRequested ||
                         n.Type == NotificationTypes.ManagerReviewRequested ||
                         n.Type == NotificationTypes.InternalApprovalRequested) &&
                        n.Requisition != null &&
                        n.Requisition.CreatedBy != null &&
                        n.Requisition.CreatedBy.ManagerId == managerId
                    )
                ));
        }

        if (user is not null &&
            int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return query.Where(n =>
                n.Type != NotificationTypes.ManagerInputRequested &&
                n.Type != NotificationTypes.ManagerReviewRequested &&
                n.Type != NotificationTypes.InternalApprovalRequested &&
                ((n.Type != NotificationTypes.ManagerReviewAccepted &&
                  n.Type != NotificationTypes.InternalApprovalGranted &&
                  n.Type != NotificationTypes.RequisitionRevisionRequested) ||
                 (n.Requisition != null && n.Requisition.CreatedById == userId)));
        }

        return query.Where(n =>
            n.Type != NotificationTypes.ManagerInputRequested &&
            n.Type != NotificationTypes.ManagerReviewRequested &&
            n.Type != NotificationTypes.InternalApprovalRequested &&
            n.Type != NotificationTypes.ManagerReviewAccepted &&
            n.Type != NotificationTypes.InternalApprovalGranted &&
            n.Type != NotificationTypes.RequisitionRevisionRequested);
    }

    private static bool IsManagerNotification(string type) =>
        type == NotificationTypes.ManagerInputRequested ||
        type == NotificationTypes.ManagerReviewRequested ||
        type == NotificationTypes.InternalApprovalRequested;

    private static bool IsUserNotification(string type) =>
        type == NotificationTypes.ManagerReviewAccepted ||
        type == NotificationTypes.InternalApprovalGranted ||
        type == NotificationTypes.RequisitionRevisionRequested;

    private bool CanSeeNotification(Notification notification)
    {
        var user = ControllerContext.HttpContext?.User;
        if (user?.IsInRole(UserRoles.Admin) == true)
        {
            return true;
        }

        if (IsManagerNotification(notification.Type))
        {
            return user?.IsInRole(UserRoles.Manager) == true &&
                int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var managerId) &&
                notification.Requisition?.CreatedBy?.ManagerId == managerId;
        }

        if (IsUserNotification(notification.Type))
        {
            return int.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) &&
                notification.Requisition?.CreatedById == userId;
        }

        return true;
    }
}