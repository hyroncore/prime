using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class Client
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;

    public string? Type { get; set; }

    public string? PrimaryContactName { get; set; }

    public string? PrimaryContactPhone { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Creator tracking (Admin only visibility)
    public int? CreatedByCompanyId { get; set; }
    public Company? CreatedByCompany { get; set; }
    public int? CreatedByUserId { get; set; }
    public AppUser? CreatedByUser { get; set; }

    // Company association (for multi-tenancy)
    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    public List<Plant> Plants { get; set; } = new();
}