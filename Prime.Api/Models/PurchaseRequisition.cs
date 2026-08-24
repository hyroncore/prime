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

    public List<RequisitionAuditLog> AuditLogs { get; set; } = new();

    public List<RequisitionAttachment> Attachments { get; set; } = new();
}