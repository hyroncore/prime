using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly PrimeDbContext _db;

    public DashboardController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        var requisitions = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .ToListAsync();

        var openStatuses = new[]
        {
            nameof(RequisitionStatus.NEW),
            nameof(RequisitionStatus.REVIEW),
            nameof(RequisitionStatus.PROCESSING)
        };

        var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
        var newCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.NEW));
        var reviewCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.REVIEW));
        var processingCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.PROCESSING));
        var submittedCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.SUBMITTED));
        var wonCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.WON));
        var lostCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.LOST));
        var declinedCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.DECLINED));
        var totalCount = requisitions.Count;

        var decided = wonCount + lostCount;
        var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

        var now = DateTime.UtcNow;

        var overdueCount = requisitions.Count(
            r => openStatuses.Contains(r.Status) && r.DueDate < now.Date);

        var overdue = requisitions
            .Where(r => openStatuses.Contains(r.Status))
            .Where(r => r.DueDate < now.Date)
            .Select(r => new UrgentRequisitionDto(
                r.Id,
                r.Identifier,
                r.Title,
                r.Plant!.Client!.Name,
                r.Plant.PlantName,
                r.DueDate,
                r.Status,
                (int)Math.Ceiling((r.DueDate - now).TotalDays)))
            .OrderBy(u => u.DueDate)
            .Take(10)
            .ToList();

        var sectorBreakdown = requisitions
            .GroupBy(r => r.SectorCode)
            .Select(g => new SectorBreakdownDto(
                g.Key,
                Sectors.GetName(g.Key),
                g.Count(),
                g.Count(r => openStatuses.Contains(r.Status))))
            .OrderByDescending(s => s.Total)
            .ToList();

        var clientBreakdown = requisitions
            .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
            .Select(g => new ClientBreakdownDto(
                g.Key.ClientId,
                g.Key.Name,
                g.Count(),
                g.Count(r => openStatuses.Contains(r.Status)),
                g.Count(r => r.Status == nameof(RequisitionStatus.WON))))
            .OrderByDescending(c => c.Total)
            .ToList();

        return Ok(new DashboardStatsDto(
            openCount,
            newCount,
            reviewCount,
            processingCount,
            overdueCount,
            submittedCount,
            wonCount,
            lostCount,
            declinedCount,
            totalCount,
            winRate,
            overdue,
            sectorBreakdown,
            clientBreakdown));
    }
}