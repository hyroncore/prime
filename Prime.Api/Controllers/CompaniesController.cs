using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Models;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize(Roles = "Admin")]
public class CompaniesController : ControllerBase
{
    private readonly PrimeDbContext _db;

    public CompaniesController(PrimeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<CompanyDto>>> List()
    {
        var companies = await _db.Companies
            .Include(c => c.Users)
            .Include(c => c.Clients)
                .ThenInclude(c => c.Plants)
            .Include(c => c.Requisitions)
            .OrderBy(c => c.Name)
            .ToListAsync();

        var result = companies.Select(c => new CompanyDto(
            c.Id,
            c.Name,
            c.Code,
            c.Description,
            c.IsActive,
            c.CreatedAt,
            c.Users.Count,
            c.Clients.Count,
            c.Clients.SelectMany(c => c.Plants).Count(),
            c.Requisitions.Count
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CompanyDto>> GetById(int id)
    {
        var company = await _db.Companies
            .Include(c => c.Users)
            .Include(c => c.Clients)
                .ThenInclude(c => c.Plants)
            .Include(c => c.Requisitions)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null) return NotFound();

        return Ok(new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.IsActive,
            company.CreatedAt,
            company.Users.Count,
            company.Clients.Count,
            company.Clients.SelectMany(c => c.Plants).Count(),
            company.Requisitions.Count
        ));
    }

    [HttpPost]
    public async Task<ActionResult<CompanyDto>> Create([FromBody] CreateCompanyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "اسم الشركة مطلوب." });
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "كود الشركة مطلوب." });
        }

        var code = request.Code.Trim().ToUpperInvariant();
        if (await _db.Companies.AnyAsync(c => c.Code == code))
        {
            return BadRequest(new { message = "يوجد شركة بهذا الكود مسبقاً." });
        }

        var existing = await _db.Companies.AnyAsync(c => c.Name == request.Name.Trim());
        if (existing)
        {
            return BadRequest(new { message = "يوجد شركة بهذا الاسم مسبقاً." });
        }

        var company = new Company
        {
            Name = request.Name.Trim(),
            Code = code,
            Description = request.Description?.Trim(),
            IsActive = true
        };

        _db.Companies.Add(company);
        await _db.SaveChangesAsync();

        return Ok(new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.IsActive,
            company.CreatedAt,
            0, 0, 0, 0
        ));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCompanyRequest request)
    {
        var company = await _db.Companies.FindAsync(id);
        if (company == null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "اسم الشركة مطلوب." });
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "كود الشركة مطلوب." });
        }

        var code = request.Code.Trim().ToUpperInvariant();
        if (await _db.Companies.AnyAsync(c => c.Code == code && c.Id != id))
        {
            return BadRequest(new { message = "يوجد شركة بهذا الكود مسبقاً." });
        }

        var existing = await _db.Companies.AnyAsync(c => c.Name == request.Name.Trim() && c.Id != id);
        if (existing)
        {
            return BadRequest(new { message = "يوجد شركة بهذا الاسم مسبقاً." });
        }

        company.Name = request.Name.Trim();
        company.Code = code;
        company.Description = request.Description?.Trim();
        company.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var company = await _db.Companies
            .Include(c => c.Users)
            .Include(c => c.Clients)
            .Include(c => c.Requisitions)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null) return NotFound();

        if (company.Users.Any() || company.Clients.Any() || company.Requisitions.Any())
        {
            return BadRequest(new { message = "لا يمكن حذف الشركة لوجود بيانات مرتبطة بها. قم بإلغاء تنشيطها بدلاً من الحذف." });
        }

        _db.Companies.Remove(company);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}