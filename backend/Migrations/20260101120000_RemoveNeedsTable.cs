using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNeedsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Needs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Needs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActualQuantityReceived = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DepartmentCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    FulfillmentEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FulfillmentStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MaxPricePerUnit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RequiredQuantity = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "draft"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
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

            migrationBuilder.CreateIndex(
                name: "IX_Needs_CreatedByUserId",
                table: "Needs",
                column: "CreatedByUserId");
        }
    }
}
