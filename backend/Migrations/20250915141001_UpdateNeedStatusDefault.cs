using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateNeedStatusDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Needs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "draft",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Draft");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Needs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "draft");
        }
    }
}
