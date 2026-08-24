using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class Client
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string? PrimaryContactName { get; set; }

    public string? PrimaryContactPhone { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Plant> Plants { get; set; } = new();
}