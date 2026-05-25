# Architecture Decision Document

## 1. Project Context Analysis
**Requirements overview**
The system is a dual-interface web application for managing patient lab reports. It comprises two main subsystems:
1.  **Patient Application**: A mobile-first web interface (FR-1 to FR-5, FR-12) for patients to log in via OTP, view their lab reports, and see a trend chart of their glucose levels.
2.  **Admin Panel**: A secure web interface (FR-6 to FR-11, FR-13) for administrators to manage patient records and their associated lab reports.
3.  **Backend API**: A central RESTful API that serves both the Patient Application and Admin Panel, handling business logic, authentication, and database interactions.
4.  **Non-Functional Requirements**: The system must be scalable, secure, and observable, with specific requirements for logging, metrics, health checks, and data protection.

**NFRs that drive architecture**
The dominant architectural constraints are **Security** and **Observability**.
-   **Security**: This is driven by multiple non-functional requirements, including Role-Based Access Control (NFR-2), Rate Limiting (NFR-5), Input Validation (NFR-3), Audit Logging (NFR-4), and Data-at-Rest Encryption (NFR-8).
-   **Observability**: This is driven by requirements for structured application logging (NFR-10), performance monitoring via metrics (NFR-11), and standardized health checks (NFR-12).

**Scalability (NFR-6)** is a secondary driver, influencing the database schema to accommodate future report types without major refactoring.

**Scale & complexity**
The project is of low-to-medium complexity, involving approximately 4-5 core data models (User, Report, AuditLog) and several cross-cutting concerns for observability. The architecture consists of three primary components: a Next.js frontend, a NestJS backend, and a MongoDB database.

**Technical constraints & dependencies**
-   **Stack**: MERN (MongoDB, Express, React, Node.js) is mandated. We will use NestJS (which uses Express by default) and Next.js (a React framework).
-   **Database**: MongoDB is the required database system.
-   **Authentication**: JWT-based session management is specified.
-   **OTP**: A static OTP (`123456`) is required for v1, with no SMS gateway integration.

**Cross-cutting concerns**
-   **Auditability**: Handled by a dedicated logging mechanism for security-sensitive actions (NFR-4).
-   **Security**: Addressed via RBAC, input validation, rate limiting, data encryption, and secure session management.
-   **Observability**: Achieved through structured JSON logging, Prometheus metrics, and a health check endpoint.
-   **Cost**: The choice of a consolidated monorepo and a single container deployment model aims to minimize operational overhead.

## 2. Starter / Foundation
The foundation is a TypeScript-based monorepo containing a Next.js frontend and a NestJS backend. This provides a robust, type-safe starting point with modern tooling.

-   **Backend API**: **NestJS 11.0**. It provides a structured, modular architecture that is ideal for building maintainable and scalable APIs.
    -   Scaffold command: `npx --yes @nestjs/cli@latest new backend --skip-git --package-manager npm`
-   **Web Frontend**: **Next.js 14.2**. It will serve both the Patient Application and the Admin Panel. Its App Router and server-side rendering capabilities are well-suited for this project.
    -   Scaffold command: `npx --yes create-next-app@latest frontend --typescript --eslint --app --src-dir --use-npm --import-alias "@/*" --tailwind --no-turbopack`
-   **Database Access**: **Mongoose** with `@nestjs/mongoose`. This is the idiomatic choice for integrating MongoDB with NestJS.

The following decisions are inherited from these foundations:
-   **Language**: TypeScript
-   **Build Tooling**: `nest build` (Webpack) for the backend, `next build` for the frontend.
-   **Project Structure**: Standard NestJS module structure (`src/app.module.ts`, etc.) and Next.js App Router structure (`src/app/page.tsx`, etc.).
-   **Testing Framework**: Jest, which is the default for both NestJS and Next.js.
-   **Linting**: ESLint, configured by both frameworks.

## 3. Core Architectural Decisions

### ADR-monorepo: Monorepo Project Structure
**Decision:** The frontend and backend code will reside in a single Git repository using an npm workspaces monorepo structure.
**Rationale:** This simplifies local development, as both services can be run with a single command. It also streamlines dependency management and makes it easier to share types or validation logic between the frontend and backend in the future. We trade away the ability to deploy services from separate repositories, which is unnecessary complexity for this project's scale.
**Affects:** Project setup, build process, CI/CD pipeline.

### ADR-state: MongoDB for Durable State
**Decision:** All application state, including users, reports, and audit logs, will be stored in a single MongoDB database.
**Rationale:** This is mandated by the project specification. MongoDB's flexible schema is well-aligned with the requirement to support new report types in the future (NFR-6). We trade away the relational integrity guarantees of a SQL database, which are not critical for this application's data model.
**Affects:** Backend, Data Models (FR-7, FR-9, FR-10, FR-11).

### ADR-runtime: Dual-Process Container
**Decision:** The application will be deployed as a single Docker container running two Node.js processes: one for the NestJS backend API and one for the Next.js frontend server.
**Rationale:** This co-location model is simple and cost-effective for an MVP. It avoids the complexity of managing a multi-container or microservices deployment. The trade-off is that the two processes are not independently scalable, but this is acceptable for the initial expected load.
**Affects:** Deployment, Dockerfile.

