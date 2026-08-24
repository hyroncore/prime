namespace Prime.Api.Models;

public class RequisitionAuditLog
{
    public int Id { get; set; }

    public int RequisitionId { get; set; }

    public PurchaseRequisition? Requisition { get; set; }

    public string Action { get; set; } = string.Empty;

    public string? StatusFrom { get; set; }

    public string? StatusTo { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}