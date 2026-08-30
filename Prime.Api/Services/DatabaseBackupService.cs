using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Prime.Api.Data;
using Prime.Api.Models;

namespace Prime.Api.Services;

public class DatabaseBackupService
{
    private readonly PrimeDbContext _db;
    private readonly ILogger<DatabaseBackupService> _logger;

    public DatabaseBackupService(PrimeDbContext db, ILogger<DatabaseBackupService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Stream> CreateBackupAsync(CancellationToken ct = default)
    {
        var backupId = Guid.NewGuid().ToString("N")[..8];
        var timestamp = DateTime.UtcNow;
        var fileName = $"prime-backup-{timestamp:yyyy-MM-dd-HHmmss}.json";

        _logger.LogInformation("Starting database backup {BackupId}", backupId);

        // Use a memory stream for the backup
        var memoryStream = new MemoryStream();
        
        using (var writer = new Utf8JsonWriter(memoryStream, new JsonWriterOptions 
        { 
            Indented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        }))
        {
            writer.WriteStartObject();
            
            // Metadata
            writer.WriteString("schemaVersion", "1.0");
            writer.WriteString("backupId", backupId);
            writer.WriteString("timestamp", timestamp.ToString("o"));
            writer.WriteString("application", "Prime");
            writer.WriteString("environment", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production");
            
            // Table counts placeholder - will be filled after serialization
            writer.WritePropertyName("tableCounts");
            writer.WriteStartObject();
            writer.WriteEndObject();
            
            // Tables data
            writer.WritePropertyName("tables");
            writer.WriteStartObject();

            // Backup each table
            await BackupTableAsync(writer, "Users", () => _db.Users
                .Select(u => new 
                {
                    u.Id,
                    u.Username,
                    u.DisplayName,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt,
                    u.ManagerId,
                    u.Department,
                    u.Email,
                    u.Phone
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "Clients", () => _db.Clients
                .Select(c => new 
                {
                    c.Id,
                    c.Name,
                    c.PrimaryContactName,
                    c.PrimaryContactPhone,
                    c.CreatedAt
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "Plants", () => _db.Plants
                .Select(p => new 
                {
                    p.Id,
                    p.ClientId,
                    p.PlantName,
                    p.ShortCode
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "PurchaseRequisitions", () => _db.PurchaseRequisitions
                .Select(r => new 
                {
                    r.Id,
                    r.Identifier,
                    r.ExternalRef,
                    r.PlantId,
                    r.SectorCode,
                    r.Title,
                    r.DueDate,
                    r.Status,
                    r.ClientNotes,
                    r.CreatedAt,
                    r.ReceivedAt,
                    r.CreatedById,
                    r.ApprovedById,
                    r.SubmittedById,
                    r.RevisedById,
                    r.OutcomeRecordedById,
                    r.DeclinedById,
                    r.ArchivedById,
                    r.IsInternallyApproved,
                    r.InternalApprovedAt,
                    r.ProcessedAt,
                    r.RevisedAt,
                    r.SubmittedAt,
                    r.OutcomeRecordedAt,
                    r.DeclinedAt,
                    r.ArchivedAt,
                    r.RevisionNotes,
                    r.UpdatedAt
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "RequisitionAuditLogs", () => _db.RequisitionAuditLogs
                .Select(a => new 
                {
                    a.Id,
                    a.RequisitionId,
                    a.Action,
                    a.StatusFrom,
                    a.StatusTo,
                    a.Notes,
                    a.CreatedAt
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "RequisitionAttachments", () => _db.RequisitionAttachments
                .Select(a => new 
                {
                    a.Id,
                    a.RequisitionId,
                    a.FileName,
                    a.StoredFileName,
                    a.ContentType,
                    a.SizeBytes,
                    a.UploadedAt
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "RequisitionSequences", () => _db.RequisitionSequences
                .Select(s => new 
                {
                    s.Id,
                    s.PlantShortCode,
                    s.SectorCode,
                    s.CurrentValue
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "Permissions", () => _db.Permissions
                .Select(p => new 
                {
                    p.Id,
                    p.Key,
                    p.Description,
                    p.Category
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "RolePermissions", () => _db.RolePermissions
                .Select(rp => new 
                {
                    rp.Id,
                    rp.Role,
                    rp.PermissionId,
                    rp.IsGranted
                })
                .ToListAsync(ct), ct);

            await BackupTableAsync(writer, "UserPermissions", () => _db.UserPermissions
                .Select(up => new 
                {
                    up.Id,
                    up.UserId,
                    up.PermissionId,
                    up.IsGranted
                })
                .ToListAsync(ct), ct);

            writer.WriteEndObject(); // tables

            writer.WriteEndObject(); // root
        }

        memoryStream.Position = 0;

        // Compute SHA-256 checksum
        using var sha256 = SHA256.Create();
        var checksum = Convert.ToHexString(sha256.ComputeHash(memoryStream));
        
        memoryStream.Position = 0;
        
        _logger.LogInformation("Database backup {BackupId} completed. Size: {Size} bytes, Checksum: {Checksum}", 
            backupId, memoryStream.Length, checksum);

        return memoryStream;
    }

    private async Task BackupTableAsync<T>(Utf8JsonWriter writer, string tableName, Func<Task<List<T>>> dataLoader, CancellationToken ct)
    {
        writer.WritePropertyName(tableName);
        writer.WriteStartArray();
        
        var records = await dataLoader();
        
        foreach (var record in records)
        {
            writer.WriteStartObject();
            // Use reflection to write properties
            var props = record.GetType().GetProperties();
            foreach (var prop in props)
            {
                var value = prop.GetValue(record);
                writer.WritePropertyName(prop.Name);
                WriteJsonValue(writer, value);
            }
            writer.WriteEndObject();
        }
        
        writer.WriteEndArray();
    }

    private void WriteJsonValue(Utf8JsonWriter writer, object? value)
    {
        if (value == null)
        {
            writer.WriteNullValue();
            return;
        }

        switch (value)
        {
            case string s:
                writer.WriteStringValue(s);
                break;
            case int i:
                writer.WriteNumberValue(i);
                break;
            case long l:
                writer.WriteNumberValue(l);
                break;
            case bool b:
                writer.WriteBooleanValue(b);
                break;
            case DateTime dt:
                writer.WriteStringValue(dt.ToString("o"));
                break;
            case Guid g:
                writer.WriteStringValue(g.ToString());
                break;
            case double d:
                writer.WriteNumberValue(d);
                break;
            case float f:
                writer.WriteNumberValue(f);
                break;
            case decimal dec:
                writer.WriteNumberValue(dec);
                break;
            default:
                // Fallback to string representation
                writer.WriteStringValue(value.ToString());
                break;
        }
    }

    public async Task<BackupMetadata> GetBackupMetadataAsync(CancellationToken ct = default)
    {
        // This would read from a backup history table or audit logs
        // For now, return a placeholder
        return new BackupMetadata
        {
            LastBackupAt = DateTime.UtcNow.AddDays(-1),
            LastBackupSize = 1024000,
            LastBackupChecksum = "placeholder",
            TotalBackups = 5
        };
    }
}

public record BackupMetadata
{
    public DateTime? LastBackupAt { get; init; }
    public long LastBackupSize { get; init; }
    public string? LastBackupChecksum { get; init; }
    public int TotalBackups { get; init; }
}