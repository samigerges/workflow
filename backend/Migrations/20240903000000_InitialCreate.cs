using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true, defaultValue: "User"),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TagsCsv = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Documents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Needs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Draft"),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Needs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Needs_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Draft"),
                    NeedId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Requests_Needs_NeedId",
                        column: x => x.NeedId,
                        principalTable: "Needs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Requests_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Contracts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Draft"),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SupplierName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    CargoType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CountryOfOrigin = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PricePerTon = table.Column<decimal>(type: "numeric", nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ShippingMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContractTerms = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contracts_Requests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "Requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Contracts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LettersOfCredit",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IssuingBank = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric", nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IssueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Applicant = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Beneficiary = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Draft"),
                    ContractId = table.Column<Guid>(type: "uuid", nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LettersOfCredit", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LettersOfCredit_Contracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "Contracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LettersOfCredit_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Vessels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Planned"),
                    Eta = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Etd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    InstructionsPath = table.Column<string>(type: "text", nullable: true),
                    InstructionsFileName = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vessels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vessels_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RequestVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RequestVotes_Requests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "Requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractVotes_Contracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "Contracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LoadingPorts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VesselId = table.Column<Guid>(type: "uuid", nullable: false),
                    PortName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadingPorts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadingPorts_Vessels_VesselId",
                        column: x => x.VesselId,
                        principalTable: "Vessels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VesselDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VesselId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VesselDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VesselDocuments_Vessels_VesselId",
                        column: x => x.VesselId,
                        principalTable: "Vessels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VesselLettersOfCredit",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VesselId = table.Column<Guid>(type: "uuid", nullable: false),
                    LetterOfCreditId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VesselLettersOfCredit", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VesselLettersOfCredit_LettersOfCredit_LetterOfCreditId",
                        column: x => x.LetterOfCreditId,
                        principalTable: "LettersOfCredit",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VesselLettersOfCredit_Vessels_VesselId",
                        column: x => x.VesselId,
                        principalTable: "Vessels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Shipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Planned"),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    LoadDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Eta = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Etd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VesselId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractId = table.Column<Guid>(type: "uuid", nullable: true),
                    LetterOfCreditId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shipments_Contracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "Contracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Shipments_LettersOfCredit_LetterOfCreditId",
                        column: x => x.LetterOfCreditId,
                        principalTable: "LettersOfCredit",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Shipments_Vessels_VesselId",
                        column: x => x.VesselId,
                        principalTable: "Vessels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ShipmentDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShipmentDocuments_Shipments_ShipmentId",
                        column: x => x.ShipmentId,
                        principalTable: "Shipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Documents_EntityType_EntityId",
                table: "Documents",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Needs_CreatedByUserId",
                table: "Needs",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_CreatedByUserId",
                table: "Requests",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_NeedId",
                table: "Requests",
                column: "NeedId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_CreatedByUserId",
                table: "Contracts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_RequestId",
                table: "Contracts",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_LettersOfCredit_ContractId",
                table: "LettersOfCredit",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_LettersOfCredit_CreatedByUserId",
                table: "LettersOfCredit",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Vessels_CreatedByUserId",
                table: "Vessels",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RequestVotes_RequestId_UserId",
                table: "RequestVotes",
                columns: new[] { "RequestId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractVotes_ContractId_UserId",
                table: "ContractVotes",
                columns: new[] { "ContractId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPorts_VesselId",
                table: "LoadingPorts",
                column: "VesselId");

            migrationBuilder.CreateIndex(
                name: "IX_VesselDocuments_VesselId",
                table: "VesselDocuments",
                column: "VesselId");

            migrationBuilder.CreateIndex(
                name: "IX_VesselLettersOfCredit_VesselId_LetterOfCreditId",
                table: "VesselLettersOfCredit",
                columns: new[] { "VesselId", "LetterOfCreditId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VesselLettersOfCredit_LetterOfCreditId",
                table: "VesselLettersOfCredit",
                column: "LetterOfCreditId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_ContractId",
                table: "Shipments",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_LetterOfCreditId",
                table: "Shipments",
                column: "LetterOfCreditId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_VesselId",
                table: "Shipments",
                column: "VesselId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentDocuments_ShipmentId",
                table: "ShipmentDocuments",
                column: "ShipmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractVotes");

            migrationBuilder.DropTable(
                name: "Documents");

            migrationBuilder.DropTable(
                name: "LoadingPorts");

            migrationBuilder.DropTable(
                name: "RequestVotes");

            migrationBuilder.DropTable(
                name: "ShipmentDocuments");

            migrationBuilder.DropTable(
                name: "VesselDocuments");

            migrationBuilder.DropTable(
                name: "VesselLettersOfCredit");

            migrationBuilder.DropTable(
                name: "Shipments");

            migrationBuilder.DropTable(
                name: "LettersOfCredit");

            migrationBuilder.DropTable(
                name: "Vessels");

            migrationBuilder.DropTable(
                name: "Contracts");

            migrationBuilder.DropTable(
                name: "Requests");

            migrationBuilder.DropTable(
                name: "Needs");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
