using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Models;
using ServiceProviderModel = WorkflowBackend.Api.Models.ServiceProvider;
using ServiceProviderPriceModel = WorkflowBackend.Api.Models.ServiceProviderPrice;

namespace WorkflowBackend.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Request> Requests => Set<Request>();
        public DbSet<RequestVote> RequestVotes => Set<RequestVote>();

        public DbSet<Contract> Contracts => Set<Contract>();
        public DbSet<ContractVote> ContractVotes => Set<ContractVote>();

        public DbSet<LetterOfCredit> LettersOfCredit => Set<LetterOfCredit>();

        public DbSet<Vessel> Vessels => Set<Vessel>();
        public DbSet<LoadingPort> LoadingPorts => Set<LoadingPort>();
        public DbSet<VesselDocument> VesselDocuments => Set<VesselDocument>();
        public DbSet<VesselLetterOfCredit> VesselLettersOfCredit => Set<VesselLetterOfCredit>();
        public DbSet<VesselStageEntry> VesselStageEntries => Set<VesselStageEntry>();
        public DbSet<VesselDischargeUpdate> VesselDischargeUpdates => Set<VesselDischargeUpdate>();
        public DbSet<LetterOfCreditSupplierAllocation> LetterOfCreditSupplierAllocations => Set<LetterOfCreditSupplierAllocation>();

        public DbSet<Shipment> Shipments => Set<Shipment>();
        public DbSet<ShipmentDocument> ShipmentDocuments => Set<ShipmentDocument>();

        public DbSet<Document> Documents => Set<Document>(); // <— Global documents

        public DbSet<ServiceProviderModel> ServiceProviders => Set<ServiceProviderModel>();
        public DbSet<ServiceProviderPriceModel> ServiceProviderPrices => Set<ServiceProviderPriceModel>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

            // Request
            modelBuilder.Entity<Request>().Property(r => r.Status).HasMaxLength(50).HasDefaultValue("pending");
            modelBuilder.Entity<Request>().Property(r => r.Quantity).HasPrecision(18, 2);
            modelBuilder.Entity<Request>().Property(r => r.UnitOfMeasure).HasMaxLength(50);
            modelBuilder.Entity<Request>().Property(r => r.CargoType).HasMaxLength(100);
            modelBuilder.Entity<Request>().Property(r => r.PricePerTon).HasPrecision(18, 2);
            modelBuilder.Entity<Request>().Property(r => r.WheatPercentage).HasPrecision(5, 2);
            modelBuilder.Entity<Request>().Property(r => r.SupplierName).HasMaxLength(200);
            modelBuilder.Entity<Request>().Property(r => r.CountryOfOrigin).HasMaxLength(100);
            modelBuilder.Entity<Request>().Property(r => r.PaymentMethod).HasMaxLength(100);
            modelBuilder.Entity<Request>().Property(r => r.ShippingMethod).HasMaxLength(100);
            modelBuilder.Entity<Request>().Property(r => r.LetterOfGuarantee).HasMaxLength(4000);
            modelBuilder.Entity<Request>().Property(r => r.UploadedFile).HasMaxLength(255);
            modelBuilder.Entity<Request>().Property(r => r.PublicId).HasMaxLength(50).IsRequired();
            modelBuilder.Entity<Request>().HasIndex(r => r.PublicId).IsUnique();
            modelBuilder.Entity<Request>()
                .HasOne(r => r.CreatedBy).WithMany()
                .HasForeignKey(r => r.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<RequestVote>()
                .HasIndex(v => new { v.RequestId, v.UserId }).IsUnique();
            modelBuilder.Entity<RequestVote>()
                .Property(v => v.Comment).HasMaxLength(2000);
            modelBuilder.Entity<RequestVote>()
                .HasOne(v => v.Request).WithMany(r => r.Votes)
                .HasForeignKey(v => v.RequestId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<RequestVote>()
                .HasOne(v => v.User).WithMany()
                .HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Restrict);

            // Contract
            modelBuilder.Entity<Contract>().Property(c => c.Title).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Contract>().Property(c => c.Status).HasMaxLength(50).HasDefaultValue("Draft");
            modelBuilder.Entity<Contract>().Property(c => c.PublicId).HasMaxLength(50).IsRequired();
            modelBuilder.Entity<Contract>().HasIndex(c => c.PublicId).IsUnique();
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
            modelBuilder.Entity<LetterOfCredit>().Property(l => l.Flow).HasMaxLength(30).HasDefaultValue("GASC_TO_UPF");
            modelBuilder.Entity<LetterOfCredit>().Property(l => l.Currency).HasMaxLength(10);
            modelBuilder.Entity<LetterOfCredit>()
                .HasOne(l => l.Contract).WithMany()
                .HasForeignKey(l => l.ContractId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<LetterOfCredit>()
                .HasOne(l => l.CreatedBy).WithMany()
                .HasForeignKey(l => l.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<LetterOfCredit>()
                .HasMany(l => l.SupplierAllocations)
                .WithOne(a => a.LetterOfCredit)
                .HasForeignKey(a => a.LetterOfCreditId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LetterOfCreditSupplierAllocation>().Property(a => a.SupplierName).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>().Property(a => a.SupplierReference).HasMaxLength(200);
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>().Property(a => a.Notes).HasMaxLength(2000);
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>().Property(a => a.Quantity).HasPrecision(18, 3);
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>().Property(a => a.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>()
                .HasIndex(a => new { a.LetterOfCreditId, a.SupplierReference });
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>()
                .HasOne(a => a.LetterOfCredit).WithMany(l => l.SupplierAllocations)
                .HasForeignKey(a => a.LetterOfCreditId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<LetterOfCreditSupplierAllocation>()
                .HasOne(a => a.CreatedBy).WithMany()
                .HasForeignKey(a => a.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Vessel
            modelBuilder.Entity<Vessel>().Property(v => v.Name).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<Vessel>().Property(v => v.Status).HasMaxLength(50).HasDefaultValue("Planned");
            modelBuilder.Entity<Vessel>().Property(v => v.CargoType).HasMaxLength(100);
            modelBuilder.Entity<Vessel>().Property(v => v.CountryOfOrigin).HasMaxLength(100);
            modelBuilder.Entity<Vessel>().Property(v => v.PortOfDischarge).HasMaxLength(100);
            modelBuilder.Entity<Vessel>().Property(v => v.TradeTerms).HasMaxLength(50);
            modelBuilder.Entity<Vessel>().Property(v => v.InsuranceCompany).HasMaxLength(200);
            modelBuilder.Entity<Vessel>().Property(v => v.InspectionCompany).HasMaxLength(200);
            modelBuilder.Entity<Vessel>().Property(v => v.ShippingCompany).HasMaxLength(200);
            modelBuilder.Entity<Vessel>().Property(v => v.ShippingInstructions).HasColumnType("text");
            modelBuilder.Entity<Vessel>().Property(v => v.CustomsReleaseNumber).HasMaxLength(100);
            modelBuilder.Entity<Vessel>().Property(v => v.CustomsReleaseStatus).HasMaxLength(50);
            modelBuilder.Entity<Vessel>().Property(v => v.CustomsReleaseFilePath).HasMaxLength(500);
            modelBuilder.Entity<Vessel>().Property(v => v.CustomsReleaseFileName).HasMaxLength(255);
            modelBuilder.Entity<Vessel>().Property(v => v.DischargedQuantity).HasPrecision(18, 3).HasDefaultValue(0m);
            modelBuilder.Entity<Vessel>()
                .HasOne(v => v.CreatedBy).WithMany()
                .HasForeignKey(v => v.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Vessel>()
                .HasOne(v => v.Contract).WithMany()
                .HasForeignKey(v => v.ContractId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Vessel>()
                .HasIndex(v => new { v.ContractId, v.Eta, v.Etd });

            modelBuilder.Entity<VesselDischargeUpdate>().Property(u => u.QuantityDischarged).HasPrecision(18, 3);
            modelBuilder.Entity<VesselDischargeUpdate>().Property(u => u.Notes).HasMaxLength(2000);
            modelBuilder.Entity<VesselDischargeUpdate>().Property(u => u.ProofDocumentPath).HasMaxLength(500);
            modelBuilder.Entity<VesselDischargeUpdate>().Property(u => u.ProofDocumentFileName).HasMaxLength(255);
            modelBuilder.Entity<VesselDischargeUpdate>()
                .HasOne(u => u.Vessel)
                .WithMany(v => v.DischargeUpdates)
                .HasForeignKey(u => u.VesselId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<VesselDischargeUpdate>()
                .HasOne(u => u.CreatedBy)
                .WithMany()
                .HasForeignKey(u => u.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

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

            modelBuilder.Entity<VesselStageEntry>().Property(e => e.StageId).HasMaxLength(100).IsRequired();
            modelBuilder.Entity<VesselStageEntry>().Property(e => e.NumberValue).HasMaxLength(100);
            modelBuilder.Entity<VesselStageEntry>()
                .HasIndex(e => new { e.VesselId, e.StageId })
                .IsUnique();
            modelBuilder.Entity<VesselStageEntry>()
                .HasOne(e => e.Vessel)
                .WithMany(v => v.StageEntries)
                .HasForeignKey(e => e.VesselId)
                .OnDelete(DeleteBehavior.Cascade);

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
            modelBuilder.Entity<Shipment>()
                .HasIndex(s => s.VesselId);

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

            // Service Providers
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.Name).HasMaxLength(200).IsRequired();
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.Type).HasMaxLength(50).IsRequired();
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.ContactName).HasMaxLength(200);
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.ContactEmail).HasMaxLength(200);
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.ContactPhone).HasMaxLength(50);
            modelBuilder.Entity<ServiceProviderModel>().Property(p => p.DefaultCurrency).HasMaxLength(10);
            modelBuilder.Entity<ServiceProviderModel>()
                .HasIndex(p => new { p.Type, p.Name })
                .IsUnique();
            modelBuilder.Entity<ServiceProviderModel>()
                .HasMany(p => p.Prices)
                .WithOne(price => price.ServiceProvider)
                .HasForeignKey(price => price.ServiceProviderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ServiceProviderPriceModel>().Property(p => p.Currency).HasMaxLength(10).IsRequired();
            modelBuilder.Entity<ServiceProviderPriceModel>().Property(p => p.Notes).HasMaxLength(2000);
            modelBuilder.Entity<ServiceProviderPriceModel>().Property(p => p.Price).HasPrecision(18, 2);
            modelBuilder.Entity<ServiceProviderPriceModel>().Property(p => p.QuotedAt).IsRequired();
            modelBuilder.Entity<ServiceProviderPriceModel>()
                .HasIndex(p => new { p.ServiceProviderId, p.QuotedAt });
        }
    }
}
