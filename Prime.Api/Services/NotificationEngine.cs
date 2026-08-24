using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class NotificationEngine
{
    private readonly int _deadlineWarningWindowDays;
    private readonly int _followUpAfterDays;
    private readonly int _followUpRepeatDays;

    public NotificationEngine(int deadlineWarningWindowDays, int followUpAfterDays, int followUpRepeatDays)
    {
        _deadlineWarningWindowDays = deadlineWarningWindowDays;
        _followUpAfterDays = followUpAfterDays;
        _followUpRepeatDays = followUpRepeatDays;
    }

    public async Task RunAsync(PrimeDbContext db, DateTime nowUtc, CancellationToken ct = default)
    {
        var relevantStatuses = new[]
        {
            nameof(RequisitionStatus.NEW),
            nameof(RequisitionStatus.REVIEW),
            nameof(RequisitionStatus.PROCESSING),
            nameof(RequisitionStatus.SUBMITTED)
        };

        var requisitions = await db.PurchaseRequisitions
            .Where(r => relevantStatuses.Contains(r.Status))
            .ToListAsync(ct);

        var existingKeys = await db.Notifications
            .Select(n => n.DedupKey)
            .ToListAsync(ct);

        var submittedLogs = await db.RequisitionAuditLogs
            .Where(a => a.Action == "StatusChanged" && a.StatusTo == nameof(RequisitionStatus.SUBMITTED))
            .GroupBy(a => a.RequisitionId)
            .Select(g => new { RequisitionId = g.Key, At = g.Max(x => x.CreatedAt) })
            .ToDictionaryAsync(x => x.RequisitionId, x => x.At, ct);

        var added = 0;
        foreach (var requisition in requisitions)
        {
            var submittedAt = submittedLogs.TryGetValue(requisition.Id, out var at) ? at : requisition.CreatedAt;

            var candidates = NotificationRules.Evaluate(
                requisition,
                submittedAt,
                nowUtc,
                _deadlineWarningWindowDays,
                _followUpAfterDays,
                _followUpRepeatDays);

            foreach (var candidate in candidates)
            {
                if (existingKeys.Contains(candidate.DedupKey)) continue;
                db.Notifications.Add(new Notification
                {
                    RequisitionId = requisition.Id,
                    Type = candidate.Type,
                    Title = candidate.Title,
                    Message = candidate.Message,
                    DedupKey = candidate.DedupKey,
                    CreatedAt = nowUtc
                });
                added++;
            }
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        await ReadNotificationsForClosedAsync(db, nowUtc, ct);
    }

    private static async Task ReadNotificationsForClosedAsync(PrimeDbContext db, DateTime now, CancellationToken ct)
    {
        var closedStatuses = new[]
        {
            nameof(RequisitionStatus.WON),
            nameof(RequisitionStatus.LOST),
            nameof(RequisitionStatus.DECLINED)
        };

        var closedIds = await db.PurchaseRequisitions
            .Where(r => closedStatuses.Contains(r.Status))
            .Select(r => r.Id)
            .ToListAsync(ct);

        if (closedIds.Count == 0) return;

        await db.Notifications
            .Where(n => n.RequisitionId.HasValue
                && closedIds.Contains(n.RequisitionId.Value)
                && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
    }
}