namespace Prime.Api.Models;

public class RequisitionAttachment
{
    public int Id { get; set; }

    public int RequisitionId { get; set; }

    public PurchaseRequisition? Requisition { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string StoredFileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}