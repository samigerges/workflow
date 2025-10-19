using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace WorkflowBackend.Api.Data
{
    public static class SchemaUpgrader
    {
        private const string IdentifierPrefix = "2025/W/";

        public static async Task EnsureRequestAndContractIdentifiersAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            if (db is null) throw new ArgumentNullException(nameof(db));

            var provider = db.Database.ProviderName;

            if (string.Equals(provider, "Npgsql.EntityFrameworkCore.PostgreSQL", StringComparison.Ordinal))
            {
                await EnsureForPostgresAsync(db, cancellationToken);
            }
            else if (string.Equals(provider, "Microsoft.EntityFrameworkCore.SqlServer", StringComparison.Ordinal))
            {
                await EnsureForSqlServerAsync(db, cancellationToken);
            }
            else if (string.Equals(provider, "Microsoft.EntityFrameworkCore.Sqlite", StringComparison.Ordinal))
            {
                await EnsureForSqliteAsync(db, cancellationToken);
            }
        }

        private static async Task EnsureForPostgresAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Requests'
          AND column_name = 'SequenceNumber'
    ) THEN
        ALTER TABLE "Requests"
        ADD COLUMN "SequenceNumber" integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Requests'
          AND column_name = 'PublicId'
    ) THEN
        ALTER TABLE "Requests"
        ADD COLUMN "PublicId" character varying(50) NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Requests'
          AND column_name = 'WheatPercentage'
    ) THEN
        ALTER TABLE "Requests"
        ADD COLUMN "WheatPercentage" numeric(5,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Contracts'
          AND column_name = 'SequenceNumber'
    ) THEN
        ALTER TABLE "Contracts"
        ADD COLUMN "SequenceNumber" integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Contracts'
          AND column_name = 'PublicId'
    ) THEN
        ALTER TABLE "Contracts"
        ADD COLUMN "PublicId" character varying(50) NOT NULL DEFAULT '';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Vessels'
          AND column_name = 'InvoiceNumber'
    ) THEN
        ALTER TABLE "Vessels"
        DROP COLUMN "InvoiceNumber";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Vessels'
          AND column_name = 'InvoiceUnitPrice'
    ) THEN
        ALTER TABLE "Vessels"
        DROP COLUMN "InvoiceUnitPrice";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Vessels'
          AND column_name = 'InvoiceTotalPrice'
    ) THEN
        ALTER TABLE "Vessels"
        DROP COLUMN "InvoiceTotalPrice";
    END IF;

END $$;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt", "Id") - 1 AS seq
    FROM "Requests"
)
UPDATE "Requests" r
SET "SequenceNumber" = ranked.seq
FROM ranked
WHERE r."Id" = ranked."Id"
  AND COALESCE(r."SequenceNumber", -1) <> ranked.seq;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt", "Id") - 1 AS seq
    FROM "Contracts"
)
UPDATE "Contracts" c
SET "SequenceNumber" = ranked.seq
FROM ranked
WHERE c."Id" = ranked."Id"
  AND COALESCE(c."SequenceNumber", -1) <> ranked.seq;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE "Requests"
SET "PublicId" = '{IdentifierPrefix}' || "SequenceNumber"
WHERE "PublicId" IS NULL
   OR "PublicId" = ''
   OR "PublicId" <> '{IdentifierPrefix}' || "SequenceNumber";
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE "Contracts"
SET "PublicId" = '{IdentifierPrefix}' || "SequenceNumber"
WHERE "PublicId" IS NULL
   OR "PublicId" = ''
   OR "PublicId" <> '{IdentifierPrefix}' || "SequenceNumber";
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
ALTER TABLE "Requests"
ALTER COLUMN "SequenceNumber" SET NOT NULL;

ALTER TABLE "Requests"
ALTER COLUMN "SequenceNumber" SET DEFAULT 0;

ALTER TABLE "Requests"
ALTER COLUMN "PublicId" SET NOT NULL;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
ALTER TABLE "Contracts"
ALTER COLUMN "SequenceNumber" SET NOT NULL;

ALTER TABLE "Contracts"
ALTER COLUMN "SequenceNumber" SET DEFAULT 0;

