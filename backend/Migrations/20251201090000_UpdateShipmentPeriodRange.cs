using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShipmentPeriodRange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ShipmentPeriodEnd",
                table: "LettersOfCredit",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShipmentPeriodStart",
                table: "LettersOfCredit",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"LettersOfCredit\" SET \"ShipmentPeriodStart\" = \"ShipmentPeriod\", \"ShipmentPeriodEnd\" = \"ShipmentPeriod\" WHERE \"ShipmentPeriod\" IS NOT NULL;");

            migrationBuilder.Sql(
                "ALTER TABLE \"LettersOfCredit\" DROP COLUMN IF EXISTS \"ShipmentPeriod\";");

            migrationBuilder.Sql(
                "ALTER TABLE \"LettersOfCredit\" DROP COLUMN IF EXISTS \"Beneficiary\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Beneficiary",
                table: "LettersOfCredit",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShipmentPeriod",
                table: "LettersOfCredit",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"LettersOfCredit\" SET \"ShipmentPeriod\" = COALESCE(\"ShipmentPeriodStart\", \"ShipmentPeriodEnd\");");

            migrationBuilder.DropColumn(
                name: "ShipmentPeriodEnd",
                table: "LettersOfCredit");

            migrationBuilder.DropColumn(
                name: "ShipmentPeriodStart",
                table: "LettersOfCredit");
        }
    }
}
