using System.ComponentModel.DataAnnotations;

namespace Prime.Api.Models;

public class Plant
{
    public int Id { get; set; }

    public int ClientId { get; set; }

    public Client? Client { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Code { get; set; } = string.Empty;

    public ICollection<PurchaseRequisition> Requisitions { get; set; } = new List<PurchaseRequisition>();
}