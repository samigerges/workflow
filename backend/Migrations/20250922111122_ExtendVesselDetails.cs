using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExtendVesselDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualQuantity",
                table: "Vessels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArrivalDate",
                table: "Vessels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CargoType",
                table: "Vessels",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ContractId",
                table: "Vessels",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountryOfOrigin",
                table: "Vessels",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CustomsReleaseDate",
                table: "Vessels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomsReleaseFileName",
                table: "Vessels",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomsReleaseFilePath",
                table: "Vessels",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomsReleaseNumber",
                table: "Vessels",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomsReleaseStatus",
                table: "Vessels",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DischargeEndDate",
                table: "Vessels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DischargeStartDate",
                table: "Vessels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InspectionCompany",
                table: "Vessels",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InspectionCost",
                table: "Vessels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InsuranceCompany",
                table: "Vessels",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InsuranceCost",
                table: "Vessels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PortOfDischarge",
                table: "Vessels",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Vessels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingCompany",
                table: "Vessels",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingCost",
                table: "Vessels",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingInstructions",
                table: "Vessels",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TradeTerms",
                table: "Vessels",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vessels_ContractId",
                table: "Vessels",
                column: "ContractId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vessels_Contracts_ContractId",
                table: "Vessels",
                column: "ContractId",
                principalTable: "Contracts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vessels_Contracts_ContractId",
                table: "Vessels");

            migrationBuilder.DropIndex(
                name: "IX_Vessels_ContractId",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ActualQuantity",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ArrivalDate",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CargoType",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ContractId",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CountryOfOrigin",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CustomsReleaseDate",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CustomsReleaseFileName",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CustomsReleaseFilePath",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CustomsReleaseNumber",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "CustomsReleaseStatus",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "DischargeEndDate",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "DischargeStartDate",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "InspectionCompany",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "InspectionCost",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "InsuranceCompany",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "InsuranceCost",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "PortOfDischarge",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ShippingCompany",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ShippingCost",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "ShippingInstructions",
                table: "Vessels");

            migrationBuilder.DropColumn(
                name: "TradeTerms",
                table: "Vessels");
        }
    }
}
