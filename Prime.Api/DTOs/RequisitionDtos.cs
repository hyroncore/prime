namespace Prime.Api.DTOs;

public record SectorDto(
    string Code,
    string NameArabic);

public record AuditLogDto(
    int Id,
    string Action,
    string? StatusFrom,
    string? StatusTo,
    string? Notes,
    DateTime CreatedAt);

public record AttachmentDto(
    int Id,
    int RequisitionId,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTime UploadedAt);

public record RequisitionDto(
    int Id,
    string Identifier,
    string ExternalRef,
    int PlantId,
    string PlantName,
    string PlantShortCode,
    int ClientId,
    string ClientName,
    string SectorCode,
    string SectorName,
    string Title,
    DateTime DueDate,
    string Status,
    string? ClientNotes,
    DateTime CreatedAt,
    DateTime ReceivedAt,
    List<AuditLogDto>? AuditLogs = null,
    List<AttachmentDto>? Attachments = null);

public record RequisitionStatsDto(
    int TotalCount,
    int OpenCount,
    int OverdueCount,
    int WonCount,
    int LostCount,
    double WinRate);

public record SectorBreakdownDto(
    string SectorCode,
    string SectorName,
    int Total,
    int Open);

public record ClientBreakdownDto(
    int ClientId,
    string ClientName,
    int Total,
    int Open,
    int Won);

public record DashboardStatsDto(
    int OpenCount,
    int NewCount,
    int ReviewCount,
    int ProcessingCount,
    int OverdueCount,
    int SubmittedCount,
    int WonCount,
    int LostCount,
    int DeclinedCount,
    int TotalCount,
    double WinRate,
    List<UrgentRequisitionDto> OverdueRequisitions,
    List<SectorBreakdownDto> SectorBreakdown,
    List<ClientBreakdownDto> ClientBreakdown);