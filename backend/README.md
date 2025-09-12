# Backend Configuration

The API uses configuration values from `appsettings.json` or environment variables.

## Required Environment Variables

- `ConnectionStrings__DefaultConnection` – PostgreSQL connection string. There is no fallback, so this must be provided.

## Optional Environment Variables

- `Auth__CookieName` – Cookie name for authentication (default: `workflow_auth`).
- `Auth__ExpireDays` – Cookie expiration in days (default: `7`).
- `AllowedOrigins` – Comma-separated list of allowed origins for CORS (defaults to `http://localhost:5173` and `http://localhost:5000`).
- `ASPNETCORE_ENVIRONMENT` – Use `Development` to enable dev features such as admin user seeding.

## Development Seeding

When running in the `Development` environment, the application creates the database if it does not exist and seeds a default admin user if the users table is empty:

- Email: `samy@gmail.com`
- Password: `admin123`

This setup is skipped in non-development environments.
