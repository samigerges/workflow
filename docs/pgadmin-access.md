# Viewing the database with pgAdmin

Follow these steps to browse the project's PostgreSQL database with pgAdmin while running the Docker Compose stack.

## 1. Start the containers

```bash
docker compose up --build
```

This launches PostgreSQL alongside the backend and frontend. If you only need the database (and optionally pgAdmin) you can run:

```bash
docker compose up -d postgres pgadmin
```

The database listens on port `5432` using the credentials defined in `docker-compose.yml`:

| Setting   | Value      |
|-----------|------------|
| Host      | localhost  |
| Port      | 5432       |
| Database  | workflow   |
| Username  | workflow   |
| Password  | workflow   |

When connecting from inside the Docker network (e.g., from another container) use `postgres` as the host instead of `localhost`.

## 2. Log into pgAdmin

If you started the bundled pgAdmin service, open [http://localhost:5050](http://localhost:5050) in your browser.

* Email: `admin@workflow.local`
* Password: `workflow`

These defaults are also declared in `docker-compose.yml`.

## 3. Register the PostgreSQL server

1. In pgAdmin, right-click **Servers** → **Register** → **Server...**
2. Choose any name (for example, `Workflow`).
3. Under the **Connection** tab enter the credentials from the table above.
4. Click **Save**. The `workflow` database appears in the browser tree.

## 4. Inspect tables and import data

* Expand **Databases → workflow → Schemas → public → Tables** to see existing tables such as `Requests`, `Contracts`, `Vessels`, and `Ports`.
* To import spreadsheet data, export the sheet to CSV, right-click the target table, choose **Import/Export**, switch to **Import**, and map columns to finish the upload.
* Use the query tool (right-click the database → **Query Tool**) and run `SELECT * FROM "TableName" LIMIT 10;` to verify the rows you expect are present.

Once you complete these steps, the running application and pgAdmin will share the same PostgreSQL instance, so any data you load will immediately be available to the app.
