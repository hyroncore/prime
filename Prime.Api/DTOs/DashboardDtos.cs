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