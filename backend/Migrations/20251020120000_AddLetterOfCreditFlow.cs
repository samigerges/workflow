using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLetterOfCreditFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Flow",
                table: "LettersOfCredit",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "GASC_TO_UPF");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Flow",
                table: "LettersOfCredit");
        }
    }
}
