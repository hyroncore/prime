namespace Prime.Api.DTOs;

public record CreateRequisitionRequest(
    string ExternalRef,
    int PlantId,
    string SectorCode,
    string Title,
    DateTime DueDate,
    string? ClientNotes,
    DateTime? ReceivedAt = null);

public record UpdateStatusRequest(
    string Status,
    string Notes);

public record CreateClientRequest(
    string Name,
    string? PrimaryContactName,
    string? PrimaryContactPhone,
    List<CreatePlantRequest> Plants);

public record CreatePlantRequest(
    string PlantName,
    string ShortCode);

public record UpdatePlantRequest(
    string PlantName,
    string ShortCode,
    int ClientId);

public record UpdateClientRequest(
    string Name,
    string? PrimaryContactName,
    string? PrimaryContactPhone);

public record UpdateRequisitionRequest(
    string ExternalRef,
    int PlantId,
    string SectorCode,
    string Title,
    DateTime DueDate,
    string? ClientNotes,
    DateTime? ReceivedAt = null);