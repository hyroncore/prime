using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prime.Api.Models;

public class UserPermission
{
    public int Id { get; set; }

    public int UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public AppUser? User { get; set; }

    public int PermissionId { get; set; }

    [ForeignKey(nameof(PermissionId))]
    public Permission? Permission { get; set; }

    public bool IsGranted { get; set; } = true;
}