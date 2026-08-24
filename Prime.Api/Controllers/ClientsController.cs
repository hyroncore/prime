using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/clients")]
public class ClientsController : ControllerBase
{
    private readonly PrimeDbContext _db;

    public ClientsController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<ClientDto>>> List()
    {
        var clients = await _db.Clients
            .Include(c => c.Plants)
            .ToListAsync();

        var requisitions = await _db.PurchaseRequisitions
            .Include(r => r.Plant)
            .ToListAsync();

        var openStatuses = new[]
        {
            nameof(RequisitionStatus.NEW),
            nameof(RequisitionStatus.REVIEW),
            nameof(RequisitionStatus.PROCESSING)
        };

        var result = clients.Select(c =>
        {
            var plantIds = c.Plants.Select(p => p.Id).ToHashSet();
            var clientRequisitions = requisitions.Where(r => plantIds.Contains(r.PlantId)).ToList();

            return new ClientDto(
                c.Id,
                c.Name,
                c.PrimaryContactName,
                c.PrimaryContactPhone,
                c.CreatedAt,
                c.Plants
                    .OrderBy(p => p.ShortCode)
                    .Select(p => new PlantDto(p.Id, p.ClientId, c.Name, p.PlantName, p.ShortCode))
                    .ToList(),
                clientRequisitions.Count(r => openStatuses.Contains(r.Status)),
                clientRequisitions.Count(r => r.Status == nameof(RequisitionStatus.WON)));
        }).ToList();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ClientDto>> Create([FromBody] CreateClientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "اسم الجهة مطلوب." });
        }

        var existing = await _db.Clients.AnyAsync(c => c.Name == request.Name.Trim());
        if (existing)
        {
            return BadRequest(new { message = "يوجد جهة بهذا الاسم مسبقاً." });
        }

        var plants = new List<Plant>();
        foreach (var plantRequest in request.Plants ?? new List<CreatePlantRequest>())
        {
            if (string.IsNullOrWhiteSpace(plantRequest.PlantName) ||
                string.IsNullOrWhiteSpace(plantRequest.ShortCode))
            {
                continue;
            }

            var shortCode = plantRequest.ShortCode.Trim().ToUpperInvariant();
            if (await _db.Plants.AnyAsync(p => p.ShortCode == shortCode))
            {
                return BadRequest(new { message = $"Short code '{shortCode}' is already in use." });
            }

            plants.Add(new Plant
            {
                PlantName = plantRequest.PlantName.Trim(),
                ShortCode = shortCode
            });
        }

        var client = new Client
        {
            Name = request.Name.Trim(),
            PrimaryContactName = request.PrimaryContactName?.Trim(),
            PrimaryContactPhone = request.PrimaryContactPhone?.Trim(),
            Plants = plants
        };

        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        var dto = new ClientDto(
            client.Id,
            client.Name,
            client.PrimaryContactName,
            client.PrimaryContactPhone,
            client.CreatedAt,
            client.Plants
                .OrderBy(p => p.ShortCode)
                .Select(p => new PlantDto(p.Id, p.ClientId, client.Name, p.PlantName, p.ShortCode))
                .ToList(),
            0,
            0);

        return Ok(dto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClientRequest request)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Client name is required." });
        }

        var existing = await _db.Clients.AnyAsync(c => c.Name == request.Name.Trim() && c.Id != id);
        if (existing)
        {
            return BadRequest(new { message = "يوجد جهة بهذا الاسم مسبقاً." });
        }

        client.Name = request.Name.Trim();
        client.PrimaryContactName = request.PrimaryContactName?.Trim();
        client.PrimaryContactPhone = request.PrimaryContactPhone?.Trim();
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null) return NotFound();

        var hasPlants = await _db.Plants.AnyAsync(p => p.ClientId == id);
        if (hasPlants)
        {
            return BadRequest(new { message = "لا يمكن حذف الجهة لوجود عملاء مرتبطين بها. انقل العملاء إلى جهة أخرى أو احذفهم أولاً." });
        }

        _db.Clients.Remove(client);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
