using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLcPricingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CargoType",
                table: "LettersOfCredit",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerUnit",
                table: "LettersOfCredit",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "LettersOfCredit",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShipmentPeriod",
                table: "LettersOfCredit",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CargoType",
                table: "LettersOfCredit");

            migrationBuilder.DropColumn(
                name: "PricePerUnit",
                table: "LettersOfCredit");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "LettersOfCredit");

            migrationBuilder.DropColumn(
                name: "ShipmentPeriod",
                table: "LettersOfCredit");
        }
    }
}
