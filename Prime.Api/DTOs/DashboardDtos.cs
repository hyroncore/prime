namespace Prime.Api.DTOs;

public record UrgentRequisitionDto(
    int Id,
    string Identifier,
    string Title,
    string ClientName,
    string PlantName,
    DateTime DueDate,
    string Status,
    int DaysLeft);

public record PlantDto(
    int Id,
    int ClientId,
    string ClientName,
    string PlantName,
    string ShortCode);

public record PlantDetailDto(
    int Id,
    string PlantName,
    string ShortCode,
    int ClientId,
    string ClientName,
    string? ClientContactName,
    string? ClientContactPhone,
    int OpenRequisitions,
    int TotalRequisitions,
    int WonCount,
    int LostCount,
    double WinRate);

public record ClientDto(
    int Id,
    string Name,
    string? PrimaryContactName,
    string? PrimaryContactPhone,
    DateTime CreatedAt,
    List<PlantDto> Plants,
    int OpenRequisitions,
    int TotalWon);

public record RecentUserDto(
    int Id,
    string Username,
    string DisplayName,
    string Role,
    bool IsActive,
    DateTime? LastLoginAt);

public record TopClientDto(
    int Id,
    string Name,
    int TotalRequisitions,
    int WonCount);

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
    List<ClientBreakdownDto> ClientBreakdown,
    int TotalUsers,
    int ActiveUsers,
    int TotalClients,
    int ActiveClients,
    List<RecentUserDto> RecentUsers,
    List<TopClientDto> TopClients);

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

public record UserDashboardStatsDto(
    int MyActiveRequisitions,
    int MyDrafts,
    int AwaitingReview,
    int AwaitingSignOff,
    int ReviseCount,
    int OverdueCount,
    int WonCount,
    int LostCount,
    double WinRate,
    List<UrgentRequisitionDto> ActionRequired);

public record PendingSignOffDto(
    int Id,
    string Identifier,
    string Title,
    string PlantName,
    string ClientName,
    DateTime SubmittedAt);

public record TeamMemberStatsDto(
    int UserId,
    string DisplayName,
    int OpenRequisitions,
    int ReviseCount,
    int SubmittedCount,
    int WonCount,
    double WinRate);

public record ManagerDashboardStatsDto(
    int TeamVolume,
    int PendingReview,
    int PendingSignOff,
    double TeamWinRate,
    int WonCount,
    int LostCount,
    List<TeamMemberStatsDto> TeamPerformance,
    List<UrgentRequisitionDto> PendingReviews,
    List<PendingSignOffDto> PendingSignOffs);

public record AdminDashboardStatsDto(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int AdminCount,
    int ManagerCount,
    int UserCount,
    int TotalClients,
    int ActiveClients,
    int TotalPlants,
    List<RecentUserDto> RecentUsers,
    List<TopClientDto> TopClients);

public record TableCountsDto(
    int Users,
    int ActiveUsers,
    int Clients,
    int Plants,
    int Requisitions,
    int AuditLogs,
    int Attachments,
    int Notifications,
    int Permissions);

public record SystemHealthDto(
    string Status,
    long DatabaseLatencyMs,
    string? DatabaseError,
    string DatabaseProvider,
    string DatabaseName,
    string ServerUptime,
    string Environment,
    TableCountsDto TableCounts,
    DateTime? LastBackupAt,
    string? LastBackupNote,
    DateTime CheckedAt);

public record BackupHistoryDto(
    int Id,
    DateTime CreatedAt,
    int CreatedById,
    string Notes,
    long? FileSize);