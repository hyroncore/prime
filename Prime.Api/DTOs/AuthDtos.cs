namespace Prime.Api.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, UserDto User);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record CreateUserRequest(string Username, string DisplayName, string Role, string InitialPassword, int? CompanyId = null);

public record UpdateUserRequest(string DisplayName, string Role, bool IsActive, int? ManagerId = null, int? CompanyId = null);

public record ResetPasswordRequest(string NewPassword);

public record UserDto(
    int Id,
    string Username,
    string DisplayName,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt,
    int? ManagerId = null,
    int? CompanyId = null,
    string? CompanyName = null);