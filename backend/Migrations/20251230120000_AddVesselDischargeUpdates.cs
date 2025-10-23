using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVesselDischargeUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DischargedQuantity",
                table: "Vessels",
                type: "numeric(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "VesselDischargeUpdates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VesselId = table.Column<Guid>(type: "uuid", nullable: false),
                    DischargeDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    QuantityDischarged = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ProofDocumentPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProofDocumentFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VesselDischargeUpdates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VesselDischargeUpdates_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VesselDischargeUpdates_Vessels_VesselId",
                        column: x => x.VesselId,
                        principalTable: "Vessels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VesselDischargeUpdates_CreatedByUserId",
                table: "VesselDischargeUpdates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VesselDischargeUpdates_VesselId",
                table: "VesselDischargeUpdates",
                column: "VesselId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VesselDischargeUpdates");

            migrationBuilder.DropColumn(
                name: "DischargedQuantity",
                table: "Vessels");
        }
    }
}