### ADR-data: Scalable Report Schema
**Decision:** The `Report` collection in MongoDB will use a discriminated union pattern to support multiple report types. A `reportType` field (e.g., `"GlucoseMarker"`) will determine the shape of a `data` sub-document.
**Rationale:** This directly addresses the scalability requirement (NFR-6). It allows new report types to be added with their own unique fields without altering the core schema or existing data. This is more flexible than adding dozens of optional fields to a single flat collection.
**Affects:** Backend (Report model and services), FR-10, FR-11.

### ADR-auth: JWT for Session Management
**Decision:** Authentication for both Patients and Admins will be managed using JSON Web Tokens (JWT).
**Rationale:** JWT is a stateless, secure, and widely-supported standard that fits the spec's requirement for secure session auth. The backend will issue a short-lived JWT upon successful login, containing the user's ID and role. NestJS Guards will validate this token on protected routes to enforce RBAC (NFR-2). Patient sessions will expire in 24 hours (FR-2), and Admin sessions in 1 hour (FR-8).
**Affects:** Backend (Auth module), Frontend (API client), FR-1, FR-2, FR-6, FR-8.

### ADR-creds: Backend-Scoped Secrets
**Decision:** All secrets, including the MongoDB connection string and JWT signing secret, will be managed exclusively by the backend application via environment variables.
**Rationale:** This follows the principle of least privilege. The frontend application, which runs in a less trusted environment (the browser), will have no access to any secrets. It will only handle the opaque JWT received from the API.
**Affects:** Backend configuration, Deployment.

### ADR-contracts: DTOs with Validation
**Decision:** All API request and response bodies will be defined as Data Transfer Objects (DTOs) using TypeScript classes. The backend will use the `class-validator` and `class-transformer` libraries to automatically validate incoming request bodies against these DTOs.
**Rationale:** This provides strong type safety and enforces the input validation requirement (NFR-3) at the application's entry point, preventing invalid data from reaching the business logic. It serves as a clear, self-documenting contract between the frontend and backend.
**Affects:** Backend (Controllers), Frontend (API client), FR-9, FR-10, FR-11.

### ADR-observability-logging: Structured JSON Logging
**Decision:** The backend application will emit structured JSON logs to `stdout`.
**Rationale:** This is a cloud-native best practice that fulfills NFR-10. It decouples the application from the logging aggregator (e.g., ELK, Splunk, CloudWatch Logs), which can easily parse the JSON format. It avoids writing to local files, which complicates log collection in containerized environments. Logs must not contain sensitive data like passwords or session tokens.
**Affects:** Backend logging implementation.

### ADR-observability-metrics: Prometheus Metrics Endpoint
**Decision:** The backend will expose a `GET /metrics` endpoint serving key performance indicators in the Prometheus exposition format.
**Rationale:** This standardizes performance monitoring (NFR-11) and integrates with a wide range of modern observability tools. It provides insight into application health, such as request latency, error rates, and resource usage, which is crucial for maintaining performance under load (NFR-9).
**Affects:** Backend. A new module will be added to collect and expose metrics.

### ADR-observability-health: Health Check Endpoint
**Decision:** The backend will expose a `GET /healthz` endpoint to report its operational status, including its ability to connect to the database.
**Rationale:** This provides a simple, standard mechanism for service discovery and health monitoring, fulfilling NFR-12. Container orchestrators (like Kubernetes) and load balancers can use this endpoint to determine if the application instance is healthy and ready to receive traffic.
**Affects:** Backend. A new module will be added to provide health indicators.

### ADR-security-audit-log: Persistent Audit Logging
**Decision:** A dedicated `AuditLog` collection will be created in MongoDB. A backend service will be responsible for creating immutable log entries for key security events (e.g., logins, report creation/modification).
**Rationale:** This creates a persistent, queryable record of sensitive actions, fulfilling the audit logging requirement (NFR-4). Storing audit trails in the database makes them easy to manage and query alongside application data, though for higher-scale systems this might be offloaded to a dedicated logging service.
**Affects:** Backend. A new module, Mongoose schema, and service will be created.

### ADR-security-data-encryption: Data-at-Rest Encryption
**Decision:** All sensitive patient data stored in the MongoDB database must be encrypted at rest.
**Rationale:** This is a fundamental security requirement (NFR-8) for protecting Patient PII and health data. This is typically a feature of the database hosting environment (e.g., MongoDB Atlas, AWS DocumentDB). This ADR makes it an explicit architectural requirement that the deployment environment must satisfy.
**Affects:** Deployment, Database hosting environment.

## 4. Implementation Patterns & Consistency Rules
**Naming conventions**
-   **Files/Directories**: `kebab-case` (e.g., `user.service.ts`, `admin-panel`).
-   **Variables/Functions**: `camelCase` (e.g., `getUserById`).
-   **Classes/Interfaces/Types/Components**: `PascalCase` (e.g., `CreateUserDto`, `PatientDashboard`).

