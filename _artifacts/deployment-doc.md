# Deployment Document

This document provides guidance for operators on deploying and managing the LabDash Patient Report Portal application.

## Prerequisites
-   Node.js 22.x LTS
-   npm 10.x or later
-   Access to a MongoDB instance (v6.0 or later)
-   A process manager like `pm2` for running multiple Node.js processes in production.

## Scaffolders

Before the development stage runs, the wrapper executes these commands in order to produce the base project structure. The development agent then adds feature code on top of this known-good foundation.

```json
{
  "scaffolders": [
    {
      "name": "NestJS backend",
      "command": [
        "npx", "-y", "@nestjs/cli@latest", "new", "backend",
        "--skip-git",
        "--skip-install",
        "--package-manager", "npm"
      ],
      "cwd": ".",
      "expected_files": [
        "backend/package.json",
        "backend/tsconfig.json",
        "backend/src/main.ts",
        "backend/src/app.module.ts"
      ],
      "timeoutSeconds": 180
    },
    {
      "name": "Next.js frontend",
      "command": [
        "npx", "-y", "create-next-app@latest", "frontend",
        "--typescript",
        "--eslint",
        "--app",
        "--src-dir",
        "--use-npm",
        "--import-alias", "@/*",
        "--tailwind",
        "--no-turbopack",
        "--skip-install"
      ],
      "cwd": ".",
      "expected_files": [
        "frontend/package.json",
        "frontend/tsconfig.json",
        "frontend/src/app/page.tsx",
        "frontend/tailwind.config.ts"
      ],
      "timeoutSeconds": 180
    }
  ]
}
```

## Styling system
- **Tailwind CSS** (configured by create-next-app via `--tailwind`).
- All components use utility classes only — no inline `style={{...}}` for static values.
- The dark theme (FR-14) will be implemented using Tailwind's `dark` variant. The theme configuration will be managed in `tailwind.config.ts`.

## Build & Package Step

The project is a monorepo using npm workspaces.

1.  **Install Dependencies**: From the repository root, run:
    ```bash
    npm install
    ```
2.  **Build Both Applications**: From the repository root, run:
    ```bash
    npm run build -w backend
    npm run build -w frontend
    ```
This will create production-ready builds in `backend/dist/` and `frontend/.next/`.

## Deploy Mechanisms

The recommended deployment method is a single Docker container.

1.  Build the Docker image using the `_pipeline/build.Dockerfile` as a base, but with a production-oriented `CMD`.
2.  The production container should run both the backend and frontend servers. A process manager like `pm2` is recommended. A `ecosystem.config.js` file would look like this:

    ```javascript
    module.exports = {
      apps : [{
        name: 'backend',
        script: 'backend/dist/main.js',
        instances: 1,
        autorestart: true,
        watch: false,
      }, {
        name: 'frontend',
        script: 'npm',
        args: 'start -w frontend',
        instances: 1,
        autorestart: true,
        watch: false,
      }]
    };
    ```
3.  Run the container, ensuring all required environment variables are provided.

## Environment Variables

The application requires two sets of environment variables, one for each component. The development stage will produce `.env.example` files at the specified paths.

| Variable                 | File path                 | Scope   | Secret? | Purpose                                           |
|--------------------------|---------------------------|---------|---------|---------------------------------------------------|
| `MONGODB_URI`            | `backend/.env.example`    | server  | YES     | Full connection string for the MongoDB database.  |
| `JWT_SECRET`             | `backend/.env.example`    | server  | YES     | A long, random string for signing JWTs.           |
| `PORT`                   | `backend/.env.example`    | server  | no      | Port for the backend API to listen on (e.g., 3001). |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/.env.example`   | browser | no      | The public URL of the backend API (e.g., `http://localhost:3001`). |

## Dependencies

