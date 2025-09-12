# Backend Deployment

The backend seeds an initial administrator account on startup when no users exist.
Credentials for this account are supplied via configuration, typically environment variables.

## Required Environment Variables

Set the following variables before running the backend:

- `Admin__Email` – email address for the admin account.
- `Admin__Password` – password for the admin account.

### Optional Variables

- `Admin__FirstName` – first name of the admin user. Defaults to `Admin` if unset.
- `Admin__LastName` – last name of the admin user. Defaults to `User` if unset.

Example shell setup:

```bash
export Admin__Email="admin@example.com"
export Admin__Password="strongPassword123"
export Admin__FirstName="Ada"
export Admin__LastName="Lovelace"
```

These values may also be provided through an `appsettings.json` `Admin` section.
