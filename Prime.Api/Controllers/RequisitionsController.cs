using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/requisitions")]
public class RequisitionsController : ControllerBase
{
    private static readonly string[] OpenStatuses =
    {
        nameof(RequisitionStatus.NEW),
        nameof(RequisitionStatus.REVIEW),
        nameof(RequisitionStatus.PROCESSING)
    };

    private readonly PrimeDbContext _db;
    private readonly IWebHostEnvironment _env;

    public RequisitionsController(PrimeDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet]
    public async Task<ActionResult<List<RequisitionDto>>> List(
        [FromQuery] string? search = null,
        [FromQuery] int? plantId = null,
        [FromQuery] string? sectorCode = null,
        [FromQuery] string? status = null)
    {
        var query = ApplyFilters(_db.PurchaseRequisitions.AsQueryable(), search, plantId, sectorCode, status);

        var requisitions = await query
            .Include(r => r.Plant)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(requisitions.Select(r => ToDto(r)).ToList());
    }

    [HttpGet("stats")]
    public async Task<ActionResult<RequisitionStatsDto>> Stats(
        [FromQuery] string? search = null,
        [FromQuery] int? plantId = null,
        [FromQuery] string? sectorCode = null,
        [FromQuery] string? status = null)
    {
        var query = ApplyFilters(_db.PurchaseRequisitions.AsQueryable(), search, plantId, sectorCode, status);
        var now = DateTime.UtcNow;

        var total = await query.CountAsync();
        var open = await query.CountAsync(r => OpenStatuses.Contains(r.Status));
        var overdue = await query.CountAsync(r =>
            OpenStatuses.Contains(r.Status) && r.DueDate < now.Date);
        var won = await query.CountAsync(r => r.Status == nameof(RequisitionStatus.WON));
        var lost = await query.CountAsync(r => r.Status == nameof(RequisitionStatus.LOST));

        var decided = won + lost;
        var winRate = decided == 0 ? 0 : Math.Round((double)won / decided * 100, 1);

        return Ok(new RequisitionStatsDto(total, open, overdue, won, lost, winRate));
    }