### Backend (Node 22 LTS, NestJS 11)
| Package                    | Version    | Why                                      |
|----------------------------|------------|------------------------------------------|
| @nestjs/common             | ^11.0.0    | NestJS core                              |
| @nestjs/core               | ^11.0.0    | NestJS core                              |
| @nestjs/config             | ^3.2.2     | Environment variable management          |
| @nestjs/jwt                | ^10.2.0    | JWT authentication                       |
| @nestjs/mongoose           | ^10.0.6    | Mongoose integration for MongoDB         |
| @nestjs/passport           | ^10.0.3    | Authentication strategies                |
| @nestjs/throttler          | ^5.1.2     | Rate limiting (NFR-5)                    |
| bcryptjs                   | ^2.4.3     | Password hashing for Admin users         |
| class-transformer          | ^0.5.1     | DTO transformation                       |
| class-validator            | ^0.14.1    | DTO validation (NFR-3)                   |
| mongoose                   | ^8.4.0     | MongoDB ODM                              |
| passport                   | ^0.7.0     | Authentication middleware                |
| passport-jwt               | ^4.0.1     | JWT strategy for Passport                |
| reflect-metadata           | ^0.2.0     | Required for NestJS                      |
| rxjs                       | ^7.8.1     | Required for NestJS                      |

### Backend devDependencies
| Package                    | Version    | Why                                      |
|----------------------------|------------|------------------------------------------|
| @nestjs/cli                | ^11.0.0    | NestJS CLI tools                         |
| @nestjs/schematics         | ^11.0.0    | NestJS code generation                   |
| @nestjs/testing            | ^11.0.0    | Testing utilities                        |
| @types/bcryptjs            | ^2.4.6     | Type definitions for bcryptjs            |
| @types/express             | ^4.17.17   | Type definitions for Express             |
| @types/jest                | ^29.5.2    | Type definitions for Jest                |
| @types/node                | ^20.3.1    | Type definitions for Node.js             |
| @types/passport-jwt        | ^4.0.1     | Type definitions for passport-jwt        |
| @types/supertest           | ^6.0.0     | Type definitions for supertest           |
| eslint                     | ^8.42.0    | Linter                                   |
| eslint-plugin-prettier     | ^5.0.0     | Prettier integration for ESLint          |
| jest                       | ^29.5.0    | Test runner                              |
| prettier                   | ^3.0.0     | Code formatter                           |
| source-map-support         | ^0.5.21    | Source map support for stack traces      |
| supertest                  | ^6.3.3     | HTTP assertion library for testing       |
| ts-jest                    | ^29.1.0    | TypeScript preprocessor for Jest         |
| ts-loader                  | ^9.4.3     | TypeScript loader for Webpack            |
| ts-node                    | ^10.9.1    | TypeScript execution environment for Node|
| tsconfig-paths             | ^4.2.0     | Path mapping support for TypeScript      |
| typescript                 | ^5.1.3     | TypeScript compiler                      |

### Frontend (Node 22 LTS, Next.js 14)
| Package                    | Version    | Why                                      |
|----------------------------|------------|------------------------------------------|
| next                       | 14.2.3     | React framework                          |
| react                      | ^18        | UI library                               |
| react-dom                  | ^18        | DOM renderer for React                   |
| recharts                   | ^2.12.7    | Charting library for glucose trends (FR-5) |

### Frontend devDependencies
| Package                    | Version    | Why                                      |
|----------------------------|------------|------------------------------------------|
| @testing-library/jest-dom  | ^6.4.0     | DOM-aware assertions for Jest            |
| @testing-library/react     | ^16.0.0    | Component-rendering for tests            |
| @testing-library/user-event| ^14.5.0    | Simulate user interactions               |
| @types/jest                | ^29.5.0    | Type definitions for Jest                |
| @types/node                | ^20        | Type definitions for Node.js             |
| @types/react               | ^18        | Type definitions for React               |
| @types/react-dom           | ^18        | Type definitions for React DOM           |
| autoprefixer               | ^10.4.0    | Tailwind CSS dependency                  |
| eslint                     | ^8         | Linter                                   |
| eslint-config-next         | 14.2.3     | ESLint configuration for Next.js         |
| jest                       | ^29.7.0    | Test runner                              |
| jest-environment-jsdom     | ^29.7.0    | DOM environment for component tests      |
| postcss                    | ^8.4.0     | Tailwind CSS dependency                  |
| tailwindcss                | ^3.4.0     | Styling system (FR-14)                   |
| typescript                 | ^5         | TypeScript compiler                      |

## Health Checks / Smoke Tests
-   The backend should expose a `GET /health` endpoint that returns a `200 OK` status if the API is running and can connect to the database.
-   After deployment, a smoke test should involve:
    1.  Pinging the `/health` endpoint.
    2.  Attempting to load the frontend's main page.
    3.  Attempting an Admin login with invalid credentials to verify the API is responding.

## Rollback Procedure
If a deployment fails health checks or introduces a critical regression, roll back by deploying the previously known-good Docker image tag.
