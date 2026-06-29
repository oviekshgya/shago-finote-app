namespace ShagoFinote.Api.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using ShagoFinote.Api.Domain.Entities;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SyncLog> SyncLogs => Set<SyncLog>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CurrencyCode).HasMaxLength(3);
            
            entity.HasMany(u => u.Transactions)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(u => u.Bills)
                .WithOne(b => b.User)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(u => u.Categories)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(u => u.SyncLogs)
                .WithOne(s => s.User)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(u => u.Reports)
                .WithOne(r => r.User)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Transaction configuration
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.TransactionDate);
            entity.HasIndex(e => new { e.UserId, e.TransactionDate });
            entity.HasIndex(e => e.MobileLocalId);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Merchant).HasMaxLength(255);
            entity.Property(e => e.Currency).HasMaxLength(3);
            
            entity.HasOne(t => t.Category)
                .WithMany(c => c.Transactions)
                .HasForeignKey(t => t.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Bill configuration
        modelBuilder.Entity<Bill>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.DueDate);
            entity.HasIndex(e => new { e.UserId, e.DueDate });
            entity.HasIndex(e => e.MobileLocalId);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
            
            entity.HasOne(b => b.Category)
                .WithMany(c => c.Bills)
                .HasForeignKey(b => b.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.CategoryType).HasMaxLength(50);
        });

        // SyncLog configuration
        modelBuilder.Entity<SyncLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.SyncStartedAt);
            entity.HasIndex(e => new { e.UserId, e.SyncStartedAt });
            entity.Property(e => e.DeviceId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.DeviceName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.SyncDirection).HasMaxLength(50);
            entity.Property(e => e.ConflictResolutionStrategy).HasMaxLength(50);
            entity.Property(e => e.DataSizeMB).HasPrecision(10, 2);
        });

        // Report configuration
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.GeneratedAt);
            entity.HasIndex(e => new { e.UserId, e.GeneratedAt });
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
            entity.Property(e => e.TotalIncome).HasPrecision(18, 2);
            entity.Property(e => e.TotalExpense).HasPrecision(18, 2);
            entity.Property(e => e.NetCashFlow).HasPrecision(18, 2);
            entity.Property(e => e.TopCategory).HasMaxLength(255);
            entity.Property(e => e.DataJson).HasColumnType("jsonb");
        });
    }
}
