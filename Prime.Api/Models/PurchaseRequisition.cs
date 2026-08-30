using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class PurchaseRequisition
{
    public int Id { get; set; }

    [Required]
    public string Identifier { get; set; } = string.Empty;

    [Required]
    public string ExternalRef { get; set; } = string.Empty;

    public int PlantId { get; set; }

    public Plant? Plant { get; set; }

    [Required]
    public string SectorCode { get; set; } = string.Empty;

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public DateTime DueDate { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public string Status { get; set; } = nameof(RequisitionStatus.NEW);

    public string? ClientNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Tracking fields
    public int? CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }

    public bool IsInternallyApproved { get; set; } = false;
    public DateTime? InternalApprovedAt { get; set; }
    public int? ApprovedById { get; set; }
    public AppUser? ApprovedBy { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public int? SubmittedById { get; set; }
    public AppUser? SubmittedBy { get; set; }

    public DateTime? ProcessedAt { get; set; }
    public int? ProcessedById { get; set; }
    public AppUser? ProcessedBy { get; set; }

    public DateTime? RevisedAt { get; set; }
    public int? RevisedById { get; set; }
    public AppUser? RevisedBy { get; set; }
    public string? RevisionNotes { get; set; }

    public DateTime? OutcomeRecordedAt { get; set; }
    public int? OutcomeRecordedById { get; set; }
    public AppUser? OutcomeRecordedBy { get; set; }

    public DateTime? DeclinedAt { get; set; }
    public int? DeclinedById { get; set; }
    public AppUser? DeclinedBy { get; set; }

    public DateTime? ArchivedAt { get; set; }
    public int? ArchivedById { get; set; }
    public AppUser? ArchivedBy { get; set; }

    public List<RequisitionAuditLog> AuditLogs { get; set; } = new();

    public List<RequisitionAttachment> Attachments { get; set; } = new();
}