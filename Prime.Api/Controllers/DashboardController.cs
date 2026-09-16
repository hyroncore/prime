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
                r.Plant?.Client?.Name ?? "—",
                r.Plant?.PlantName ?? "—",
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
            .Where(r => r.Plant != null && r.Plant.Client != null)
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
        
        var activeClients = requisitions
            .Where(r => openStatuses.Contains(r.Status) && r.Plant != null)
            .Select(r => r.Plant!.ClientId)
            .Distinct()
            .Count();

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

        var topClients = requisitions
            .Where(r => r.Plant != null && r.Plant.Client != null)
            .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
            .Select(g => new TopClientDto(
                g.Key.ClientId,
                g.Key.Name,
                g.Count(),
                g.Count(r => r.Status == nameof(RequisitionStatus.WON))))
            .OrderByDescending(c => c.TotalRequisitions)
            .Take(5)
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
        try
        {
            var userId = GetCurrentUserId();
            
            var requisitions = await _db.PurchaseRequisitions
                .Include(r => r.Plant)!
                    .ThenInclude(p => p!.Client)
                .Where(r => r.CreatedById == userId)
                .ToListAsync();

            var openStatuses = new[] { "NEW", "REVIEW", "PROCESSING" };
            var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
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
                    r.Plant?.Client?.Name ?? "—",
                    r.Plant?.PlantName ?? "—",
                    r.DueDate,
                    r.Status,
                    (int)Math.Ceiling((r.DueDate - now).TotalDays)))
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user stats");
            return StatusCode(500, new { message = "حدث خطأ أثناء جلب إحصائيات المستخدم", error = ex.Message });
        }
    }

    [HttpGet("admin-stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AdminDashboardStatsDto>> GetAdminStats()
    {
        try
        {
            const string newStatus = "NEW";
            const string reviewStatus = "REVIEW";
            const string processingStatus = "PROCESSING";
            const string adminRole = "Admin";
            const string managerRole = "Manager";
            const string userRole = "User";

            var totalUsers = await _db.Users.CountAsync();
            var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
            var inactiveUsers = totalUsers - activeUsers;
            var adminCount = await _db.Users.CountAsync(u => u.Role == adminRole);
            var managerCount = await _db.Users.CountAsync(u => u.Role == managerRole);
            var userCount = await _db.Users.CountAsync(u => u.Role == userRole);
            var totalClients = await _db.Clients.CountAsync();
            var totalPlants = await _db.Plants.CountAsync();
            
            var requisitions = await _db.PurchaseRequisitions
                .Include(r => r.Plant)!
                    .ThenInclude(p => p!.Client)
                .ToListAsync();

            var openStatuses = new[] { newStatus, reviewStatus, processingStatus };
            var activeClients = requisitions
                .Where(r => openStatuses.Contains(r.Status) && r.Plant != null)
                .Select(r => r.Plant!.ClientId)
                .Distinct()
                .Count();

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

            var topClients = requisitions
                .Where(r => r.Plant != null && r.Plant.Client != null)
                .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
                .Select(g => new TopClientDto(
                    g.Key.ClientId,
                    g.Key.Name,
                    g.Count(),
                    g.Count(r => r.Status == "WON")))
                .OrderByDescending(c => c.TotalRequisitions)
                .Take(5)
                .ToList();

            return Ok(new AdminDashboardStatsDto(
                totalUsers,
                activeUsers,
                inactiveUsers,
                adminCount,
                managerCount,
                userCount,
                totalClients,
                activeClients,
                totalPlants,
                recentUsers,
                topClients));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching admin stats");
            return StatusCode(500, new { message = "حدث خطأ أثناء جلب إحصائيات الإدارة", error = ex.Message });
        }
    }

    [HttpGet("manager-stats")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<ActionResult<ManagerDashboardStatsDto>> GetManagerStats()
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = User.IsInRole("Admin");

            // Get subordinates for this manager
            var subordinateIds = await _db.Users
                .Where(u => u.ManagerId == userId && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();

            var allTeamUserIds = isAdmin
                ? await _db.Users.Where(u => u.IsActive).Select(u => u.Id).ToListAsync()
                : subordinateIds;

            // For managers: show requisitions in REVIEW status submitted by their subordinates
            // For admins: show all requisitions
            var requisitionsQuery = _db.PurchaseRequisitions
                .Include(r => r.Plant)!
                    .ThenInclude(p => p!.Client)
                .AsQueryable();

            if (!isAdmin)
            {
                // Show requisitions in REVIEW status created by subordinates
                requisitionsQuery = requisitionsQuery
                    .Where(r => r.Status == "REVIEW" && r.CreatedById.HasValue && subordinateIds.Contains(r.CreatedById.Value));
            }

            var requisitions = await requisitionsQuery.ToListAsync();

            // For stats (won/lost), query ALL requisitions from subordinates
            var allTeamRequisitions = await _db.PurchaseRequisitions
                .Where(r => r.CreatedById.HasValue && allTeamUserIds.Contains(r.CreatedById.Value))
                .ToListAsync();

            var openStatuses = new[] { "NEW", "REVIEW", "PROCESSING" };
            var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
            var pendingReview = requisitions.Count(r => r.Status == "REVIEW");
            var pendingSignOff = requisitions.Count(r => r.Status == "SUBMITTED");
            var teamVolume = requisitions.Count;
            var wonCount = allTeamRequisitions.Count(r => r.Status == "WON");
            var lostCount = allTeamRequisitions.Count(r => r.Status == "LOST");
            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

            var now = DateTime.UtcNow;

            var pendingReviews = requisitions
                .Where(r => r.Status == "REVIEW")
                .Select(r => new UrgentRequisitionDto(
                    r.Id, r.Identifier, r.Title, 
                    r.Plant?.Client?.Name ?? "—", r.Plant?.PlantName ?? "—", 
                    r.DueDate, r.Status, 
                    (int)Math.Ceiling((r.DueDate - now).TotalDays)))
                .OrderBy(r => r.DueDate)
                .ToList();

            var pendingSignOffs = requisitions
                .Where(r => r.Status == "SUBMITTED")
                .Select(r => new PendingSignOffDto(
                    r.Id, r.Identifier, r.Title, 
                    r.Plant?.PlantName ?? "—", r.Plant?.Client?.Name ?? "—", 
                    r.SubmittedAt ?? DateTime.MinValue))
                .OrderBy(r => r.SubmittedAt)
                .ToList();

            var teamUsers = await _db.Users
                .Where(u => allTeamUserIds.Contains(u.Id))
                .ToListAsync();

            var teamPerformance = teamUsers
                .Select(u => {
                    var userReqs = _db.PurchaseRequisitions
                        .Where(r => r.CreatedById == u.Id)
                        .ToList();
                    var userOpen = userReqs.Count(r => openStatuses.Contains(r.Status));
                    var userRevise = userReqs.Count(r => r.Status == "REVISE");
                    var userSubmitted = userReqs.Count(r => r.Status == "SUBMITTED");
                    var userWon = userReqs.Count(r => r.Status == "WON");
                    var userLost = userReqs.Count(r => r.Status == "LOST");
                    var userDecided = userWon + userLost;
                    var userWinRate = userDecided == 0 ? 0 : Math.Round((double)userWon / userDecided * 100, 1);

                    return new TeamMemberStatsDto(
                        u.Id,
                        u.DisplayName,
                        userOpen,
                        userRevise,
                        userSubmitted,
                        userWon,
                        userWinRate
                    );
                })
                .ToList();

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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching manager stats");
            return StatusCode(500, new { message = "حدث خطأ أثناء جلب إحصائيات المدير", error = ex.Message });
        }
    }

    [HttpGet("workflow-counts")]
    [Authorize(Policy = "req:review_action")]
    public async Task<ActionResult<WorkflowCountsDto>> GetWorkflowCounts()
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = User.IsInRole("Admin");

            var subordinateIds = await _db.Users
                .Where(u => u.ManagerId == userId && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();

            var allTeamUserIds = isAdmin
                ? await _db.Users.Where(u => u.IsActive).Select(u => u.Id).ToListAsync()
                : subordinateIds;

            var reviewCount = await _db.PurchaseRequisitions
                .Where(r => r.Status == "REVIEW" && r.CreatedById.HasValue && allTeamUserIds.Contains(r.CreatedById.Value))
                .CountAsync();

            var submittedCount = await _db.PurchaseRequisitions
                .Where(r => r.Status == "SUBMITTED" && r.CreatedById.HasValue && allTeamUserIds.Contains(r.CreatedById.Value))
                .CountAsync();

            var archiveCount = await _db.PurchaseRequisitions
                .Where(r => new[] { "DECLINED", "APPROVED", "REVISE" }.Contains(r.Status) && r.CreatedById.HasValue && allTeamUserIds.Contains(r.CreatedById.Value))
                .CountAsync();

            return Ok(new WorkflowCountsDto(reviewCount, submittedCount, archiveCount));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching workflow counts");
            return StatusCode(500, new { message = "حدث خطأ أثناء جلب إحصائيات تدفق العمل", error = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out var id) ? id : 0;
    }
}