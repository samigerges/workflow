# Workflow Application

## Configuration

The backend expects database credentials to be provided via environment variables. The connection string is read from `ConnectionStrings:DefaultConnection`.

Create a `.env` file based on `.env.example` and set the connection string:

```bash
cp .env.example .env
# edit .env to suit your environment
```

### Required Variables

- `CONNECTIONSTRINGS__DEFAULTCONNECTION`: full PostgreSQL connection string used by the backend.

## Development

To run the stack locally:

```bash
docker compose up --build
```

Docker Compose will load variables from your `.env` file and pass them to the backend container.
