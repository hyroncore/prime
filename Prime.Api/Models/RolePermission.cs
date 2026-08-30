using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prime.Api.Models;

public class RolePermission
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;

    public int PermissionId { get; set; }

    [ForeignKey(nameof(PermissionId))]
    public Permission? Permission { get; set; }

    public bool IsGranted { get; set; } = true;
}