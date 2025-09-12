using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Models;

namespace WorkflowBackend.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Need> Needs => Set<Need>();

        public DbSet<Request> Requests => Set<Request>();
        public DbSet<RequestVote> RequestVotes => Set<RequestVote>();

        public DbSet<Contract> Contracts => Set<Contract>();
        public DbSet<ContractVote> ContractVotes => Set<ContractVote>();

        public DbSet<LetterOfCredit> LettersOfCredit => Set<LetterOfCredit>();

        public DbSet<Vessel> Vessels => Set<Vessel>();
        public DbSet<LoadingPort> LoadingPorts => Set<LoadingPort>();
        public DbSet<VesselDocument> VesselDocuments => Set<VesselDocument>();
        public DbSet<VesselLetterOfCredit> VesselLettersOfCredit => Set<VesselLetterOfCredit>();

        public DbSet<Shipment> Shipments => Set<Shipment>();
        public DbSet<ShipmentDocument> ShipmentDocuments => Set<ShipmentDocument>();

        public DbSet<Document> Documents => Set<Document>(); // <— Global documents

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

            // Need
            modelBuilder.Entity<Need>()
                .HasOne(n => n.CreatedBy).WithMany()
                .HasForeignKey(n => n.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);

            // Request
            modelBuilder.Entity<Request>().Property(r => r.Title).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Request>().Property(r => r.Status)
                .HasConversion<string>()
                .HasMaxLength(50)
                .HasDefaultValue(RequestStatus.Draft);
            modelBuilder.Entity<Request>()
                .HasOne(r => r.CreatedBy).WithMany()
                .HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Request>()
                .HasOne(r => r.Need).WithMany()
                .HasForeignKey(r => r.NeedId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<RequestVote>()
                .HasIndex(v => new { v.RequestId, v.UserId }).IsUnique();
            modelBuilder.Entity<RequestVote>()
                .HasOne(v => v.Request).WithMany(r => r.Votes)
                .HasForeignKey(v => v.RequestId).OnDelete(DeleteBehavior.Cascade);

            // Contract
            modelBuilder.Entity<Contract>().Property(c => c.Title).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Contract>().Property(c => c.Status).HasMaxLength(50).HasDefaultValue("Draft");
            modelBuilder.Entity<Contract>()
                .HasOne(c => c.Request).WithMany()
                .HasForeignKey(c => c.RequestId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Contract>()
                .HasOne(c => c.CreatedBy).WithMany()
                .HasForeignKey(c => c.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ContractVote>()
                .HasIndex(v => new { v.ContractId, v.UserId }).IsUnique();
            modelBuilder.Entity<ContractVote>()
                .HasOne(v => v.Contract).WithMany(c => c.Votes)
                .HasForeignKey(v => v.ContractId).OnDelete(DeleteBehavior.Cascade);

            // LetterOfCredit
            modelBuilder.Entity<LetterOfCredit>().Property(l => l.Number).HasMaxLength(100).IsRequired();
            modelBuilder.Entity<LetterOfCredit>().Property(l => l.Status).HasMaxLength(50).HasDefaultValue("Draft");
            modelBuilder.Entity<LetterOfCredit>().Property(l => l.Currency).HasMaxLength(10);
            modelBuilder.Entity<LetterOfCredit>()
                .HasOne(l => l.Contract).WithMany()
                .HasForeignKey(l => l.ContractId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<LetterOfCredit>()
                .HasOne(l => l.CreatedBy).WithMany()
                .HasForeignKey(l => l.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);

            // Vessel
            modelBuilder.Entity<Vessel>().Property(v => v.Name).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Vessel>().Property(v => v.Status).HasMaxLength(50).HasDefaultValue("Planned");
            modelBuilder.Entity<Vessel>()
                .HasOne(v => v.CreatedBy).WithMany()
                .HasForeignKey(v => v.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);

            // LoadingPort
            modelBuilder.Entity<LoadingPort>().Property(p => p.PortName).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<LoadingPort>().Property(p => p.Country).HasMaxLength(100);
            modelBuilder.Entity<LoadingPort>()
                .HasOne(p => p.Vessel).WithMany(v => v.LoadingPorts)
                .HasForeignKey(p => p.VesselId).OnDelete(DeleteBehavior.Cascade);

            // VesselDocument
            modelBuilder.Entity<VesselDocument>().Property(d => d.FileName).HasMaxLength(255);
            modelBuilder.Entity<VesselDocument>().Property(d => d.FilePath).HasMaxLength(500);
            modelBuilder.Entity<VesselDocument>().Property(d => d.Type).HasMaxLength(100);
            modelBuilder.Entity<VesselDocument>()
                .HasOne(d => d.Vessel).WithMany(v => v.Documents)
                .HasForeignKey(d => d.VesselId).OnDelete(DeleteBehavior.Cascade);

            // Vessel <-> LC
            modelBuilder.Entity<VesselLetterOfCredit>()
                .HasIndex(x => new { x.VesselId, x.LetterOfCreditId }).IsUnique();
            modelBuilder.Entity<VesselLetterOfCredit>()
                .HasOne(x => x.Vessel).WithMany(v => v.LettersOfCredit)
                .HasForeignKey(x => x.VesselId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<VesselLetterOfCredit>()
                .HasOne(x => x.LetterOfCredit).WithMany()
                .HasForeignKey(x => x.LetterOfCreditId).OnDelete(DeleteBehavior.Cascade);

            // Shipment
            modelBuilder.Entity<Shipment>().Property(s => s.Reference).HasMaxLength(100).IsRequired();
            modelBuilder.Entity<Shipment>().Property(s => s.Status).HasMaxLength(50).HasDefaultValue("Planned");
            modelBuilder.Entity<Shipment>().Property(s => s.Unit).HasMaxLength(20);
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.Vessel).WithMany()
                .HasForeignKey(s => s.VesselId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.Contract).WithMany()
                .HasForeignKey(s => s.ContractId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Shipment>()
                .HasOne(s => s.LetterOfCredit).WithMany()
                .HasForeignKey(s => s.LetterOfCreditId).OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ShipmentDocument>().Property(d => d.Type).HasMaxLength(100);
            modelBuilder.Entity<ShipmentDocument>().Property(d => d.FileName).HasMaxLength(255);
            modelBuilder.Entity<ShipmentDocument>().Property(d => d.FilePath).HasMaxLength(500);
            modelBuilder.Entity<ShipmentDocument>()
                .HasOne(d => d.Shipment).WithMany(s => s.Documents)
                .HasForeignKey(d => d.ShipmentId).OnDelete(DeleteBehavior.Cascade);

            // Global Document
            modelBuilder.Entity<Document>().Property(d => d.Title).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Document>().Property(d => d.Type).HasMaxLength(100);
            modelBuilder.Entity<Document>().Property(d => d.EntityType).HasMaxLength(50).IsRequired();
            modelBuilder.Entity<Document>().Property(d => d.FileName).HasMaxLength(255);
            modelBuilder.Entity<Document>().Property(d => d.FilePath).HasMaxLength(500);
            modelBuilder.Entity<Document>().Property(d => d.TagsCsv).HasMaxLength(1000);
            modelBuilder.Entity<Document>()
                .HasIndex(d => new { d.EntityType, d.EntityId });
        }
    }
}
