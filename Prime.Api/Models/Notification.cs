namespace Prime.Api.Models;

public class Notification
{
    public int Id { get; set; }

    public int? RequisitionId { get; set; }

    public PurchaseRequisition? Requisition { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string DedupKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReadAt { get; set; }

    public DateTime? DismissedAt { get; set; }
}

public static class NotificationTypes
{
    public const string DueSoon = "DueSoon";
    public const string Overdue = "Overdue";
    public const string SubmittedFollowUp = "SubmittedFollowUp";
}