namespace Prime.Api.DTOs;

public record CompanyDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    int UsersCount,
    int ClientsCount,
    int PlantsCount,
    int RequisitionsCount);

public record CreateCompanyRequest(
    string Name,
    string Code,
    string? Description);

public record UpdateCompanyRequest(
    string Name,
    string Code,
    string? Description,
    bool IsActive);