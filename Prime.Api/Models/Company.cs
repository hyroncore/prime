using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class Company
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<AppUser> Users { get; set; } = new();
    public List<Client> Clients { get; set; } = new();
    public List<Plant> Plants { get; set; } = new();
    public List<PurchaseRequisition> Requisitions { get; set; } = new();
}