    private static IQueryable<PurchaseRequisition> ApplyFilters(
        IQueryable<PurchaseRequisition> query,
        string? search,
        int? plantId,
        string? sectorCode,
        string? status)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r =>
                r.Identifier.Contains(term) ||
                r.ExternalRef.Contains(term) ||
                r.Title.Contains(term));
        }

        if (plantId.HasValue)
        {
            query = query.Where(r => r.PlantId == plantId.Value);
        }

        if (!string.IsNullOrWhiteSpace(sectorCode))
        {
            query = query.Where(r => r.SectorCode == sectorCode);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statuses = status
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToUpperInvariant())
                .ToList();

            query = query.Where(r => statuses.Contains(r.Status));
        }

        return query;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RequisitionDto>> GetById(int id)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .Include(r => r.AuditLogs)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (requisition is null)
        {
            return NotFound();
        }

        var dto = ToDto(requisition);
        dto = dto with
        {
            AuditLogs = requisition.AuditLogs
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AuditLogDto(a.Id, a.Action, a.StatusFrom, a.StatusTo, a.Notes, a.CreatedAt))
                .ToList(),
            Attachments = await _db.RequisitionAttachments
                .Where(a => a.RequisitionId == id)
                .OrderByDescending(a => a.UploadedAt)
                .Select(a => new AttachmentDto(a.Id, a.RequisitionId, a.FileName, a.ContentType, a.SizeBytes, a.UploadedAt))
                .ToListAsync()
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<RequisitionDto>> Create([FromBody] CreateRequisitionRequest request)
    {
        var plant = await _db.Plants
            .Include(p => p.Client)
            .FirstOrDefaultAsync(p => p.Id == request.PlantId);

        if (plant is null)
        {
            return BadRequest(new { message = "Invalid plant." });
        }

        if (!Sectors.IsValid(request.SectorCode))
        {
            return BadRequest(new { message = "قسم غير صالح. يجب أن يكون الرمز بين 01 و 10." });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        if (string.IsNullOrWhiteSpace(request.ExternalRef))
        {
            return BadRequest(new { message = "ExternalRef is required." });
        }

        var (identifier, _) = await RequisitionCodeGenerator.NextIdentifierAsync(
            _db,
            plant.ShortCode,
            request.SectorCode);

        var requisition = new PurchaseRequisition
        {
            Identifier = identifier,
            ExternalRef = request.ExternalRef.Trim(),
            PlantId = plant.Id,
            SectorCode = request.SectorCode,
            Title = request.Title.Trim(),
            DueDate = DateTime.SpecifyKind(request.DueDate.Date, DateTimeKind.Utc),
            ReceivedAt = request.ReceivedAt.HasValue
                ? DateTime.SpecifyKind(request.ReceivedAt.Value.Date, DateTimeKind.Utc)
                : DateTime.UtcNow,
            Status = nameof(RequisitionStatus.NEW),
            ClientNotes = request.ClientNotes
        };

        _db.PurchaseRequisitions.Add(requisition);
        await _db.SaveChangesAsync();

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "Created",
            StatusFrom = null,
            StatusTo = requisition.Status,
            Notes = $"تم إنشاء الطلب بالمعرف {requisition.Identifier}"
        });
        await _db.SaveChangesAsync();

        requisition.Plant = plant;

        return CreatedAtAction(nameof(GetById), new { id = requisition.Id }, ToDto(requisition));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<RequisitionDto>> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (requisition is null)
        {
            return NotFound();
        }

        if (!Enum.TryParse<RequisitionStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return BadRequest(new { message = $"Unknown status '{request.Status}'." });
        }

        if (string.IsNullOrWhiteSpace(request.Notes))
        {
            return BadRequest(new { message = "الوصف مطلوب لتغيير حالة الطلب." });
        }

        var currentStatus = Enum.Parse<RequisitionStatus>(requisition.Status);
        if (!RequisitionStatusService.IsTransitionAllowed(currentStatus, newStatus))
        {
            return BadRequest(new
            {
                message = $"Transition from {requisition.Status} to {request.Status} is not allowed."
            });
        }

        var statusFrom = requisition.Status;
        requisition.Status = newStatus.ToString();

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "StatusChanged",
            StatusFrom = statusFrom,
            StatusTo = requisition.Status,
            Notes = request.Notes.Trim()
        });

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RequisitionDto>> Update(int id, [FromBody] UpdateRequisitionRequest request)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (requisition is null)
        {
            return NotFound();
        }

        var plant = await _db.Plants.FirstOrDefaultAsync(p => p.Id == request.PlantId);

        if (plant is null)
        {
            return BadRequest(new { message = "Invalid plant." });
        }

        if (!Sectors.IsValid(request.SectorCode))
        {
            return BadRequest(new { message = "قسم غير صالح. يجب أن يكون الرمز بين 01 و 10." });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        if (string.IsNullOrWhiteSpace(request.ExternalRef))
        {
            return BadRequest(new { message = "ExternalRef is required." });
        }

        var oldIdentifier = requisition.Identifier;

        requisition.ExternalRef = request.ExternalRef.Trim();
        requisition.PlantId = plant.Id;

        if (requisition.SectorCode != request.SectorCode)
        {
            var (identifier, _) = await RequisitionCodeGenerator.NextIdentifierAsync(
                _db,
                plant.ShortCode,
                request.SectorCode);
            requisition.Identifier = identifier;
        }

        requisition.SectorCode = request.SectorCode;
        requisition.Title = request.Title.Trim();
        requisition.DueDate = DateTime.SpecifyKind(request.DueDate.Date, DateTimeKind.Utc);
        requisition.ReceivedAt = request.ReceivedAt.HasValue
            ? DateTime.SpecifyKind(request.ReceivedAt.Value.Date, DateTimeKind.Utc)
            : requisition.ReceivedAt;
        requisition.ClientNotes = request.ClientNotes;

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "Updated",
            StatusFrom = null,
            StatusTo = null,
            Notes = oldIdentifier != requisition.Identifier
                ? $"تم تعديل بيانات الطلب — تغيّر المعرف من {oldIdentifier} إلى {requisition.Identifier}"
                : "تم تعديل بيانات الطلب"
        });

        await _db.SaveChangesAsync();

        requisition.Plant = plant;

        return Ok(ToDto(requisition));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Attachments)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (requisition is null)
        {
            return NotFound();
        }

        var paths = requisition.Attachments
            .Select(a => Path.Combine(_env.ContentRootPath, "uploads", "requisitions", id.ToString(), a.StoredFileName))
            .ToList();

        _db.PurchaseRequisitions.Remove(requisition);
        await _db.SaveChangesAsync();

        foreach (var path in paths)
        {
            if (System.IO.File.Exists(path))
            {
                System.IO.File.Delete(path);
            }
        }

        return NoContent();
    }

    private static RequisitionDto ToDto(PurchaseRequisition r) => new(
        r.Id,
        r.Identifier,
        r.ExternalRef,
        r.PlantId,
        r.Plant?.PlantName ?? string.Empty,
        r.Plant?.ShortCode ?? string.Empty,
        r.Plant?.ClientId ?? 0,
        r.Plant?.Client?.Name ?? string.Empty,
        r.SectorCode,
        Sectors.GetName(r.SectorCode),
        r.Title,
        r.DueDate,
        r.Status,
        r.ClientNotes,
        r.CreatedAt,
        r.ReceivedAt);
}