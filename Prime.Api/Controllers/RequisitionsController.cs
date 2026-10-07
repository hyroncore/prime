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
[Route("api/requisitions")]
public class RequisitionsController : ControllerBase
{
    private static readonly string[] OpenStatuses =
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
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var query = _db.PurchaseRequisitions.AsQueryable();
        query = ApplyFilters(query, search, plantId, sectorCode, status);
        if (User.IsInRole(UserRoles.Manager) && !User.IsInRole(UserRoles.Admin))
        {
            var managerId = GetCurrentUserId();
            query = query.Where(r => r.CreatedBy != null && r.CreatedBy.ManagerId == managerId);
        }

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
            query = query.Where(r => r.ReceivedAt >= fromUtc);
        }
        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(r => r.ReceivedAt < toUtc);
        }

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
        var query = _db.PurchaseRequisitions.AsQueryable();
        query = ApplyFilters(query, search, plantId, sectorCode, status);
        var now = DateTime.UtcNow;
        var nowDate = now.Date;

        var requisitions = await query.ToListAsync();
        var total = requisitions.Count;
        var open = requisitions.Count(r => OpenStatuses.Contains(r.Status));
        var overdue = requisitions.Count(r => OpenStatuses.Contains(r.Status) && r.DueDate < nowDate);
        var won = requisitions.Count(r => r.Status == nameof(RequisitionStatus.WON));
        var lost = requisitions.Count(r => r.Status == nameof(RequisitionStatus.LOST));

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
            plant.Code,
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
            ClientNotes = request.ClientNotes,
            CreatedById = GetCurrentUserId()
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

    [HttpPost("{id:int}/submit-review")]
    [Authorize(Policy = "req:submit_review")]
    public async Task<ActionResult<RequisitionDto>> SubmitForReview(int id, [FromBody] SubmitForReviewRequest request)
    {
        var requisition = await _db.PurchaseRequisitions.FindAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.NEW))
            return BadRequest("Only NEW requisitions can be submitted for review");

        if (requisition.CreatedById != GetCurrentUserId())
            return Forbid();

        requisition.Status = nameof(RequisitionStatus.REVIEW);

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "SubmittedForReview",
            StatusFrom = nameof(RequisitionStatus.NEW),
            StatusTo = nameof(RequisitionStatus.REVIEW),
            Notes = request.Notes
        });
        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/review")]
    [Authorize(Policy = "req:review_action")]
    public async Task<ActionResult<RequisitionDto>> ReviewAction(int id, [FromBody] ReviewActionRequest request)
    {
        var requisition = await GetWithCreatorAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.REVIEW))
            return BadRequest("Only REVIEW requisitions can be reviewed");

        if (!CanManageRequisition(requisition))
            return Forbid();

        if (request.Action != "approve" && request.Action != "decline")
            return BadRequest("Action must be 'approve' or 'decline'");

        var newStatus = request.Action == "approve" 
            ? nameof(RequisitionStatus.PROCESSING) 
            : nameof(RequisitionStatus.DECLINED);

        var statusFrom = requisition.Status;
        requisition.Status = newStatus;
        
        if (request.Action == "approve")
        {
            requisition.ProcessedById = GetCurrentUserId();
        }
        else
        {
            requisition.DeclinedAt = DateTime.UtcNow;
            requisition.DeclinedById = GetCurrentUserId();
        }

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "Reviewed",
            StatusFrom = statusFrom,
            StatusTo = requisition.Status,
            Notes = request.Notes
        });

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/request-manager-review")]
    [Authorize(Policy = "req:request_submit")]
    public async Task<ActionResult<RequisitionDto>> RequestManagerReview(
        int id,
        [FromBody] RequestSubmitRequest request)
    {
        var requisition = await _db.PurchaseRequisitions.FindAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.PROCESSING) &&
            requisition.Status != nameof(RequisitionStatus.REVISE))
            return BadRequest("Only PROCESSING or REVISE requisitions can be sent for manager review");

        if (requisition.CreatedById != GetCurrentUserId())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Review notes are required." });

        var previousStatus = requisition.Status;
        requisition.Status = nameof(RequisitionStatus.MANAGER_REVIEW);
        var notes = request.Notes.Trim();

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "SubmittedForManagerReview",
            StatusFrom = previousStatus,
            StatusTo = requisition.Status,
            Notes = notes
        });

        AddNotification(
            requisition,
            NotificationTypes.ManagerReviewRequested,
            $"مراجعة مطلوبة: {requisition.Identifier}",
            notes);

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/manager-review")]
    [Authorize(Policy = "req:review_action")]
    public async Task<ActionResult<RequisitionDto>> ManagerReview(
        int id,
        [FromBody] InternalActionRequest request)
    {
        var requisition = await GetWithCreatorAsync(id);
        if (requisition is null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.MANAGER_REVIEW))
            return BadRequest("Only MANAGER_REVIEW requisitions can be reviewed");

        if (request.Action != "approve" && request.Action != "revise")
            return BadRequest("Action must be 'approve' or 'revise'");

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Review notes are required." });

        if (!CanManageRequisition(requisition))
            return Forbid();

        var now = DateTime.UtcNow;
        var previousStatus = requisition.Status;
        requisition.Status = request.Action == "approve"
            ? nameof(RequisitionStatus.READY_FOR_APPROVAL)
            : nameof(RequisitionStatus.REVISE);

        if (request.Action == "revise")
        {
            requisition.RevisedAt = now;
            requisition.RevisedById = GetCurrentUserId();
            requisition.RevisionNotes = request.Notes.Trim();
        }

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = request.Action == "approve" ? "ManagerReviewAccepted" : "RevisionRequested",
            StatusFrom = previousStatus,
            StatusTo = requisition.Status,
            Notes = request.Notes.Trim(),
            CreatedAt = now
        });

        AddNotification(
            requisition,
            request.Action == "approve"
                ? NotificationTypes.ManagerReviewAccepted
                : NotificationTypes.RequisitionRevisionRequested,
            request.Action == "approve"
                ? $"اكتملت مراجعة المدير: {requisition.Identifier}"
                : $"مطلوب تعديل الطلب: {requisition.Identifier}",
            request.Notes.Trim());

        await _db.SaveChangesAsync();
        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/request-internal-approval")]
    [Authorize(Policy = "req:request_submit")]
    public async Task<ActionResult<RequisitionDto>> RequestInternalApproval(
        int id,
        [FromBody] RequestSubmitRequest request)
    {
        var requisition = await _db.PurchaseRequisitions.FindAsync(id);
        if (requisition is null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.READY_FOR_APPROVAL))
            return BadRequest("Only requisitions accepted by manager review can request internal approval");

        if (requisition.CreatedById != GetCurrentUserId())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Approval request notes are required." });

        var now = DateTime.UtcNow;
        requisition.Status = nameof(RequisitionStatus.INTERNAL_APPROVAL);
        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "InternalApprovalRequested",
            StatusFrom = nameof(RequisitionStatus.READY_FOR_APPROVAL),
            StatusTo = requisition.Status,
            Notes = request.Notes.Trim(),
            CreatedAt = now
        });

        AddNotification(
            requisition,
            NotificationTypes.InternalApprovalRequested,
            $"اعتماد داخلي مطلوب: {requisition.Identifier}",
            request.Notes.Trim());

        await _db.SaveChangesAsync();
        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/submit-to-client")]
    [Authorize(Policy = "req:request_submit")]
    public async Task<ActionResult<RequisitionDto>> SubmitToClient(
        int id,
        [FromBody] RequestSubmitRequest request)
    {
        var requisition = await _db.PurchaseRequisitions.FindAsync(id);
        if (requisition is null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.APPROVED))
            return BadRequest("Only internally approved requisitions can be submitted to the client");

        if (requisition.CreatedById != GetCurrentUserId())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Submission notes are required." });

        var now = DateTime.UtcNow;
        requisition.Status = nameof(RequisitionStatus.SUBMITTED);
        requisition.SubmittedAt = now;
        requisition.SubmittedById = GetCurrentUserId();
        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "SubmittedToClient",
            StatusFrom = nameof(RequisitionStatus.APPROVED),
            StatusTo = requisition.Status,
            Notes = request.Notes.Trim(),
            CreatedAt = now
        });
        await _db.SaveChangesAsync();
        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/request-manager-input")]
    [Authorize(Policy = "req:request_submit")]
    public async Task<ActionResult<RequisitionDto>> RequestManagerInput(
        int id,
        [FromBody] RequestManagerInputRequest request)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Plant)
                .ThenInclude(p => p!.Client)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (requisition is null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.PROCESSING))
            return BadRequest("Only PROCESSING requisitions can request manager input");

        if (requisition.CreatedById != GetCurrentUserId())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Request notes are required." });

        var now = DateTime.UtcNow;
        var notes = request.Notes.Trim();
        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "ManagerInputRequested",
            StatusFrom = requisition.Status,
            StatusTo = requisition.Status,
            Notes = notes,
            CreatedAt = now
        });

        _db.Notifications.Add(new Notification
        {
            RequisitionId = requisition.Id,
            Type = NotificationTypes.ManagerInputRequested,
            Title = $"طلب مراجعة المدير: {requisition.Identifier}",
            Message = notes,
            DedupKey = $"manager-input:{requisition.Id}:{Guid.NewGuid():N}",
            CreatedAt = now
        });

        await _db.SaveChangesAsync();
        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/approve-internal")]
    [Authorize(Policy = "req:approve_internal")]
    public async Task<ActionResult<RequisitionDto>> InternalAction(int id, [FromBody] InternalActionRequest request)
    {
        var requisition = await GetWithCreatorAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.INTERNAL_APPROVAL))
            return BadRequest("Only INTERNAL_APPROVAL requisitions can be internally actioned");

        if (request.Action != "approve" && request.Action != "revise")
            return BadRequest("Action must be 'approve' or 'revise'");

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Internal approval notes are required." });

        if (!CanManageRequisition(requisition))
            return Forbid();

        var now = DateTime.UtcNow;
        var newStatus = request.Action == "approve" 
            ? nameof(RequisitionStatus.APPROVED) 
            : nameof(RequisitionStatus.REVISE);

        var statusFrom = requisition.Status;
        requisition.Status = newStatus;

        if (request.Action == "approve")
        {
            requisition.IsInternallyApproved = true;
            requisition.InternalApprovedAt = now;
            requisition.ApprovedById = GetCurrentUserId();
        }
        else
        {
            requisition.RevisedAt = now;
            requisition.RevisedById = GetCurrentUserId();
            requisition.RevisionNotes = request.Notes.Trim();
        }

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = request.Action == "approve" ? "InternallyApproved" : "RevisionRequested",
            StatusFrom = statusFrom,
            StatusTo = requisition.Status,
            Notes = request.Notes.Trim(),
            CreatedAt = now
        });

        AddNotification(
            requisition,
            request.Action == "approve"
                ? NotificationTypes.InternalApprovalGranted
                : NotificationTypes.RequisitionRevisionRequested,
            request.Action == "approve"
                ? $"تم الاعتماد الداخلي: {requisition.Identifier}"
                : $"مطلوب تعديل الطلب: {requisition.Identifier}",
            request.Notes.Trim());

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/request-revision")]
    [Authorize(Policy = "req:request_revision")]
    public async Task<ActionResult<RequisitionDto>> RequestRevision(int id, [FromBody] RequestRevisionRequest request)
    {
        var requisition = await GetWithCreatorAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.MANAGER_REVIEW) &&
            requisition.Status != nameof(RequisitionStatus.INTERNAL_APPROVAL))
            return BadRequest("Only requisitions awaiting manager review or internal approval can be sent back for revision");

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Revision notes are required." });

        if (!CanManageRequisition(requisition))
            return Forbid();

        var previousStatus = requisition.Status;
        var now = DateTime.UtcNow;
        requisition.Status = nameof(RequisitionStatus.REVISE);
        requisition.RevisedAt = now;
        requisition.RevisedById = GetCurrentUserId();
        requisition.RevisionNotes = request.Notes.Trim();

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "RevisionRequested",
            StatusFrom = previousStatus,
            StatusTo = nameof(RequisitionStatus.REVISE),
            Notes = request.Notes.Trim(),
            CreatedAt = now
        });

        AddNotification(
            requisition,
            NotificationTypes.RequisitionRevisionRequested,
            $"مطلوب تعديل الطلب: {requisition.Identifier}",
            request.Notes.Trim());

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPost("{id:int}/mark-outcome")]
    [Authorize(Policy = "req:mark_outcome")]
    public async Task<ActionResult<RequisitionDto>> MarkOutcome(int id, [FromBody] MarkOutcomeRequest request)
    {
        var requisition = await _db.PurchaseRequisitions.FindAsync(id);
        if (requisition == null) return NotFound();

        if (requisition.Status != nameof(RequisitionStatus.SUBMITTED))
            return BadRequest("Only SUBMITTED requisitions can have outcome marked");

        if (User.IsInRole(UserRoles.User) &&
            requisition.CreatedById != GetCurrentUserId())
        {
            return Forbid();
        }

        if (request.Outcome != "WON" && request.Outcome != "LOST")
            return BadRequest("Outcome must be 'WON' or 'LOST'");

        var newStatus = request.Outcome;
        requisition.Status = newStatus;
        requisition.OutcomeRecordedAt = DateTime.UtcNow;
        requisition.OutcomeRecordedById = GetCurrentUserId();

        _db.RequisitionAuditLogs.Add(new RequisitionAuditLog
        {
            RequisitionId = requisition.Id,
            Action = "OutcomeRecorded",
            StatusFrom = nameof(RequisitionStatus.SUBMITTED),
            StatusTo = newStatus,
            Notes = request.Notes
        });

        await _db.SaveChangesAsync();

        return Ok(ToDto(requisition));
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<RequisitionDto>> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var requisition = await _db.PurchaseRequisitions
            .Include(r => r.Plant)!
                .ThenInclude(p => p!.Client)
            .Include(r => r.CreatedBy)
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
        if (User.IsInRole(UserRoles.User) &&
            requisition.CreatedById != GetCurrentUserId())
        {
            return Forbid();
        }
        if (User.IsInRole(UserRoles.Manager) &&
            !CanManageRequisition(requisition))
        {
            return Forbid();
        }

        if (!RequisitionStatusService.CanTransition(currentStatus, newStatus, User.FindFirstValue(ClaimTypes.Role)!, User.Claims.Where(c => c.Type == "permission").Select(c => c.Value)))
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
                plant.Code,
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

    [Authorize(Roles = "Manager")]
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

        if (requisition.Status != nameof(RequisitionStatus.NEW))
            return BadRequest("Only NEW requisitions can be deleted");

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

    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out var id) ? id : 0;
    }

    private Task<PurchaseRequisition?> GetWithCreatorAsync(int id) =>
        _db.PurchaseRequisitions
            .Include(r => r.CreatedBy)
            .FirstOrDefaultAsync(r => r.Id == id);

    private bool CanManageRequisition(PurchaseRequisition requisition) =>
        User.IsInRole(UserRoles.Admin) ||
        (User.IsInRole(UserRoles.Manager) &&
         requisition.CreatedBy?.ManagerId == GetCurrentUserId());

    private void AddNotification(
        PurchaseRequisition requisition,
        string type,
        string title,
        string message)
    {
        _db.Notifications.Add(new Notification
        {
            RequisitionId = requisition.Id,
            Type = type,
            Title = title,
            Message = message,
            DedupKey = $"{type}:{requisition.Id}:{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        });
    }

    private static RequisitionDto ToDto(PurchaseRequisition r) => new(
        r.Id,
        r.Identifier,
        r.ExternalRef,
        r.PlantId,
        r.Plant?.Name ?? string.Empty,
        r.Plant?.Code ?? string.Empty,
        r.Plant?.ClientId ?? 0,
        r.Plant?.Client?.Name ?? string.Empty,
        r.SectorCode,
        Sectors.GetName(r.SectorCode),
        r.Title,
        r.DueDate,
        r.Status,
        r.ClientNotes,
        r.CreatedAt,
        r.ReceivedAt,
        CreatedById: r.CreatedById);
}