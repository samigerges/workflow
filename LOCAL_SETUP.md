# ImportFlow - Local Setup Guide

This guide helps you run the ImportFlow application locally without any Replit dependencies.

## ⚠️ Important Note
The main application still contains some Replit-specific files that won't affect local functionality:
- `vite.config.ts` has Replit plugins (safely ignored when packages are missing)
- `.replit` configuration file (only used by Replit environment)

The application will run perfectly on your local environment despite these files.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database
3. **npm** or **yarn** package manager

## Quick Setup

### 1. Database Setup

First, set up your PostgreSQL database:

```bash
# Create a new database
createdb importflow_local

# Or using psql
psql -c "CREATE DATABASE importflow_local;"
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/importflow_local

# Session
SESSION_SECRET=your-secret-key-here

# Development
NODE_ENV=development
```

Replace `username`, `password`, and `your-secret-key-here` with your actual values.

### 3. Install Dependencies

```bash
npm install
```

**Note:** If you see warnings about missing @replit packages, ignore them - they're not needed for local deployment.

### 4. Setup Database Schema

```bash
npm run db:push
```

### 5. Start the Application

For local development:

```bash
npm run dev:local
```

The application will be available at: `http://localhost:5000`

## Default Login Credentials

```
Email: admin@importflow.local
Password: admin123
```

## Local vs Replit Differences

### Removed Dependencies
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-runtime-error-modal`
- Replit Auth (OpenID Connect)

### Replaced Features
- **Authentication**: Simple local login with passport-local
- **Session Storage**: Memory-based sessions (suitable for development)
- **User Management**: Default admin user created automatically

## File Structure for Local Development

```
project/
├── server/
│   ├── index.local.ts       # Local server entry point
│   ├── localAuth.ts         # Local authentication system
│   ├── routes.local.ts      # Routes without Replit dependencies
│   └── ...
├── client/
│   ├── src/
│   │   ├── pages/login.tsx  # Local login page
│   │   └── ...
├── package.local.json       # Local package configuration
├── vite.config.local.ts     # Local Vite configuration
└── .env                     # Local environment variables
```

## Scripts for Local Development

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev:local": "NODE_ENV=development tsx server/index.local.ts",
    "build:local": "vite build --config vite.config.local.ts && esbuild server/index.local.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start:local": "NODE_ENV=production node dist/index.js"
  }
}
```

## Production Deployment

For production deployment on your own servers:

1. Set `NODE_ENV=production`
2. Use a persistent session store (Redis or database-backed)
3. Enable HTTPS and secure cookies
4. Use proper password hashing (bcrypt)
5. Set up proper environment variables

## Security Notes

⚠️ **Important for Production:**

1. Change the default admin password
2. Implement proper password hashing
3. Use environment variables for secrets
4. Enable HTTPS in production
5. Use a persistent session store
6. Implement proper user management

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

### Port Conflicts
- Default port is 5000
- Change in `server/index.local.ts` if needed

### Session Issues
- Clear browser cookies
- Restart the server
- Check SESSION_SECRET is set

## Additional Features to Implement

For a complete local deployment, consider adding:

1. **User Registration**: Allow creating new users
2. **Password Reset**: Email-based password recovery
3. **Role Management**: Dynamic role assignment
4. **Audit Logging**: Track user actions
5. **Backup System**: Database backups
6. **Health Checks**: System monitoring

## Support

For issues with the local setup, check:
1. Node.js and PostgreSQL versions
2. Environment variable configuration
3. Database connectivity
4. File permissions

The local version maintains all the core functionality of the ImportFlow system while removing Replit-specific dependencies.