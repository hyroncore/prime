using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Prime.Api.Data;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class ArchivalService : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<ArchivalService> _logger;

    public ArchivalService(IServiceProvider sp, ILogger<ArchivalService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ArchiveOldRecordsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Archival job failed");
            }

            // Run daily at 2 AM UTC
            var now = DateTime.UtcNow;
            var nextRun = DateTime.UtcNow.Date.AddDays(1).AddHours(2);
            var delay = nextRun - DateTime.UtcNow;
            if (delay < TimeSpan.Zero) delay = TimeSpan.FromHours(1);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) { }
        }
    }

    private async Task ArchiveOldRecordsAsync()
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PrimeDbContext>();

        var cutoff = DateTime.UtcNow.AddDays(-60);
        var terminalStatuses = new[] { nameof(RequisitionStatus.WON), nameof(RequisitionStatus.LOST), nameof(RequisitionStatus.DECLINED) };

        var toArchive = await db.PurchaseRequisitions
            .Where(r => terminalStatuses.Contains(r.Status) && r.UpdatedAt < cutoff)
            .ToListAsync();

        if (toArchive.Count == 0) return;

        foreach (var r in toArchive)
        {
            r.Status = nameof(RequisitionStatus.ARCHIVE);
            r.ArchivedAt = DateTime.UtcNow;

            db.RequisitionAuditLogs.Add(new RequisitionAuditLog
            {
                RequisitionId = r.Id,
                Action = "Archived",
                StatusFrom = r.Status,
                StatusTo = nameof(RequisitionStatus.ARCHIVE),
                Notes = "Auto-archived after 60 days in terminal state",
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("Archived {Count} requisitions", toArchive.Count);
    }
}