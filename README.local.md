# ImportFlow - Local Deployment

## Quick Start Guide

### 1. Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### 2. Clone and Setup
```bash
git clone <your-repo>
cd importflow
cp .env.local .env
npm install
```

### 3. Database Setup
```bash
# Create database
createdb importflow_local

# Apply schema
npm run db:push
```

### 4. Run Locally
```bash
# Development
npm run dev:local

# Or use the local files directly
tsx server/index.local.ts
```

### 5. Access Application
- URL: http://localhost:5000
- Login: admin@importflow.local / admin123

## Local Files Structure

```
Local Version Files:
├── server/
│   ├── index.local.ts      # Local server entry
│   ├── localAuth.ts        # Simple auth system
│   └── routes.local.ts     # Routes without Replit deps
├── client/src/
│   ├── App.local.tsx       # Local app component
│   └── pages/login.tsx     # Login page
├── vite.config.local.ts    # Local Vite config
├── package.local.json      # Dependencies without Replit
├── .env.local             # Local environment template
└── LOCAL_SETUP.md         # Detailed setup guide
```

## Key Differences from Replit Version

### Removed
- @replit/vite-plugin-cartographer
- @replit/vite-plugin-runtime-error-modal  
- Replit Auth (OpenID Connect)
- Environment-specific configurations

### Added
- passport-local authentication
- Simple login page
- Local environment configuration
- Memory-based sessions (development)

## Production Considerations

For production deployment:
1. Use proper database (not SQLite)
2. Implement secure session storage
3. Add password hashing
4. Enable HTTPS
5. Set proper environment variables
6. Add monitoring and logging

## Database Support

The local version supports:
- PostgreSQL (recommended)
- SQLite (development only)
- Any Drizzle-compatible database

Simply update the DATABASE_URL in your .env file.

## Authentication

Default local auth includes:
- Simple email/password login  
- Session-based authentication
- Default admin user creation
- Role-based access control maintained

For production, consider implementing:
- User registration
- Password reset
- 2FA authentication
- OAuth integration

## Deploy Anywhere

This local version can be deployed to:
- VPS/Dedicated servers
- Digital Ocean Droplets
- AWS EC2/Lightsail
- Google Cloud Compute
- Heroku/Railway
- Docker containers
- Any Node.js hosting platform

The application is now completely independent of Replit infrastructure.