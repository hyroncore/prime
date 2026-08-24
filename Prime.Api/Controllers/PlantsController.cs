using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/plants")]
public class PlantsController : ControllerBase
{
    private readonly PrimeDbContext _db;

    public PlantsController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<PlantDetailDto>>> List()
    {
        var plants = await _db.Plants
            .Include(p => p.Client)
            .ToListAsync();

        var requisitions = await _db.PurchaseRequisitions
            .ToListAsync();

        var openStatuses = new[]
        {
            nameof(RequisitionStatus.NEW),
            nameof(RequisitionStatus.REVIEW),
            nameof(RequisitionStatus.PROCESSING)
        };

        var result = plants.Select(p =>
        {
            var plantReqs = requisitions.Where(r => r.PlantId == p.Id).ToList();
            var wonCount = plantReqs.Count(r => r.Status == nameof(RequisitionStatus.WON));
            var lostCount = plantReqs.Count(r => r.Status == nameof(RequisitionStatus.LOST));
            var decided = wonCount + lostCount;

            return new PlantDetailDto(
                p.Id,
                p.PlantName,
                p.ShortCode,
                p.ClientId,
                p.Client?.Name ?? "—",
                p.Client?.PrimaryContactName,
                p.Client?.PrimaryContactPhone,
                plantReqs.Count(r => openStatuses.Contains(r.Status)),
                plantReqs.Count,
                wonCount,
                lostCount,
                decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1));
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlantDetailDto>> Detail(int id)
    {
        var p = await _db.Plants
            .Include(p => p.Client)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (p == null) return NotFound();

        var requisitions = await _db.PurchaseRequisitions
            .Where(r => r.PlantId == id)
            .ToListAsync();

        var openStatuses = new[]
        {
            nameof(RequisitionStatus.NEW),
            nameof(RequisitionStatus.REVIEW),
            nameof(RequisitionStatus.PROCESSING)
        };

        var wonCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.WON));
        var lostCount = requisitions.Count(r => r.Status == nameof(RequisitionStatus.LOST));
        var decided = wonCount + lostCount;

        return Ok(new PlantDetailDto(
            p.Id,
            p.PlantName,
            p.ShortCode,
            p.ClientId,
            p.Client?.Name ?? "—",
            p.Client?.PrimaryContactName,
            p.Client?.PrimaryContactPhone,
            requisitions.Count(r => openStatuses.Contains(r.Status)),
            requisitions.Count,
            wonCount,
            lostCount,
            decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1)));
    }

    [HttpPost]
    public async Task<ActionResult<PlantDetailDto>> Create([FromBody] UpdatePlantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlantName) || string.IsNullOrWhiteSpace(request.ShortCode))
        {
            return BadRequest(new { message = "اسم العميل والرمز المختصر مطلوبان." });
        }

        var shortCode = request.ShortCode.Trim().ToUpperInvariant();
        if (await _db.Plants.AnyAsync(p => p.ShortCode == shortCode))
        {
            return BadRequest(new { message = $"الرمز المختصر '{shortCode}' مستخدم مسبقاً." });
        }

        if (!await _db.Clients.AnyAsync(c => c.Id == request.ClientId))
        {
            return BadRequest(new { message = "الجهة غير موجودة." });
        }

        var plant = new Plant
        {
            PlantName = request.PlantName.Trim(),
            ShortCode = shortCode,
            ClientId = request.ClientId
        };

        _db.Plants.Add(plant);
        await _db.SaveChangesAsync();

        return await Detail(plant.Id);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePlantRequest request)
    {
        var plant = await _db.Plants.FindAsync(id);
        if (plant == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.PlantName) || string.IsNullOrWhiteSpace(request.ShortCode))
        {
            return BadRequest(new { message = "اسم العميل والرمز المختصر مطلوبان." });
        }

        var shortCode = request.ShortCode.Trim().ToUpperInvariant();
        if (await _db.Plants.AnyAsync(p => p.ShortCode == shortCode && p.Id != id))
        {
            return BadRequest(new { message = $"الرمز المختصر '{shortCode}' مستخدم مسبقاً." });
        }

        if (!await _db.Clients.AnyAsync(c => c.Id == request.ClientId))
        {
            return BadRequest(new { message = "الجهة غير موجودة." });
        }

        plant.PlantName = request.PlantName.Trim();
        plant.ShortCode = shortCode;
        plant.ClientId = request.ClientId;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plant = await _db.Plants.FindAsync(id);
        if (plant == null) return NotFound();

        var hasRequisitions = await _db.PurchaseRequisitions.AnyAsync(r => r.PlantId == id);
        if (hasRequisitions)
        {
            return BadRequest(new { message = "لا يمكن حذف العميل لوجود طلبات شراء مسجلة عليه." });
        }

        _db.Plants.Remove(plant);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
