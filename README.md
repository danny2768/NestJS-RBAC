# NestJS Role based access control

This project uses PostgreSQL as the database, Prisma as the ORM, and Docker for containerization.

## Table of Contents

- [NestJS Role based access control](#nestjs-role-based-access-control)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Running in Development Mode](#running-in-development-mode)
  - [Database Migrations with Prisma](#database-migrations-with-prisma)
    - [Apply Migrations](#apply-migrations)
    - [Generate Prisma Client](#generate-prisma-client)
    - [Reset the Database](#reset-the-database)
    - [View Database Schema](#view-database-schema)
  - [Environment Variables](#environment-variables)
  - [Docker Compose](#docker-compose)
  - [API Documentation](#api-documentation)
    - [Accessing Swagger UI](#accessing-swagger-ui)
    - [Features of Swagger UI](#features-of-swagger-ui)
    - [Example Usage](#example-usage)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Docker](https://www.docker.com/) (v20 or higher)
- [Docker Compose](https://docs.docker.com/compose/)
- [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) (`npm install -g prisma`)

---

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/danny2768/NestJS-RBAC.git
   cd NestJS-RBAC
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the `.env.example` file to `.env` and update the environment variables as needed:

   ```bash
   cp .env.example .env
   ```

---

## Running in Development Mode

To run the application in development mode, follow these steps:

1. Start the PostgreSQL database using Docker Compose:

   ```bash
   docker-compose up -d
   ```

2. Run database migrations using Prisma:

   ```bash
   npx prisma migrate dev --name init
   ```

3. Start the NestJS application:

   ```bash
   npm run start:dev
   ```

The application will be available at `http://localhost:3000`.

---

## Database Migrations with Prisma

### Apply Migrations

To apply pending migrations to the database:

```bash
npx prisma migrate dev
```

### Generate Prisma Client

If you make changes to your Prisma schema, regenerate the Prisma Client:

```bash
npx prisma generate
```

### Reset the Database

To reset the database and apply all migrations from scratch:

```bash
npx prisma migrate reset
```

### View Database Schema

To visualize your database schema:

```bash
npx prisma studio
```

---

## Environment Variables

The following environment variables are required for the application to run:

| Variable                 | Description                                      | Default Value |
| ------------------------ | ------------------------------------------------ | ------------- |
| `NODE_ENV`               | Node environment (`development` or `production`) | `development` |
| `PORT`                   | Port on which the application runs               | `3000`        |
| `DB_URL`                 | PostgreSQL connection URL                        | -             |
| `DB_USER`                | PostgreSQL username                              | -             |
| `DB_PASSWORD`            | PostgreSQL password                              | -             |
| `DB_NAME`                | PostgreSQL database name                         | -             |
| `DB_PORT`                | PostgreSQL port                                  | -             |
| `JWT_SECRET`             | Secret key for JWT token generation              | -             |
| `JWT_EXPIRATION_TIME`    | Expiration time for JWT tokens                   | -             |
| `JWT_REFRESH_EXPIRES_IN` | Expiration time for JWT refresh tokens           | -             |

---

## Docker Compose

The `compose.yml` file is used to set up the PostgreSQL database in a Docker container. Here’s a breakdown of the configuration:

```yaml
services:
  db:
    image: postgres:17.3-alpine
    restart: no
    container_name: project-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '${DB_PORT}:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

To start the database:

```bash
docker-compose up -d
```

To stop the database:

```bash
docker-compose down
```

## API Documentation

This NestJS application provides API documentation using **Swagger UI**. Swagger is a powerful tool that allows you to interact with the API endpoints directly from your browser, making it easier to understand and test the API.

### Accessing Swagger UI

To access the Swagger documentation, navigate to the following URL after starting the application:

```url
http://localhost:3000/api-docs
```

Alternatively, you can access it via the `/api-docs` endpoint if the application is hosted elsewhere.

### Features of Swagger UI

- **Interactive API Documentation**: Explore all available endpoints, their request/response structures, and supported HTTP methods.
- **Model Schemas**: View detailed schemas for request and response bodies, including data types and validation rules.

### Example Usage

1. **Start the Application**: Ensure the NestJS application is running in development mode (`npm run start:dev`).
2. **Open Swagger UI**: Go to `http://localhost:3000/api-docs` in your browser.
3. **Explore Endpoints**: Expand the sections to view available endpoints (e.g., `/users`, `/auth`).

---
