using Microsoft.EntityFrameworkCore;
using Prime.Api.Models;

namespace Prime.Api.Data;

public class PrimeDbContext : DbContext
{
    public PrimeDbContext(DbContextOptions<PrimeDbContext> options) : base(options)
    {
    }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<RequisitionSequence> RequisitionSequences => Set<RequisitionSequence>();
    public DbSet<PurchaseRequisition> PurchaseRequisitions => Set<PurchaseRequisition>();
    public DbSet<RequisitionAuditLog> RequisitionAuditLogs => Set<RequisitionAuditLog>();
    public DbSet<RequisitionAttachment> RequisitionAttachments => Set<RequisitionAttachment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Client>(entity =>
        {
            entity.Property(c => c.Name).IsRequired();
            entity.Property(c => c.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Plant>(entity =>
        {
            entity.Property(p => p.PlantName).IsRequired();
            entity.Property(p => p.ShortCode).IsRequired();
            entity.HasIndex(p => p.ShortCode).IsUnique();
            entity.HasOne(p => p.Client)
                  .WithMany(c => c.Plants)
                  .HasForeignKey(p => p.ClientId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RequisitionSequence>(entity =>
        {
            entity.Property(s => s.PlantShortCode).IsRequired();
            entity.Property(s => s.SectorCode).IsRequired();
            entity.HasIndex(s => new { s.PlantShortCode, s.SectorCode }).IsUnique();
        });

        modelBuilder.Entity<PurchaseRequisition>(entity =>
        {
            entity.Property(r => r.Identifier).IsRequired();
            entity.HasIndex(r => r.Identifier).IsUnique();
            entity.Property(r => r.ExternalRef).IsRequired();
            entity.Property(r => r.SectorCode).IsRequired();
            entity.Property(r => r.Title).IsRequired();
            entity.Property(r => r.Status).IsRequired().HasDefaultValue(nameof(RequisitionStatus.NEW));
            entity.Property(r => r.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(r => r.Plant)
                  .WithMany()
                  .HasForeignKey(r => r.PlantId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(r => r.AuditLogs)
                  .WithOne(a => a.Requisition)
                  .HasForeignKey(a => a.RequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.CreatedBy)
                  .WithMany()
                  .HasForeignKey(r => r.CreatedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.ApprovedBy)
                  .WithMany()
                  .HasForeignKey(r => r.ApprovedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.SubmittedBy)
                  .WithMany()
                  .HasForeignKey(r => r.SubmittedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.RevisedBy)
                  .WithMany()
                  .HasForeignKey(r => r.RevisedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.ApprovedBy)
                  .WithMany()
                  .HasForeignKey(r => r.ApprovedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.OutcomeRecordedBy)
                  .WithMany()
                  .HasForeignKey(r => r.OutcomeRecordedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.DeclinedBy)
                  .WithMany()
                  .HasForeignKey(r => r.DeclinedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.ArchivedBy)
                  .WithMany()
                  .HasForeignKey(r => r.ArchivedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.CreatedBy)
                  .WithMany()
                  .HasForeignKey(r => r.CreatedById)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RequisitionAuditLog>(entity =>
        {
            entity.Property(a => a.Action).IsRequired();
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<RequisitionAttachment>(entity =>
        {
            entity.Property(a => a.FileName).IsRequired();
            entity.Property(a => a.StoredFileName).IsRequired();
            entity.Property(a => a.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(a => new { a.RequisitionId, a.FileName });
            entity.HasOne(a => a.Requisition)
                  .WithMany(r => r.Attachments)
                  .HasForeignKey(a => a.RequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.Type).IsRequired();
            entity.Property(n => n.Title).IsRequired();
            entity.Property(n => n.Message).IsRequired();
            entity.Property(n => n.DedupKey).IsRequired();
            entity.HasIndex(n => n.DedupKey).IsUnique();
            entity.HasIndex(n => n.ReadAt);
            entity.Property(n => n.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(n => n.Requisition)
                  .WithMany()
                  .HasForeignKey(n => n.RequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.Property(u => u.Username).IsRequired();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.DisplayName).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).IsRequired();
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(u => u.Manager)
                  .WithMany(u => u.Subordinates)
                  .HasForeignKey(u => u.ManagerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.Property(p => p.Key).IsRequired().HasMaxLength(100);
            entity.HasIndex(p => p.Key).IsUnique();
            entity.Property(p => p.Category).IsRequired().HasMaxLength(50);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasIndex(rp => new { rp.Role, rp.PermissionId }).IsUnique();
            entity.HasOne(rp => rp.Permission)
                  .WithMany()
                  .HasForeignKey(rp => rp.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPermission>(entity =>
        {
            entity.HasIndex(up => new { up.UserId, up.PermissionId }).IsUnique();
            entity.HasOne(up => up.Permission)
                  .WithMany()
                  .HasForeignKey(up => up.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(up => up.User)
                  .WithMany()
                  .HasForeignKey(up => up.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}