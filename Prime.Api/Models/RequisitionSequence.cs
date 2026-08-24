namespace Prime.Api.Models;

public class RequisitionSequence
{
    public int Id { get; set; }

    public string PlantShortCode { get; set; } = string.Empty;

    public string SectorCode { get; set; } = string.Empty;

    public int CurrentValue { get; set; }
}