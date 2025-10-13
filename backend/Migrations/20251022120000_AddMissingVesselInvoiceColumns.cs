using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingVesselInvoiceColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" ADD COLUMN IF NOT EXISTS \"InvoiceNumber\" character varying(100);");
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" ADD COLUMN IF NOT EXISTS \"InvoiceUnitPrice\" numeric(18,2);");
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" ADD COLUMN IF NOT EXISTS \"InvoiceTotalPrice\" numeric(18,2);");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" DROP COLUMN IF EXISTS \"InvoiceNumber\";");
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" DROP COLUMN IF EXISTS \"InvoiceUnitPrice\";");
                migrationBuilder.Sql(@"ALTER TABLE \"Vessels\" DROP COLUMN IF EXISTS \"InvoiceTotalPrice\";");
            }
        }
    }
}
