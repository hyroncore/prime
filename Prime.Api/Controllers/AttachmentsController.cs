using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prime.Api.Data;
using Prime.Api.DTOs;
using Prime.Api.Services;

namespace Prime.Api.Controllers;

[ApiController]
[Route("api")]
public class AttachmentsController : ControllerBase
{
    private const long MaxSizeBytes = 10L * 1024 * 1024;
    private const int MaxPerRequisition = 10;

    private static readonly string[] AllowedExtensions =
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".zip", ".rar", ".7z", ".dwg", ".dxf", ".txt", ".csv",
    };

    private readonly PrimeDbContext _db;
    private readonly IWebHostEnvironment _env;

    public AttachmentsController(PrimeDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost("requisitions/{id:int}/attachments")]
    [RequestSizeLimit(25L * 1024 * 1024)]
    public async Task<ActionResult<AttachmentDto>> Upload(int id, IFormFile file)
    {
        var requisition = await _db.PurchaseRequisitions
            .FirstOrDefaultAsync(r => r.Id == id);

        if (requisition is null)
        {
            return NotFound();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "لم يتم اختيار ملف." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = $"امتداد الملف غير مسموح به: {extension}" });
        }

        if (file.Length > MaxSizeBytes)
        {
            return BadRequest(new { message = "حجم الملف يتجاوز الحد الأقصى (10 ميغابايت)." });
        }

        var count = await _db.RequisitionAttachments
            .CountAsync(a => a.RequisitionId == id);

        if (count >= MaxPerRequisition)
        {
            return BadRequest(new { message = "لا يمكن إضافة أكثر من 10 مرفقات للطلب." });
        }

        var folder = Path.Combine(_env.ContentRootPath, "uploads", "requisitions", id.ToString());
        Directory.CreateDirectory(folder);

        var storedName = $"{Guid.NewGuid():N}{extension}";
        var path = Path.Combine(folder, storedName);

        await using (var stream = System.IO.File.Create(path))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new Models.RequisitionAttachment
        {
            RequisitionId = id,
            FileName = file.FileName,
            StoredFileName = storedName,
            ContentType = file.ContentType,
            SizeBytes = file.Length,
        };

        _db.RequisitionAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Download), new { id = attachment.Id }, ToDto(attachment));
    }

    [HttpGet("requisitions/{id:int}/attachments")]
    public async Task<ActionResult<List<AttachmentDto>>> List(int id)
    {
        var exists = await _db.PurchaseRequisitions.AnyAsync(r => r.Id == id);
        if (!exists)
        {
            return NotFound();
        }

        var attachments = await _db.RequisitionAttachments
            .Where(a => a.RequisitionId == id)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();

        return Ok(attachments.Select(ToDto).ToList());
    }

    [HttpGet("attachments/{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var attachment = await _db.RequisitionAttachments
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attachment is null)
        {
            return NotFound();
        }

        var path = Path.Combine(
            _env.ContentRootPath,
            "uploads",
            "requisitions",
            attachment.RequisitionId.ToString(),
            attachment.StoredFileName);

        if (!System.IO.File.Exists(path))
        {
            return NotFound();
        }

        return PhysicalFile(path, attachment.ContentType, attachment.FileName);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("attachments/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var attachment = await _db.RequisitionAttachments
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attachment is null)
        {
            return NotFound();
        }

        _db.RequisitionAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        var path = Path.Combine(
            _env.ContentRootPath,
            "uploads",
            "requisitions",
            attachment.RequisitionId.ToString(),
            attachment.StoredFileName);

        if (System.IO.File.Exists(path))
        {
            System.IO.File.Delete(path);
        }

        return NoContent();
    }

    private static AttachmentDto ToDto(Models.RequisitionAttachment a) => new(
        a.Id,
        a.RequisitionId,
        a.FileName,
        a.ContentType,
        a.SizeBytes,
        a.UploadedAt);
}
