using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly PrimeDbContext _db;
    private readonly DatabaseBackupService _backupService;
    private readonly ILogger<AdminController> _logger;
    private readonly IConfiguration _configuration;

    public AdminController(
        PrimeDbContext db, 
        DatabaseBackupService backupService, 
        ILogger<AdminController> logger,
        IConfiguration configuration)
    {
        _db = db;
        _backupService = backupService;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Detailed system health check for Neon PostgreSQL
    /// </summary>
    [HttpGet("system/health")]
    public async Task<ActionResult<SystemHealthDto>> GetSystemHealth()
    {
        var stopwatch = Stopwatch.StartNew();
        
        // Database ping
        var dbHealthy = false;
        var latencyMs = 0L;
        string? dbError = null;
        
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            stopwatch.Stop();
            latencyMs = stopwatch.ElapsedMilliseconds;
            dbHealthy = true;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            latencyMs = stopwatch.ElapsedMilliseconds;
            dbError = ex.Message;
            _logger.LogError(ex, "Database health check failed");
        }

        // Table record counts
        var totalUsers = await _db.Users.CountAsync();
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);
        var totalClients = await _db.Clients.CountAsync();
        var totalPlants = await _db.Plants.CountAsync();
        var totalRequisitions = await _db.PurchaseRequisitions.CountAsync();
        var totalAuditLogs = await _db.RequisitionAuditLogs.CountAsync();
        var totalAttachments = await _db.RequisitionAttachments.CountAsync();
        var totalNotifications = await _db.Notifications.CountAsync();
        var totalPermissions = await _db.Permissions.CountAsync();

        var tableCounts = new TableCountsDto(
            totalUsers,
            activeUsers,
            totalClients,
            totalPlants,
            totalRequisitions,
            totalAuditLogs,
            totalAttachments,
            totalNotifications,
            totalPermissions
        );

        // Determine health status - only Healthy or Unreachable
        var status = dbHealthy ? "سليم" : "غير متاح";

        // Get last backup info from audit logs or backup history
        var lastBackupLog = await _db.RequisitionAuditLogs
            .Where(a => a.Action == "BackupCreated")
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new { a.CreatedAt, a.Notes })
            .FirstOrDefaultAsync();

        var systemHealth = new SystemHealthDto(
            status,
            latencyMs,
            dbError,
            GetUptimeArabic(),
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? "تطوير" : "إنتاج",
            tableCounts,
            lastBackupLog?.CreatedAt,
            lastBackupLog?.Notes,
            DateTime.UtcNow
        );

        return Ok(systemHealth);
    }

    /// <summary>
    /// Export full database backup as JSON stream
    /// </summary>
    [HttpPost("backup/export")]
    public async Task<IActionResult> ExportBackup()
    {
        var userId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
        _logger.LogInformation("Admin {UserId} requested database backup export", userId);

        try
        {
            var stream = await _backupService.CreateBackupAsync(HttpContext.RequestAborted);
            
            var fileName = $"prime-backup-{DateTime.UtcNow:yyyy-MM-dd-HHmmss}.json";
            
            // Log the backup creation
            var auditLog = new RequisitionAuditLog
            {
                Action = "BackupCreated",
                Notes = $"Database backup exported by admin. File size: {stream.Length} bytes",
                CreatedAt = DateTime.UtcNow
            };
            _db.RequisitionAuditLogs.Add(auditLog);
            await _db.SaveChangesAsync();

            return File(stream, "application/json", $"prime-backup-{DateTime.UtcNow:yyyy-MM-dd-HHmmss}.json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export database backup");
            return StatusCode(500, new { message = "فشل في تصدير النسخة الاحتياطية", error = ex.Message });
        }
    }

    /// <summary>
    /// Get backup history from audit logs
    /// </summary>
    [HttpGet("backup/history")]
    public async Task<ActionResult<List<BackupHistoryDto>>> GetBackupHistory()
    {
        var history = await _db.RequisitionAuditLogs
            .Where(a => a.Action == "BackupCreated")
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .Select(a => new BackupHistoryDto(
                a.Id,
                a.CreatedAt,
                0, // Not tracked in audit log
                a.Notes ?? "",
                ExtractFileSize(a.Notes)
            ))
            .ToListAsync();

        return Ok(history);
    }

    private static long? ExtractFileSize(string? notes)
    {
        if (string.IsNullOrEmpty(notes)) return null;
        var match = System.Text.RegularExpressions.Regex.Match(notes, @"File size: (\d+) bytes");
        return match.Success && long.TryParse(match.Groups[1].Value, out var size) ? size : null;
    }

    private string GetUptimeArabic()
    {
        var uptime = TimeSpan.FromMilliseconds(Environment.TickCount64);
        var parts = new List<string>();
        if (uptime.Days > 0) parts.Add($"{uptime.Days} يوم");
        if (uptime.Hours > 0) parts.Add($"{uptime.Hours} ساعة");
        if (uptime.Minutes > 0) parts.Add($"{uptime.Minutes} دقيقة");
        return parts.Count > 0 ? string.Join("، ", parts) : "أقل من دقيقة";
    }
}