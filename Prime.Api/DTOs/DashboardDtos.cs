namespace Prime.Api.DTOs;

public record PlantDto(
    int Id,
    int ClientId,
    string ClientName,
    string PlantName,
    string ShortCode);

public record ClientDto(
    int Id,
    string Name,
    string? PrimaryContactName,
    string? PrimaryContactPhone,
    DateTime CreatedAt,
    List<PlantDto> Plants,
    int OpenRequisitions,
    int TotalWon);

public record UrgentRequisitionDto(
    int Id,
    string Identifier,
    string Title,
    string ClientName,
    string PlantName,
    DateTime DueDate,
    string Status,
    int DaysLeft);

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