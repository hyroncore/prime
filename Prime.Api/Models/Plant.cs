using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class Plant
{
    public int Id { get; set; }

    public int ClientId { get; set; }

    public Client? Client { get; set; }

    [Required]
    public string PlantName { get; set; } = string.Empty;

    [Required]
    public string ShortCode { get; set; } = string.Empty;

    public List<PurchaseRequisition> Requisitions { get; set; } = new();
}