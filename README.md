# Workflow Project

This repository contains a sample full‑stack workflow application with a .NET backend and a Vite/React frontend.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/) for the backend
- [Node.js 20+](https://nodejs.org/) and npm for the frontend
- [Docker](https://www.docker.com/) for containerised deployment

## Setup

Clone the repository and install dependencies:

```bash
# Backend dependencies
cd backend
# (optional) restore packages
 dotnet restore

# Frontend dependencies
cd ../frontend
npm install
```

## Running

### Backend API

```bash
cd backend
dotnet run
```

The API listens on `http://localhost:5000` by default.

### Frontend

```bash
cd frontend
npm run dev
```

The application is served at `http://localhost:5173`.

## Tests

Backend tests use **xUnit** and can be executed with:

```bash
cd backend
dotnet test
```

Frontend tests use **Vitest**:

```bash
cd frontend
npm test
```

## Deployment

The project includes a `docker-compose.yml` file for local deployment. Build and run all services with:

```bash
docker compose up --build
```

This starts PostgreSQL, the backend API, and the frontend. See the compose file for exposed ports.

