using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/plants")]
public class PlantsController : ControllerBase
{
    private static readonly List<string> OpenStatuses = new()
    {
        nameof(RequisitionStatus.NEW),
        nameof(RequisitionStatus.REVIEW),
        nameof(RequisitionStatus.PROCESSING),
        nameof(RequisitionStatus.MANAGER_REVIEW),
        nameof(RequisitionStatus.READY_FOR_APPROVAL),
        nameof(RequisitionStatus.INTERNAL_APPROVAL),
        nameof(RequisitionStatus.APPROVED),
        nameof(RequisitionStatus.SUBMITTED),
        nameof(RequisitionStatus.REVISE)
    };

    private readonly PrimeDbContext _db;

    public PlantsController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<PlantDetailDto>>> List()
    {
        var query = _db.Plants
            .Include(p => p.Client)
            .AsQueryable();

        var plants = await query
            .OrderBy(p => p.Client!.Name)
            .ThenBy(p => p.Name)
            .ThenBy(p => p.Code)
            .ToListAsync();

        var requisitionCounts = await _db.PurchaseRequisitions
            .GroupBy(r => r.PlantId)
            .Select(group => new
            {
                PlantId = group.Key,
                Total = group.Count(),
                Open = group.Count(r => OpenStatuses.Contains(r.Status)),
                Won = group.Count(r => r.Status == nameof(RequisitionStatus.WON)),
                Lost = group.Count(r => r.Status == nameof(RequisitionStatus.LOST))
            })
            .ToDictionaryAsync(count => count.PlantId);

        var result = plants.Select(p =>
        {
            requisitionCounts.TryGetValue(p.Id, out var counts);
            var wonCount = counts?.Won ?? 0;
            var lostCount = counts?.Lost ?? 0;
            var decided = wonCount + lostCount;

            return new PlantDetailDto(
                p.Id,
                p.Name,
                p.Code,
                p.ClientId,
                p.Client?.Name ?? "—",
                p.Client?.PrimaryContactName,
                p.Client?.PrimaryContactPhone,
                counts?.Open ?? 0,
                counts?.Total ?? 0,
                wonCount,
                lostCount,
                decided == 0 ? 0 : Math.Round((double)wonCount / decided * 100, 1));
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlantDetailDto>> Detail(int id)
    {
        var query = _db.Plants
            .Include(p => p.Client)
            .AsQueryable();

        var p = await query.FirstOrDefaultAsync(p => p.Id == id);

        if (p == null) return NotFound();

        var counts = await _db.PurchaseRequisitions
            .Where(r => r.PlantId == id)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Total = group.Count(),
                Open = group.Count(r => OpenStatuses.Contains(r.Status)),
                Won = group.Count(r => r.Status == nameof(RequisitionStatus.WON)),
                Lost = group.Count(r => r.Status == nameof(RequisitionStatus.LOST))
            })
            .FirstOrDefaultAsync();

        var wonCount = counts?.Won ?? 0;
        var lostCount = counts?.Lost ?? 0;
        var decided = wonCount + lostCount;

        return Ok(new PlantDetailDto(
            p.Id,
            p.Name,
            p.Code,
            p.ClientId,
            p.Client?.Name ?? "—",
            p.Client?.PrimaryContactName,
            p.Client?.PrimaryContactPhone,
            counts?.Open ?? 0,
            counts?.Total ?? 0,
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
        if (await _db.Plants.AnyAsync(p => p.Code == shortCode))
        {
            return BadRequest(new { message = $"الرمز المختصر '{shortCode}' مستخدم مسبقاً." });
        }

        if (!await _db.Clients.AnyAsync(c => c.Id == request.ClientId))
        {
            return BadRequest(new { message = "الجهة غير موجودة." });
        }

        var plant = new Plant
        {
            Name = request.PlantName.Trim(),
            Code = shortCode,
            ClientId = request.ClientId
        };

        _db.Plants.Add(plant);
        await _db.SaveChangesAsync();

        return await Detail(plant.Id);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePlantRequest request)
    {
        var query = _db.Plants.AsQueryable();

        var plant = await query.FirstOrDefaultAsync(p => p.Id == id);
        if (plant == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.PlantName) || string.IsNullOrWhiteSpace(request.ShortCode))
        {
            return BadRequest(new { message = "اسم العميل والرمز المختصر مطلوبان." });
        }

        var shortCode = request.ShortCode.Trim().ToUpperInvariant();
        if (await _db.Plants.AnyAsync(p => p.Code == shortCode && p.Id != id))
        {
            return BadRequest(new { message = $"الرمز المختصر '{shortCode}' مستخدم مسبقاً." });
        }

        if (!await _db.Clients.AnyAsync(c => c.Id == request.ClientId))
        {
            return BadRequest(new { message = "الجهة غير موجودة." });
        }

        plant.Name = request.PlantName.Trim();
        plant.Code = shortCode;
        plant.ClientId = request.ClientId;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var query = _db.Plants.AsQueryable();

        var plant = await query.FirstOrDefaultAsync(p => p.Id == id);
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