ALTER TABLE "Contracts"
ALTER COLUMN "PublicId" SET NOT NULL;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Requests_PublicId" ON "Requests" ("PublicId");
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Contracts_PublicId" ON "Contracts" ("PublicId");
""",
                cancellationToken);
        }

        private static async Task EnsureForSqlServerAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
IF COL_LENGTH('Requests', 'SequenceNumber') IS NULL
BEGIN
    ALTER TABLE [Requests]
    ADD [SequenceNumber] INT NOT NULL CONSTRAINT DF_Requests_SequenceNumber DEFAULT 0;
END;

IF COL_LENGTH('Requests', 'PublicId') IS NULL
BEGIN
    ALTER TABLE [Requests]
    ADD [PublicId] NVARCHAR(50) NOT NULL CONSTRAINT DF_Requests_PublicId DEFAULT '';
END;

IF COL_LENGTH('Requests', 'WheatPercentage') IS NULL
BEGIN
    ALTER TABLE [Requests]
    ADD [WheatPercentage] DECIMAL(5,2) NULL;
END;

IF COL_LENGTH('Contracts', 'SequenceNumber') IS NULL
BEGIN
    ALTER TABLE [Contracts]
    ADD [SequenceNumber] INT NOT NULL CONSTRAINT DF_Contracts_SequenceNumber DEFAULT 0;
END;

IF COL_LENGTH('Contracts', 'PublicId') IS NULL
BEGIN
    ALTER TABLE [Contracts]
    ADD [PublicId] NVARCHAR(50) NOT NULL CONSTRAINT DF_Contracts_PublicId DEFAULT '';
END;

IF COL_LENGTH('Vessels', 'InvoiceNumber') IS NOT NULL
BEGIN
    ALTER TABLE [Vessels]
    DROP COLUMN [InvoiceNumber];
END;

IF COL_LENGTH('Vessels', 'InvoiceUnitPrice') IS NOT NULL
BEGIN
    ALTER TABLE [Vessels]
    DROP COLUMN [InvoiceUnitPrice];
END;

IF COL_LENGTH('Vessels', 'InvoiceTotalPrice') IS NOT NULL
BEGIN
    ALTER TABLE [Vessels]
    DROP COLUMN [InvoiceTotalPrice];
END;

""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT [Id], ROW_NUMBER() OVER (ORDER BY [CreatedAt], [Id]) - 1 AS seq
    FROM [Requests]
)
UPDATE r
SET [SequenceNumber] = ranked.seq
FROM [Requests] AS r
INNER JOIN ranked ON r.[Id] = ranked.[Id]
WHERE ISNULL(r.[SequenceNumber], -1) <> ranked.seq;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT [Id], ROW_NUMBER() OVER (ORDER BY [CreatedAt], [Id]) - 1 AS seq
    FROM [Contracts]
)
UPDATE c
SET [SequenceNumber] = ranked.seq
FROM [Contracts] AS c
INNER JOIN ranked ON c.[Id] = ranked.[Id]
WHERE ISNULL(c.[SequenceNumber], -1) <> ranked.seq;
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE [Requests]
SET [PublicId] = '{IdentifierPrefix}' + CAST([SequenceNumber] AS nvarchar(20))
WHERE [PublicId] IS NULL
   OR [PublicId] = ''
   OR [PublicId] <> '{IdentifierPrefix}' + CAST([SequenceNumber] AS nvarchar(20));
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE [Contracts]
SET [PublicId] = '{IdentifierPrefix}' + CAST([SequenceNumber] AS nvarchar(20))
WHERE [PublicId] IS NULL
   OR [PublicId] = ''
   OR [PublicId] <> '{IdentifierPrefix}' + CAST([SequenceNumber] AS nvarchar(20));
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Requests_PublicId' AND object_id = OBJECT_ID('[Requests]')
)
BEGIN
    CREATE UNIQUE INDEX [IX_Requests_PublicId] ON [Requests] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Contracts_PublicId' AND object_id = OBJECT_ID('[Contracts]')
)
BEGIN
    CREATE UNIQUE INDEX [IX_Contracts_PublicId] ON [Contracts] ([PublicId]);
END;
""",
                cancellationToken);
        }

        private static async Task EnsureForSqliteAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
ALTER TABLE "Requests" ADD COLUMN IF NOT EXISTS "SequenceNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Requests" ADD COLUMN IF NOT EXISTS "PublicId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Requests" ADD COLUMN IF NOT EXISTS "WheatPercentage" REAL;
ALTER TABLE "Contracts" ADD COLUMN IF NOT EXISTS "SequenceNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Contracts" ADD COLUMN IF NOT EXISTS "PublicId" TEXT NOT NULL DEFAULT '';
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt", "Id") - 1 AS seq
    FROM "Requests"
)
UPDATE "Requests"
SET "SequenceNumber" = (
    SELECT seq FROM ranked WHERE ranked."Id" = "Requests"."Id"
)
WHERE "SequenceNumber" IS NULL OR "SequenceNumber" <> (
    SELECT seq FROM ranked WHERE ranked."Id" = "Requests"."Id"
);
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
WITH ranked AS (
    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt", "Id") - 1 AS seq
    FROM "Contracts"
)
UPDATE "Contracts"
SET "SequenceNumber" = (
    SELECT seq FROM ranked WHERE ranked."Id" = "Contracts"."Id"
)
WHERE "SequenceNumber" IS NULL OR "SequenceNumber" <> (
    SELECT seq FROM ranked WHERE ranked."Id" = "Contracts"."Id"
);
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE "Requests"
SET "PublicId" = '{IdentifierPrefix}' || "SequenceNumber"
WHERE "PublicId" IS NULL
   OR "PublicId" = ''
   OR "PublicId" <> '{IdentifierPrefix}' || "SequenceNumber";
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                $"""
UPDATE "Contracts"
SET "PublicId" = '{IdentifierPrefix}' || "SequenceNumber"
WHERE "PublicId" IS NULL
   OR "PublicId" = ''
   OR "PublicId" <> '{IdentifierPrefix}' || "SequenceNumber";
""",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Requests_PublicId" ON "Requests" ("PublicId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Contracts_PublicId" ON "Contracts" ("PublicId");
""",
                cancellationToken);
        }
    }
}
