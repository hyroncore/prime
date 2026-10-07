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
            nameof(RequisitionStatus.PROCESSING),
            nameof(RequisitionStatus.MANAGER_REVIEW),
            nameof(RequisitionStatus.READY_FOR_APPROVAL),
            nameof(RequisitionStatus.INTERNAL_APPROVAL),
            nameof(RequisitionStatus.APPROVED),
            nameof(RequisitionStatus.SUBMITTED),
            nameof(RequisitionStatus.REVISE)
        };

        var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
        var newCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.NEW));
        var reviewCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.REVIEW));
        var processingCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.PROCESSING));
        var managerReviewCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.MANAGER_REVIEW));
        var readyForApprovalCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.READY_FOR_APPROVAL));
        var internalApprovalCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.INTERNAL_APPROVAL));
        var approvedCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.APPROVED));
        var reviseCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.REVISE));
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
                r.Plant?.Name ?? "—",
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
            managerReviewCount,
            readyForApprovalCount,
            internalApprovalCount,
            approvedCount,
            reviseCount,
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

            var openStatuses = new[]
            {
                "NEW", "REVIEW", "PROCESSING", "MANAGER_REVIEW",
                "READY_FOR_APPROVAL", "INTERNAL_APPROVAL", "APPROVED",
                "SUBMITTED", "REVISE"
            };
            var openCount = requisitions.Count(r => openStatuses.Contains(r.Status));
            var draftCount = requisitions.Count(r => r.Status == "NEW");
            var awaitingReview = requisitions.Count(r =>
                r.Status == "REVIEW" || r.Status == "MANAGER_REVIEW");
            var awaitingSignOff = requisitions.Count(r => r.Status == "INTERNAL_APPROVAL");
            var reviseCount = requisitions.Count(r => r.Status == "REVISE");
            var wonCount = requisitions.Count(r => r.Status == "WON");
            var lostCount = requisitions.Count(r => r.Status == "LOST");

            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

            var now = DateTime.UtcNow;
            var overdueCount = requisitions.Count(r => openStatuses.Contains(r.Status) && r.DueDate < now.Date);

            var actionRequired = requisitions
                .Where(r =>
                    r.Status == "REVISE" ||
                    r.Status == "READY_FOR_APPROVAL" ||
                    r.Status == "APPROVED")
                .Select(r => new UrgentRequisitionDto(
                    r.Id,
                    r.Identifier,
                    r.Title,
                    r.Plant?.Client?.Name ?? "—",
                    r.Plant?.Name ?? "—",
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
            var isAdmin = User.IsInRole(UserRoles.Admin);

            var managerActionableStatuses = new[]
            {
                "REVIEW", "MANAGER_REVIEW", "INTERNAL_APPROVAL"
            };
            var teamUsers = await _db.Users
                .Where(u => u.IsActive
                    && u.Role == UserRoles.User
                    && (isAdmin || u.ManagerId == userId))
                .ToListAsync();
            var teamUserIds = teamUsers.Select(u => u.Id).ToList();

            IQueryable<PurchaseRequisition> requisitionsQuery = _db.PurchaseRequisitions
                .Include(r => r.Plant)!
                    .ThenInclude(p => p!.Client)
                .Include(r => r.AuditLogs);
            if (!isAdmin)
            {
                requisitionsQuery = requisitionsQuery
                    .Where(r => r.CreatedById.HasValue && teamUserIds.Contains(r.CreatedById.Value));
            }
            var teamRequisitions = await requisitionsQuery.ToListAsync();
            var requisitions = teamRequisitions
                .Where(r => managerActionableStatuses.Contains(r.Status))
                .ToList();

            var openStatuses = new[]
            {
                "NEW", "REVIEW", "PROCESSING", "MANAGER_REVIEW",
                "READY_FOR_APPROVAL", "INTERNAL_APPROVAL", "APPROVED",
                "SUBMITTED", "REVISE"
            };
            var pendingReview = requisitions.Count(r =>
                r.Status == "REVIEW" || r.Status == "MANAGER_REVIEW");
            var pendingSignOff = requisitions.Count(r => r.Status == "INTERNAL_APPROVAL");
            var teamVolume = teamRequisitions.Count;
            var wonCount = teamRequisitions.Count(r => r.Status == "WON");
            var lostCount = teamRequisitions.Count(r => r.Status == "LOST");
            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

            var now = DateTime.UtcNow;

            var pendingReviews = requisitions
                .Where(r => r.Status == "REVIEW" || r.Status == "MANAGER_REVIEW")
                .Select(r => new UrgentRequisitionDto(
                    r.Id, r.Identifier, r.Title, 
                    r.Plant?.Client?.Name ?? "—", r.Plant?.Name ?? "—",
                    r.DueDate, r.Status,
                    (int)Math.Ceiling((r.DueDate - now).TotalDays)))
                .OrderBy(r => r.DueDate)
                .ToList();

            var pendingSignOffs = requisitions
                .Where(r => r.Status == "INTERNAL_APPROVAL")
                .Select(r => new PendingSignOffDto(
                    r.Id, r.Identifier, r.Title, 
                    r.Plant?.Name ?? "—", r.Plant?.Client?.Name ?? "—",
                    r.AuditLogs
                        .Where(a => a.Action == "InternalApprovalRequested")
                        .OrderByDescending(a => a.CreatedAt)
                        .Select(a => (DateTime?)a.CreatedAt)
                        .FirstOrDefault() ?? r.SubmittedAt ?? r.CreatedAt))
                .OrderBy(r => r.RequestedAt)
                .ToList();

            var teamPerformance = teamUsers
                .Select(u => {
                    var userReqs = teamRequisitions
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
            IQueryable<PurchaseRequisition> query = _db.PurchaseRequisitions;
            if (User.IsInRole(UserRoles.Manager) && !User.IsInRole(UserRoles.Admin))
            {
                var managerId = GetCurrentUserId();
                query = query.Where(r => r.CreatedBy != null && r.CreatedBy.ManagerId == managerId);
            }

            var reviewCount = await query
                .Where(r => r.Status == "REVIEW" || r.Status == "MANAGER_REVIEW")
                .CountAsync();

            var internalCount = await query
                .Where(r => r.Status == "INTERNAL_APPROVAL")
                .CountAsync();

            var archiveCount = await query
                .Where(r =>
                    r.Status == "DECLINED" ||
                    r.Status == "SUBMITTED" ||
                    r.Status == "WON" ||
                    r.Status == "LOST")
                .CountAsync();

            return Ok(new WorkflowCountsDto(reviewCount, internalCount, archiveCount));
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