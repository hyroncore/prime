namespace Prime.Api.DTOs;

public record NotificationDto(
    int Id,
    int? RequisitionId,
    string? Identifier,
    string Type,
    string Title,
    string Message,
    DateTime CreatedAt,
    DateTime? ReadAt);

public record NotificationsListDto(
    List<NotificationDto> Items,
    int UnreadCount);