using Microsoft.AspNetCore.Mvc;
using Prime.Api.DTOs;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/sectors")]
public class SectorsController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<SectorDto>> List()
    {
        return Ok(Sectors.All
            .Select(s => new SectorDto(s.Code, s.NameArabic))
            .ToList());
    }
}