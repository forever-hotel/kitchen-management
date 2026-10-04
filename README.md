# Forever Hotel Kitchen Management System

A full-stack kitchen management application for the Forever Hotel operations stack. The project combines a NestJS API, a Next.js frontend, and supporting infrastructure for local development with PostgreSQL and RabbitMQ.

## Stack

- Backend: NestJS 12 + TypeScript
- Frontend: Next.js 16 + React 19 + TypeScript
- Database: PostgreSQL 15
- Messaging: RabbitMQ 4
- Local orchestration: Docker Compose

## Project structure

```text
backend/           NestJS API and configuration
frontend/          Next.js frontend application
contracts/         Shared contract/workspace files
compose.yaml       Docker Compose for local infrastructure
README.md          Project overview and local setup
```

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop or Docker Engine

## Quick start with Docker Compose

This is the recommended way to run the full stack locally:

```bash
docker compose up --build
```

This starts the following services:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432
- RabbitMQ: localhost:5672
- RabbitMQ management UI: http://localhost:15672

## Local development without Docker

### 1) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Configure the backend environment

Create the backend environment file from the example:

```bash
cd backend
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

The backend environment currently includes:

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3001` | Backend HTTP port |

### 3) Start both apps

Start the backend in one terminal:

```bash
cd backend
npm run start:dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Useful commands

### Backend

```bash
cd backend
npm run build
npm run lint
npm run test
npm run test:e2e
npm run format
npm run format:check
```

### Frontend

```bash
cd frontend
npm run build
npm run lint
npm run format
npm run format:check
```

## Docker services details

The Compose file defines:

- `backend`: NestJS app, exposed on port 3001
- `frontend`: Next.js app, exposed on port 3000
- `postgres`: PostgreSQL database, exposed on port 5432
- `rabbitmq`: RabbitMQ broker, exposed on ports 5672 and 15672

The frontend container injects `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` so the app can call the backend from the browser.

## Backend Health and API Documentation

When the KMS backend is running:

### Liveness

```text
GET http://localhost:3001/health/live
```

## Additional documentation

See the framework-specific READMEs for more details:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

### Development database persistence

The PostgreSQL container in the local Docker development environment is
intentionally ephemeral, following the Forever Hotel SDS development
environment specification.

PostgreSQL data is stored using Docker `tmpfs`.

As a result, database contents are lost when the PostgreSQL container is
restarted or recreated.

Do not store important development data in this database.

This environment is intended for local development and repeatable test data.
Persistent PostgreSQL storage is used for staging and production environments.

