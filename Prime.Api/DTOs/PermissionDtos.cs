namespace Prime.Api.DTOs;

public record PermissionDto(int Id, string Key, string Description, string Category);

public record PermissionCellDto(int PermissionId, string PermissionKey, bool IsGranted);

public record RolePermissionDto(string Role, List<PermissionCellDto> Permissions);

public record PermissionMatrixDto(List<RolePermissionDto> Roles, List<PermissionDto> Permissions);

public record UpdateRolePermissionsRequest(List<PermissionCellDto> Permissions);

public record UpdateUserPermissionsRequest(List<PermissionCellDto> Permissions);