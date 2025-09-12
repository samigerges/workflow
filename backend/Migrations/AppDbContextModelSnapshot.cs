using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using WorkflowBackend.Api.Data;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
            modelBuilder.HasAnnotation("ProductVersion", "8.0.8")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            modelBuilder.Entity("WorkflowBackend.Api.Models.User", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("Email").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("FirstName").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("LastName").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("PasswordHash").HasColumnType("text");
                b.Property<string>("Role").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("User");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("Email").IsUnique();
                b.ToTable("Users");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Need", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("CreatedByUserId").HasColumnType("uuid");
                b.Property<string>("Description").HasMaxLength(2000).HasColumnType("character varying(2000)");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Draft");
                b.Property<string>("Title").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("CreatedByUserId");
                b.ToTable("Needs");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Request", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("CreatedByUserId").HasColumnType("uuid");
                b.Property<string>("Description").HasMaxLength(4000).HasColumnType("character varying(4000)");
                b.Property<Guid?>("NeedId").HasColumnType("uuid");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Draft");
                b.Property<string>("Title").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("CreatedByUserId");
                b.HasIndex("NeedId");
                b.ToTable("Requests");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.RequestVote", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<Guid>("RequestId").HasColumnType("uuid");
                b.Property<Guid>("UserId").HasColumnType("uuid");
                b.Property<int>("Value").HasColumnType("integer");
                b.HasKey("Id");
                b.HasIndex("RequestId", "UserId").IsUnique();
                b.ToTable("RequestVotes");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Contract", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("CreatedByUserId").HasColumnType("uuid");
                b.Property<string>("Description").HasMaxLength(4000).HasColumnType("character varying(4000)");
                b.Property<string>("FileName").HasMaxLength(255).HasColumnType("character varying(255)");
                b.Property<string>("FilePath").HasMaxLength(500).HasColumnType("character varying(500)");
                b.Property<Guid?>("RequestId").HasColumnType("uuid");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Draft");
                b.Property<string>("Title").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("SupplierName").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<decimal?>("Quantity").HasColumnType("numeric");
                b.Property<string>("CargoType").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("CountryOfOrigin").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<decimal?>("PricePerTon").HasColumnType("numeric");
                b.Property<string>("PaymentMethod").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("ShippingMethod").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("ContractTerms").HasMaxLength(4000).HasColumnType("character varying(4000)");
                b.Property<DateTime?>("StartDate").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("EndDate").HasColumnType("timestamp with time zone");
                b.Property<string>("ReviewNotes").HasMaxLength(1000).HasColumnType("character varying(1000)");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("CreatedByUserId");
                b.HasIndex("RequestId");
                b.ToTable("Contracts");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.ContractVote", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid>("ContractId").HasColumnType("uuid");
                b.Property<Guid>("UserId").HasColumnType("uuid");
                b.Property<int>("Value").HasColumnType("integer");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("ContractId", "UserId").IsUnique();
                b.ToTable("ContractVotes");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.LetterOfCredit", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("ContractId").HasColumnType("uuid");
                b.Property<Guid?>("CreatedByUserId").HasColumnType("uuid");
                b.Property<string>("Number").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("IssuingBank").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<decimal?>("Amount").HasColumnType("numeric");
                b.Property<string>("Currency").HasMaxLength(10).HasColumnType("character varying(10)");
                b.Property<DateTime?>("IssueDate").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("ExpiryDate").HasColumnType("timestamp with time zone");
                b.Property<string>("Applicant").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("Beneficiary").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Draft");
                b.Property<string>("FilePath").HasMaxLength(500).HasColumnType("character varying(500)");
                b.Property<string>("FileName").HasMaxLength(255).HasColumnType("character varying(255)");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("ContractId");
                b.HasIndex("CreatedByUserId");
                b.ToTable("LettersOfCredit");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Vessel", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("CreatedByUserId").HasColumnType("uuid");
                b.Property<string>("InstructionsFileName").HasColumnType("text");
                b.Property<string>("InstructionsPath").HasColumnType("text");
                b.Property<string>("Name").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Planned");
                b.Property<DateTime?>("Eta").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("Etd").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("CreatedByUserId");
                b.ToTable("Vessels");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.LoadingPort", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("Country").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<double?>("Latitude").HasColumnType("double precision");
                b.Property<double?>("Longitude").HasColumnType("double precision");
                b.Property<string>("PortName").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<Guid>("VesselId").HasColumnType("uuid");
                b.HasKey("Id");
                b.HasIndex("VesselId");
                b.ToTable("LoadingPorts");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.VesselDocument", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("FileName").HasMaxLength(255).HasColumnType("character varying(255)");
                b.Property<string>("FilePath").HasMaxLength(500).HasColumnType("character varying(500)");
                b.Property<string>("Type").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<DateTime>("UploadedAt").HasColumnType("timestamp with time zone");
                b.Property<Guid>("VesselId").HasColumnType("uuid");
                b.HasKey("Id");
                b.HasIndex("VesselId");
                b.ToTable("VesselDocuments");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.VesselLetterOfCredit", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid>("LetterOfCreditId").HasColumnType("uuid");
                b.Property<Guid>("VesselId").HasColumnType("uuid");
                b.HasKey("Id");
                b.HasIndex("LetterOfCreditId");
                b.HasIndex("VesselId", "LetterOfCreditId").IsUnique();
                b.ToTable("VesselLettersOfCredit");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Shipment", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid?>("ContractId").HasColumnType("uuid");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("DeliveryDate").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("Eta").HasColumnType("timestamp with time zone");
                b.Property<DateTime?>("Etd").HasColumnType("timestamp with time zone");
                b.Property<Guid?>("LetterOfCreditId").HasColumnType("uuid");
                b.Property<DateTime?>("LoadDate").HasColumnType("timestamp with time zone");
                b.Property<decimal?>("Quantity").HasColumnType("numeric");
                b.Property<string>("Reference").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<string>("Status").HasMaxLength(50).HasColumnType("character varying(50)").HasDefaultValue("Planned");
                b.Property<string>("Unit").HasMaxLength(20).HasColumnType("character varying(20)");
                b.Property<Guid>("VesselId").HasColumnType("uuid");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("ContractId");
                b.HasIndex("LetterOfCreditId");
                b.HasIndex("VesselId");
                b.ToTable("Shipments");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.ShipmentDocument", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<string>("FileName").HasMaxLength(255).HasColumnType("character varying(255)");
                b.Property<string>("FilePath").HasMaxLength(500).HasColumnType("character varying(500)");
                b.Property<Guid>("ShipmentId").HasColumnType("uuid");
                b.Property<string>("Type").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<DateTime>("UploadedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("ShipmentId");
                b.ToTable("ShipmentDocuments");
            });

            modelBuilder.Entity("WorkflowBackend.Api.Models.Document", b =>
            {
                b.Property<Guid>("Id").HasColumnType("uuid");
                b.Property<Guid>("EntityId").HasColumnType("uuid");
                b.Property<string>("EntityType").HasMaxLength(50).HasColumnType("character varying(50)");
                b.Property<string>("FileName").HasMaxLength(255).HasColumnType("character varying(255)");
                b.Property<string>("FilePath").HasMaxLength(500).HasColumnType("character varying(500)");
                b.Property<string>("TagsCsv").HasMaxLength(1000).HasColumnType("character varying(1000)");
                b.Property<string>("Title").HasMaxLength(200).HasColumnType("character varying(200)");
                b.Property<string>("Type").HasMaxLength(100).HasColumnType("character varying(100)");
                b.Property<Guid?>("UploadedByUserId").HasColumnType("uuid");
                b.Property<DateTime>("UploadedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("EntityType", "EntityId");
                b.ToTable("Documents");
            });
        }
    }
}
