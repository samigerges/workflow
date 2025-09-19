using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnsureContractExtendedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "SupplierName" character varying(200);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "Quantity" numeric;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "CargoType" character varying(100);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "CountryOfOrigin" character varying(100);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "PricePerTon" numeric;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "PaymentMethod" character varying(100);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "ShippingMethod" character varying(100);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "ContractTerms" character varying(4000);
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "StartDate" timestamp with time zone;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "EndDate" timestamp with time zone;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                ADD COLUMN IF NOT EXISTS "ReviewNotes" character varying(1000);
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "ReviewNotes";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "EndDate";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "StartDate";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "ContractTerms";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "ShippingMethod";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "PaymentMethod";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "PricePerTon";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "CountryOfOrigin";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "CargoType";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "Quantity";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Contracts"
                DROP COLUMN IF EXISTS "SupplierName";
            """);
        }
    }
}