**File & path conventions**
-   All source code lives within a `src/` directory in both `frontend` and `backend` projects.
-   Backend modules are organized by feature (e.g., `backend/src/users/`, `backend/src/auth/`).
-   Frontend routes are defined by the directory structure under `frontend/src/app/`.
-   Tests live alongside the source files they test, with a `.spec.ts` or `.test.ts` extension.

**Schema contracts**
API DTOs will be defined as TypeScript classes in the backend. Example:
```typescript
// backend/src/reports/dto/create-report.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsDateString()
  reportDate: Date;

  @IsNumber()
  glucoseValue: number;

  @IsString()
  @IsNotEmpty()
  status: 'Final' | 'Corrected';

  @IsString()
  @IsOptional()
  notes?: string;
}
```

**Process conventions**
-   **Logging**: The backend will log JSON-formatted strings to `stdout`.
-   **Error Handling**: The backend API will return standard HTTP status codes (e.g., 400 for validation errors, 401 for unauthorized, 403 for forbidden, 404 for not found, 500 for server errors). Error responses will have a consistent JSON shape: `{ "statusCode": number, "message": string | string[], "error": string }`.
-   **Commit Messages**: Conventional Commits standard (e.g., `feat: add report creation endpoint`).

## 5. Project Structure
The monorepo will have the following high-level structure:

```
.
├── _artifacts/
├── _pipeline/
│   └── build.Dockerfile
├── backend/                    # (via scaffolder)
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/               # (Auth module for login)
│   │   ├── users/              # (User management for Patient/Admin)
│   │   ├── reports/            # (Report management)
│   │   ├── health/             # NEW (Health check module)
│   │   ├── metrics/            # NEW (Prometheus metrics module)
│   │   └── audit/              # NEW (Audit logging module)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # (via scaffolder)
│   ├── src/
│   │   └── app/
│   │       ├── (patient)/      # (Route group for patient app)
│   │       │   └── dashboard/
│   │       │       └── page.tsx
│   │       ├── (admin)/        # (Route group for admin panel)
│   │       │   └── panel/
│   │       │       └── page.tsx
│   │       └── layout.tsx
│   ├── package.json
│   └── tsconfig.json
└── package.json                # (Root package.json for workspaces)
```

## 6. Decision Impact Analysis
**Implementation sequence**
A vertical slice can be achieved by implementing in this order:
1.  **Backend Foundation**: Set up NestJS app, MongoDB connection, and User model with roles. Implement foundational observability (logging, health check, metrics).
2.  **Admin Seeding**: Implement the logic to seed the initial admin user (FR-7).
3.  **Admin Auth**: Implement Admin login (FR-6) and JWT-based session management (FR-8).
4.  **Patient/Report CRUD**: Implement backend APIs for Admins to create patients (FR-9) and create/edit reports (FR-10, FR-11).
5.  **Audit Logging**: Integrate audit logging for all Admin write operations.
6.  **Admin Panel UI**: Build the frontend for Admin login and report management using Tailwind CSS.
7.  **Patient Auth & Dashboard**: Implement Patient login (FR-1) and the patient-facing dashboard to view reports and charts (FR-3, FR-4, FR-5).

**Cross-component dependencies**
-   The `frontend` application is entirely dependent on the `backend` API.
-   The `backend` application is dependent on the MongoDB database.
-   There are no circular dependencies.

## 7. Validation
**Coherence check:** The chosen technologies (NestJS, Next.js, MongoDB) are highly compatible and form a modern, coherent MERN stack. The ADRs are consistent with each other.
**Requirements coverage:**
-   **FR-1 to FR-13**: All functional requirements are mapped to components in the project structure and addressed by the ADRs.
-   **NFR-1 (HTTPS)**: Handled at the deployment/ingress level, outside the application code.
-   **NFR-2 (RBAC)**: Covered by ADR-auth.
-   **NFR-3 (Validation)**: Covered by ADR-contracts.
-   **NFR-4 (Audit Logging)**: Covered by ADR-security-audit-log.
-   **NFR-5 (Rate Limiting)**: To be implemented in the backend using `@nestjs/throttler`.
-   **NFR-6 (Scalability)**: Covered by ADR-data.
-   **NFR-7 (Mobile-first)**: Supported by the choice of Next.js and Tailwind CSS.
-   **NFR-8 (Data Encryption)**: Covered by ADR-security-data-encryption.
-   **NFR-9 (Performance)**: Supported by ADR-observability-metrics for monitoring.
-   **NFR-10 (Logging)**: Covered by ADR-observability-logging.
-   **NFR-11 (Metrics)**: Covered by ADR-observability-metrics.
-   **NFR-12 (Health Check)**: Covered by ADR-observability-health.
**Implementation readiness:** This document provides a clear foundation. The Dev stage can proceed by bootstrapping the projects with the specified scaffolders and then implementing features in the sequence provided.
**Gap analysis:** The plan covers all specified MVP requirements. There are no critical gaps.
