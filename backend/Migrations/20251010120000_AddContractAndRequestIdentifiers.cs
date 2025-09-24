using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowBackend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContractAndRequestIdentifiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicId",
                table: "Requests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SequenceNumber",
                table: "Requests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PublicId",
                table: "Contracts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SequenceNumber",
                table: "Contracts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            if (ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT \"Id\", ROW_NUMBER() OVER (ORDER BY \"CreatedAt\", \"Id\") - 1 AS seq
    FROM \"Contracts\"
)
UPDATE \"Contracts\" AS c
SET \"SequenceNumber\" = ranked.seq,
    \"PublicId\" = '2025/W/' || ranked.seq
FROM ranked
WHERE c.\"Id\" = ranked.\"Id\";");

                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT \"Id\", ROW_NUMBER() OVER (ORDER BY \"CreatedAt\", \"Id\") - 1 AS seq
    FROM \"Requests\"
)
UPDATE \"Requests\" AS r
SET \"SequenceNumber\" = ranked.seq,
    \"PublicId\" = '2025/W/' || ranked.seq
FROM ranked
WHERE r.\"Id\" = ranked.\"Id\";");
            }
            else if (ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT [Id], ROW_NUMBER() OVER (ORDER BY [CreatedAt], [Id]) - 1 AS seq
    FROM [Contracts]
)
UPDATE c
SET [SequenceNumber] = ranked.seq,
    [PublicId] = '2025/W/' + CAST(ranked.seq AS nvarchar(20))
FROM [Contracts] AS c
INNER JOIN ranked ON c.[Id] = ranked.[Id];");

                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT [Id], ROW_NUMBER() OVER (ORDER BY [CreatedAt], [Id]) - 1 AS seq
    FROM [Requests]
)
UPDATE r
SET [SequenceNumber] = ranked.seq,
    [PublicId] = '2025/W/' + CAST(ranked.seq AS nvarchar(20))
FROM [Requests] AS r
INNER JOIN ranked ON r.[Id] = ranked.[Id];");
            }
            else if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT \"Id\", ROW_NUMBER() OVER (ORDER BY \"CreatedAt\", \"Id\") - 1 AS seq
    FROM \"Contracts\"
)
UPDATE \"Contracts\"
SET \"SequenceNumber\" = (
        SELECT seq FROM ranked WHERE ranked.\"Id\" = \"Contracts\".\"Id\"
    ),
    \"PublicId\" = '2025/W/' || (
        SELECT seq FROM ranked WHERE ranked.\"Id\" = \"Contracts\".\"Id\"
    );");

                migrationBuilder.Sql(@"WITH ranked AS (
    SELECT \"Id\", ROW_NUMBER() OVER (ORDER BY \"CreatedAt\", \"Id\") - 1 AS seq
    FROM \"Requests\"
)
UPDATE \"Requests\"
SET \"SequenceNumber\" = (
        SELECT seq FROM ranked WHERE ranked.\"Id\" = \"Requests\".\"Id\"
    ),
    \"PublicId\" = '2025/W/' || (
        SELECT seq FROM ranked WHERE ranked.\"Id\" = \"Requests\".\"Id\"
    );");
            }

            migrationBuilder.CreateIndex(
                name: "IX_Requests_PublicId",
                table: "Requests",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_PublicId",
                table: "Contracts",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Requests_PublicId",
                table: "Requests");

            migrationBuilder.DropIndex(
                name: "IX_Contracts_PublicId",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "SequenceNumber",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "SequenceNumber",
                table: "Contracts");
        }
    }
}
