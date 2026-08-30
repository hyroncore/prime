using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(PrimeDbContext db, ILogger<DashboardController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        try
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

        // Admin-specific stats
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
        var totalClients = await _db.Clients.CountAsync();
        
        // Use SQL-friendly query for active clients
        var activeClientIds = await _db.PurchaseRequisitions
            .Where(r => openStatuses.Contains(r.Status))
            .Select(r => r.Plant!.ClientId)
            .Distinct()
            .ToListAsync();
        var activeClients = activeClientIds.Count;

        var recentUsers = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new RecentUserDto(
                u.Id,
                u.Username,
                u.DisplayName,
                u.Role,
                u.IsActive,
                u.LastLoginAt))
            .ToListAsync();

        // Use SQL-friendly query for top clients
        var topClients = await _db.PurchaseRequisitions
            .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
            .Select(g => new TopClientDto(
                g.Key.ClientId,
                g.Key.Name,
                g.Count(),
                g.Count(r => r.Status == nameof(RequisitionStatus.WON))))
            .OrderByDescending(c => c.TotalRequisitions)
            .Take(5)
            .ToListAsync();

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
            clientBreakdown,
            totalUsers,
            activeUsers,
            totalClients,
            activeClients,
            recentUsers,
            topClients));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching dashboard stats");
            return StatusCode(500, new { message = "حدث خطأ أثناء جلب إحصائيات لوحة التحكم", error = ex.Message });
        }
    }

    [HttpGet("user-stats")]
    [Authorize]
    public async Task<ActionResult<UserDashboardStatsDto>> GetUserStats()
    {
        var userId = GetCurrentUserId();
        
        var requisitions = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .Where(r => r.CreatedById == userId)
            .ToListAsync();

        var openStatuses = new[] { "NEW", "REVIEW", "PROCESSING" };
        var openCount = requisitions.Count(r => new[] { "NEW", "REVIEW", "PROCESSING" }.Contains(r.Status));
        var draftCount = requisitions.Count(r => r.Status == "NEW");
        var awaitingReview = requisitions.Count(r => r.Status == "REVIEW");
        var awaitingSignOff = requisitions.Count(r => r.Status == "SUBMITTED");
        var reviseCount = requisitions.Count(r => r.Status == "REVISE");
        var wonCount = requisitions.Count(r => r.Status == "WON");
        var lostCount = requisitions.Count(r => r.Status == "LOST");

        var decided = wonCount + lostCount;
        var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

        var now = DateTime.UtcNow;
        var overdueCount = requisitions.Count(r => openStatuses.Contains(r.Status) && r.DueDate < now.Date);

        var actionRequired = requisitions
            .Where(r => r.Status == "REVISE")
            .Select(r => new UrgentRequisitionDto(
                r.Id,
                r.Identifier,
                r.Title,
                r.Plant!.Client!.Name,
                r.Plant.PlantName,
                r.DueDate,
                r.Status,
                (int)Math.Ceiling((r.DueDate - DateTime.UtcNow).TotalDays)))
            .OrderBy(u => u.DueDate)
            .ToList();

        return Ok(new UserDashboardStatsDto(
            openCount,
            draftCount,
            awaitingReview,
            awaitingSignOff,
            reviseCount,
            overdueCount,
            wonCount,
            lostCount,
            winRate,
            actionRequired
        ));
    }

    [HttpGet("admin-stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AdminDashboardStatsDto>> GetAdminStats()
    {
        const string newStatus = "NEW";
        const string reviewStatus = "REVIEW";
        const string processingStatus = "PROCESSING";
        const string wonStatus = "WON";

        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
        var totalClients = await _db.Clients.CountAsync();
        
        var activeClientIds = await _db.PurchaseRequisitions
            .Where(r => r.Status == newStatus || r.Status == reviewStatus || r.Status == processingStatus)
            .Select(r => r.Plant!.ClientId)
            .Distinct()
            .ToListAsync();
        var activeClients = activeClientIds.Count;

        var recentUsers = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new RecentUserDto(
                u.Id,
                u.Username,
                u.DisplayName,
                u.Role,
                u.IsActive,
                u.LastLoginAt))
            .ToListAsync();

        // Materialize requisitions first, then group in memory (small dataset)
        var requisitions = await _db.PurchaseRequisitions
            .Select(r => new { r.Plant!.ClientId, r.Plant.Client!.Name, r.Status })
            .ToListAsync();

        var topClients = requisitions
            .GroupBy(r => new { r.ClientId, r.Name })
            .Select(g => new TopClientDto(
                g.Key.ClientId,
                g.Key.Name,
                g.Count(),
                g.Count(r => r.Status == wonStatus)))
            .OrderByDescending(c => c.TotalRequisitions)
            .Take(5)
            .ToList();

        return Ok(new AdminDashboardStatsDto(
            totalUsers,
            activeUsers,
            totalClients,
            activeClients,
            recentUsers,
            topClients));
    }

    [HttpGet("manager-stats")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<ActionResult<ManagerDashboardStatsDto>> GetManagerStats()
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var teamUserIds = new List<int> { GetCurrentUserId() };
        if (!isAdmin)
        {
            var subordinates = await _db.Users
                .Where(u => u.ManagerId == userId && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();
            teamUserIds.AddRange(subordinates);
        }
        else
        {
            var allUsers = await _db.Users.Where(u => u.IsActive).Select(u => u.Id).ToListAsync();
            teamUserIds.AddRange(allUsers);
        }

        var requisitions = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .Where(r => teamUserIds.Contains(r.CreatedById ?? 0))
            .ToListAsync();

        var openStatuses = new[] { "NEW", "REVIEW", "PROCESSING" };
        var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
        var pendingReview = requisitions.Count(r => r.Status == "REVIEW");
        var pendingSignOff = requisitions.Count(r => r.Status == "SUBMITTED");
        var teamVolume = requisitions.Count;
        var wonCount = requisitions.Count(r => r.Status == "WON");
        var lostCount = requisitions.Count(r => r.Status == "LOST");
        var decided = wonCount + lostCount;
        var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

        var pendingReviews = requisitions
            .Where(r => r.Status == "REVIEW")
            .Select(r => new UrgentRequisitionDto(
                r.Id, r.Identifier, r.Title, 
                r.Plant!.Client!.Name, r.Plant!.PlantName, 
                r.DueDate, r.Status, 
                (int)Math.Ceiling((r.DueDate - DateTime.UtcNow).TotalDays)))
            .OrderBy(r => r.DueDate)
            .ToList();

        var pendingSignOffs = requisitions
            .Where(r => r.Status == "SUBMITTED")
            .Select(r => new PendingSignOffDto(
                r.Id, r.Identifier, r.Title, 
                r.Plant!.PlantName, r.Plant!.Client!.Name, 
                r.SubmittedAt ?? DateTime.MinValue))
            .OrderBy(r => r.SubmittedAt)
            .ToList();

        var teamPerformance = await _db.Users
            .Where(u => teamUserIds.Contains(u.Id))
            .Select(u => new TeamMemberStatsDto(
                u.Id,
                u.DisplayName,
                _db.PurchaseRequisitions.Count(r => r.CreatedById == u.Id && new[] { "NEW", "REVIEW", "PROCESSING" }.Contains(r.Status)),
                _db.PurchaseRequisitions.Count(r => r.CreatedById == u.Id && r.Status == "REVISE"),
                _db.PurchaseRequisitions.Count(r => r.CreatedById == u.Id && new[] { "WON", "LOST" }.Contains(r.Status)),
                _db.PurchaseRequisitions.Count(r => r.CreatedById == u.Id && r.Status == "WON"),
                _db.PurchaseRequisitions.Count(r => r.CreatedById == u.Id && new[] { "WON", "LOST" }.Contains(r.Status))
            ))
            .ToListAsync();

        return Ok(new ManagerDashboardStatsDto(
            teamVolume,
            pendingReview,
            pendingSignOff,
            winRate,
            wonCount,
            lostCount,
            teamPerformance,
            pendingReviews,
            pendingSignOffs
        ));
    }

    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out var id) ? id : 0;
    }
}