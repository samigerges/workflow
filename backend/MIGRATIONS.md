# Database Migrations

This project uses [Entity Framework Core](https://learn.microsoft.com/ef/core/) with a PostgreSQL database.

## Creating a New Migration

1. Make your model changes in `Data` or `Models`.
2. From the `backend` directory run:
   ```bash
   dotnet ef migrations add <MigrationName>
   dotnet ef database update
   ```
   This requires the `.NET SDK` and the `Microsoft.EntityFrameworkCore.Design` package.
3. Commit the generated files under `backend/Migrations` along with your model changes.

## Applying Migrations

The API automatically applies pending migrations on startup via `app.Database.Migrate()`.

To apply migrations manually run:
```bash
dotnet ef database update
```

## Reverting

To undo the last migration:
```bash
dotnet ef migrations remove
```
Use this only if the migration hasn't been committed or deployed.
