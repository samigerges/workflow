using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestVoteComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "RequestVotes",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RequestVotes_UserId",
                table: "RequestVotes",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RequestVotes_Users_UserId",
                table: "RequestVotes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RequestVotes_Users_UserId",
                table: "RequestVotes");

            migrationBuilder.DropIndex(
                name: "IX_RequestVotes_UserId",
                table: "RequestVotes");

            migrationBuilder.DropColumn(
                name: "Comment",
                table: "RequestVotes");
        }
    }
}
