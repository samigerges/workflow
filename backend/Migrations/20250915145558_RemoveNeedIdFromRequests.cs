using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNeedIdFromRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Needs_NeedId",
                table: "Requests");

            migrationBuilder.DropIndex(
                name: "IX_Requests_NeedId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "NeedId",
                table: "Requests");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "NeedId",
                table: "Requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Requests_NeedId",
                table: "Requests",
                column: "NeedId");

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Needs_NeedId",
                table: "Requests",
                column: "NeedId",
                principalTable: "Needs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
