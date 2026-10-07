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
    private static readonly List<string> OpenStatuses = new()
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
    private static readonly List<string> AdminActiveClientStatuses = new()
    {
        nameof(RequisitionStatus.NEW),
        nameof(RequisitionStatus.REVIEW),
        nameof(RequisitionStatus.PROCESSING)
    };

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
            var statusCounts = await _db.PurchaseRequisitions
                .GroupBy(r => r.Status)
                .Select(group => new { Status = group.Key, Count = group.Count() })
                .ToDictionaryAsync(group => group.Status, group => group.Count);
            int CountStatus(string status) => statusCounts.GetValueOrDefault(status);

            var openCount = OpenStatuses.Sum(CountStatus);
            var newCount = CountStatus(nameof(RequisitionStatus.NEW));
            var reviewCount = CountStatus(nameof(RequisitionStatus.REVIEW));
            var processingCount = CountStatus(nameof(RequisitionStatus.PROCESSING));
            var managerReviewCount = CountStatus(nameof(RequisitionStatus.MANAGER_REVIEW));
            var readyForApprovalCount = CountStatus(nameof(RequisitionStatus.READY_FOR_APPROVAL));
            var internalApprovalCount = CountStatus(nameof(RequisitionStatus.INTERNAL_APPROVAL));
            var approvedCount = CountStatus(nameof(RequisitionStatus.APPROVED));
            var reviseCount = CountStatus(nameof(RequisitionStatus.REVISE));
            var submittedCount = CountStatus(nameof(RequisitionStatus.SUBMITTED));
            var wonCount = CountStatus(nameof(RequisitionStatus.WON));
            var lostCount = CountStatus(nameof(RequisitionStatus.LOST));
            var declinedCount = CountStatus(nameof(RequisitionStatus.DECLINED));
            var totalCount = statusCounts.Values.Sum();
            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);
            var now = DateTime.UtcNow;

            var overdueQuery = _db.PurchaseRequisitions
                .Where(r => OpenStatuses.Contains(r.Status) && r.DueDate < now.Date);
            var overdueCount = await overdueQuery.CountAsync();
            var overdueRows = await overdueQuery
                .OrderBy(r => r.DueDate)
                .Take(10)
                .Select(r => new
                {
                    r.Id,
                    r.Identifier,
                    r.Title,
                    ClientName = r.Plant!.Client!.Name,
                    PlantName = r.Plant.Name,
                    r.DueDate,
                    r.Status
                })
                .ToListAsync();
            var overdue = overdueRows.Select(r => new UrgentRequisitionDto(
                r.Id,
                r.Identifier,
                r.Title,
                r.ClientName,
                r.PlantName,
                r.DueDate,
                r.Status,
                (int)Math.Ceiling((r.DueDate - now).TotalDays))).ToList();

            var sectorRows = await _db.PurchaseRequisitions
                .GroupBy(r => r.SectorCode)
                .Select(group => new
                {
                    SectorCode = group.Key,
                    Total = group.Count(),
                    Open = group.Count(r => OpenStatuses.Contains(r.Status))
                })
                .OrderByDescending(group => group.Total)
                .ToListAsync();
            var sectorBreakdown = sectorRows.Select(group => new SectorBreakdownDto(
                group.SectorCode,
                Sectors.GetName(group.SectorCode),
                group.Total,
                group.Open)).ToList();

            var clientRows = await _db.PurchaseRequisitions
                .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
                .Select(group => new
                {
                    group.Key.ClientId,
                    ClientName = group.Key.Name,
                    Total = group.Count(),
                    Open = group.Count(r => OpenStatuses.Contains(r.Status)),
                    Won = group.Count(r => r.Status == nameof(RequisitionStatus.WON))
                })
                .OrderByDescending(group => group.Total)
                .ToListAsync();
            var clientBreakdown = clientRows.Select(group => new ClientBreakdownDto(
                group.ClientId,
                group.ClientName,
                group.Total,
                group.Open,
                group.Won)).ToList();

            var totalUsers = await _db.Users.CountAsync();
            var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
            var totalClients = await _db.Clients.CountAsync();
            var activeClients = await _db.PurchaseRequisitions
                .Where(r => OpenStatuses.Contains(r.Status))
                .Select(r => r.Plant!.ClientId)
                .Distinct()
                .CountAsync();
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
            var topClients = clientRows.Take(5).Select(group => new TopClientDto(
                group.ClientId,
                group.ClientName,
                group.Total,
                group.Won)).ToList();

            return Ok(new DashboardStatsDto(
                openCount, newCount, reviewCount, processingCount, managerReviewCount,
                readyForApprovalCount, internalApprovalCount, approvedCount, reviseCount,
                overdueCount, submittedCount, wonCount, lostCount, declinedCount, totalCount,
                winRate, overdue, sectorBreakdown, clientBreakdown, totalUsers, activeUsers,
                totalClients, activeClients, recentUsers, topClients));
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
            
            var userQuery = _db.PurchaseRequisitions.Where(r => r.CreatedById == userId);
            var statusCounts = await userQuery
                .GroupBy(r => r.Status)
                .Select(group => new { Status = group.Key, Count = group.Count() })
                .ToDictionaryAsync(group => group.Status, group => group.Count);
            int CountStatus(string status) => statusCounts.GetValueOrDefault(status);
            var openCount = OpenStatuses.Sum(CountStatus);
            var draftCount = CountStatus("NEW");
            var awaitingReview = CountStatus("REVIEW") + CountStatus("MANAGER_REVIEW");
            var awaitingSignOff = CountStatus("INTERNAL_APPROVAL");
            var reviseCount = CountStatus("REVISE");
            var wonCount = CountStatus("WON");
            var lostCount = CountStatus("LOST");

            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

            var now = DateTime.UtcNow;
            var overdueCount = await userQuery.CountAsync(
                r => OpenStatuses.Contains(r.Status) && r.DueDate < now.Date);

            var actionRequiredRows = await userQuery
                .Where(r =>
                    r.Status == "REVISE" ||
                    r.Status == "READY_FOR_APPROVAL" ||
                    r.Status == "APPROVED")
                .Select(r => new
                {
                    r.Id,
                    r.Identifier,
                    r.Title,
                    ClientName = r.Plant!.Client!.Name,
                    PlantName = r.Plant.Name,
                    r.DueDate,
                    r.Status
                })
                .OrderBy(r => r.DueDate)
                .ToListAsync();
            var actionRequired = actionRequiredRows.Select(r => new UrgentRequisitionDto(
                r.Id,
                r.Identifier,
                r.Title,
                r.ClientName,
                r.PlantName,
                r.DueDate,
                r.Status,
                (int)Math.Ceiling((r.DueDate - now).TotalDays))).ToList();

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
            const string adminRole = "Admin";
            const string managerRole = "Manager";
            const string userRole = "User";

            var usersByRole = await _db.Users
                .GroupBy(u => u.Role)
                .Select(group => new
                {
                    Role = group.Key,
                    Total = group.Count(),
                    Active = group.Count(u => u.IsActive)
                })
                .ToDictionaryAsync(group => group.Role);
            var totalUsers = usersByRole.Values.Sum(group => group.Total);
            var activeUsers = usersByRole.Values.Sum(group => group.Active);
            var inactiveUsers = totalUsers - activeUsers;
            var adminCount = usersByRole.GetValueOrDefault(adminRole)?.Total ?? 0;
            var managerCount = usersByRole.GetValueOrDefault(managerRole)?.Total ?? 0;
            var userCount = usersByRole.GetValueOrDefault(userRole)?.Total ?? 0;
            var totalClients = await _db.Clients.CountAsync();
            var totalPlants = await _db.Plants.CountAsync();

            var activeClients = await _db.PurchaseRequisitions
                .Where(r => AdminActiveClientStatuses.Contains(r.Status))
                .Select(r => r.Plant!.ClientId)
                .Distinct()
                .CountAsync();

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

            var topClients = await _db.PurchaseRequisitions
                .GroupBy(r => new { r.Plant!.ClientId, r.Plant.Client!.Name })
                .Select(group => new
                {
                    group.Key.ClientId,
                    ClientName = group.Key.Name,
                    Total = group.Count(),
                    Won = group.Count(r => r.Status == "WON")
                })
                .OrderByDescending(group => group.Total)
                .Take(5)
                .Select(group => new TopClientDto(
                    group.ClientId,
                    group.ClientName,
                    group.Total,
                    group.Won))
                .ToListAsync();

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

            var teamUsers = await _db.Users
                .Where(u => u.IsActive
                    && u.Role == UserRoles.User
                    && (isAdmin || u.ManagerId == userId))
                .ToListAsync();
            var teamUserIds = teamUsers.Select(u => u.Id).ToList();

            IQueryable<PurchaseRequisition> requisitionsQuery = _db.PurchaseRequisitions;
            if (!isAdmin)
            {
                requisitionsQuery = requisitionsQuery
                    .Where(r => r.CreatedById.HasValue && teamUserIds.Contains(r.CreatedById.Value));
            }

            var teamCounts = await requisitionsQuery
                .GroupBy(r => new { r.CreatedById, r.Status })
                .Select(group => new
                {
                    group.Key.CreatedById,
                    group.Key.Status,
                    Count = group.Count()
                })
                .ToListAsync();
            int CountFor(int? creatorId, string status) => teamCounts
                .Where(group => group.CreatedById == creatorId && group.Status == status)
                .Sum(group => group.Count);
            var teamVolume = teamCounts.Sum(group => group.Count);
            var pendingReview = teamCounts
                .Where(group => group.Status == "REVIEW" || group.Status == "MANAGER_REVIEW")
                .Sum(group => group.Count);
            var pendingSignOff = teamCounts
                .Where(group => group.Status == "INTERNAL_APPROVAL")
                .Sum(group => group.Count);
            var wonCount = teamCounts.Where(group => group.Status == "WON").Sum(group => group.Count);
            var lostCount = teamCounts.Where(group => group.Status == "LOST").Sum(group => group.Count);
            var decided = wonCount + lostCount;
            var winRate = decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1);

            var now = DateTime.UtcNow;

            var pendingReviewRows = await requisitionsQuery
                .Where(r => r.Status == "REVIEW" || r.Status == "MANAGER_REVIEW")
                .OrderBy(r => r.DueDate)
                .Select(r => new
                {
                    r.Id,
                    r.Identifier,
                    r.Title,
                    ClientName = r.Plant!.Client!.Name,
                    PlantName = r.Plant.Name,
                    r.DueDate,
                    r.Status
                })
                .ToListAsync();
            var pendingReviews = pendingReviewRows.Select(r => new UrgentRequisitionDto(
                r.Id,
                r.Identifier,
                r.Title,
                r.ClientName,
                r.PlantName,
                r.DueDate,
                r.Status,
                (int)Math.Ceiling((r.DueDate - now).TotalDays))).ToList();

            var pendingSignOffs = await requisitionsQuery
                .Where(r => r.Status == "INTERNAL_APPROVAL")
                .OrderBy(r => r.AuditLogs
                    .Where(a => a.Action == "InternalApprovalRequested")
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(a => (DateTime?)a.CreatedAt)
                    .FirstOrDefault() ?? r.SubmittedAt ?? r.CreatedAt)
                .Select(r => new PendingSignOffDto(
                    r.Id,
                    r.Identifier,
                    r.Title,
                    r.Plant!.Name,
                    r.Plant.Client!.Name,
                    r.AuditLogs
                        .Where(a => a.Action == "InternalApprovalRequested")
                        .OrderByDescending(a => a.CreatedAt)
                        .Select(a => (DateTime?)a.CreatedAt)
                        .FirstOrDefault() ?? r.SubmittedAt ?? r.CreatedAt))
                .ToListAsync();

            var teamPerformance = teamUsers.Select(user =>
            {
                var userOpen = OpenStatuses.Sum(status => CountFor(user.Id, status));
                var userRevise = CountFor(user.Id, "REVISE");
                var userSubmitted = CountFor(user.Id, "SUBMITTED");
                var userWon = CountFor(user.Id, "WON");
                var userLost = CountFor(user.Id, "LOST");
                var userDecided = userWon + userLost;
                var userWinRate = userDecided == 0
                    ? 0
                    : Math.Round((double)userWon / userDecided * 100, 1);

                return new TeamMemberStatsDto(
                    user.Id,
                    user.DisplayName,
                    userOpen,
                    userRevise,
                    userSubmitted,
                    userWon,
                    userWinRate);
            }).ToList();

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