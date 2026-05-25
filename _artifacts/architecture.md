# Architecture Decision Document

## 1. Project Context Analysis
**Requirements overview**
The system is a dual-interface web application for managing patient lab reports. It comprises two main subsystems:
1.  **Patient Application**: A mobile-first web interface (FR-1 to FR-5, FR-12) for patients to log in via OTP, view their lab reports, and see a trend chart of their glucose levels.
2.  **Admin Panel**: A secure web interface (FR-6 to FR-11, FR-13) for administrators to manage patient records and their associated lab reports.
3.  **Backend API**: A central RESTful API that serves both the Patient Application and Admin Panel, handling business logic, authentication, and database interactions.

**NFRs that drive architecture**
The dominant architectural constraint is **Security**. This is driven by multiple non-functional requirements:
-   **NFR-2: Role-Based Access Control (RBAC)**: The system must maintain a strict boundary between Patient and Admin roles. This dictates a JWT-based authentication strategy with role checks on every protected API endpoint.
-   **NFR-5: Rate Limiting**: Authentication endpoints must be protected against brute-force attacks.
-   **NFR-3: Input Validation**: All data from clients must be rigorously validated on the server side.
-   **NFR-4: Audit Logging**: Key events must be logged for security and compliance.

**Scalability (NFR-6)** is a secondary driver, influencing the database schema to accommodate future report types without major refactoring.

**Scale & complexity**
The project is of low complexity, involving approximately 3-4 core data models (User, Report, AuditLog). The architecture consists of three primary components: a Next.js frontend, a NestJS backend, and a MongoDB database.

**Technical constraints & dependencies**
-   **Stack**: MERN (MongoDB, Express, React, Node.js) is mandated. We will use NestJS (which uses Express by default) and Next.js (a React framework).
-   **Database**: MongoDB is the required database system.
-   **Authentication**: JWT-based session management is specified.
-   **OTP**: A static OTP (`123456`) is required for v1, with no SMS gateway integration.

**Cross-cutting concerns**
-   **Auditability**: Handled by a dedicated logging mechanism for security-sensitive actions (NFR-4).
-   **Security**: Addressed via RBAC, input validation, rate limiting, and secure session management.
-   **Observability**: Achieved through structured JSON logging to stdout from the backend.
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

### ADR-styling: Tailwind CSS for Styling
**Decision:** The frontend application will use Tailwind CSS for all styling, including the implementation of the dark theme.
**Rationale:** FR-14 requires a dark theme. Using a utility-first CSS framework like Tailwind provides a systematic way to manage styling, colors, and themes. It avoids inconsistent inline styles, promotes reusability, and makes implementing responsive design (NFR-7) and dark mode straightforward via its built-in variants (`dark:`). We trade away the component-based styling of libraries like Material UI, which is not required by the spec and adds more dependencies.
**Affects:** Frontend (all components), FR-14, NFR-7.
**Alternatives considered (if non-obvious):**
*   **CSS-in-JS:** More complex setup and potential runtime performance overhead.
*   **CSS Modules:** Good for scoping but less systematic for a design system without significant manual setup of design tokens. Tailwind provides this out of the box.

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
├── backend/                    # NEW (via scaffolder)
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/               # NEW (Auth module for login)
│   │   ├── users/              # NEW (User management for Patient/Admin)
│   │   └── reports/            # NEW (Report management)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # NEW (via scaffolder)
│   ├── src/
│   │   └── app/
│   │       ├── (patient)/      # NEW (Route group for patient app)
│   │       │   └── dashboard/
│   │       │       └── page.tsx
│   │       ├── (admin)/        # NEW (Route group for admin panel)
│   │       │   └── panel/
│   │       │       └── page.tsx
│   │       ├── globals.css     # UPDATE (scaffolder adds tailwind directives)
│   │       └── layout.tsx
│   ├── package.json
│   ├── postcss.config.js       # NEW (via scaffolder)
│   ├── tailwind.config.ts      # NEW (via scaffolder)
│   └── tsconfig.json
└── package.json                # NEW (Root package.json for workspaces)
```

## 6. Decision Impact Analysis
**Implementation sequence**
A vertical slice can be achieved by implementing in this order:
1.  **Backend Foundation**: Set up NestJS app, MongoDB connection, and User model with roles.
2.  **Admin Seeding**: Implement the logic to seed the initial admin user (FR-7).
3.  **Admin Auth**: Implement Admin login (FR-6) and JWT-based session management (FR-8).
4.  **Patient/Report CRUD**: Implement backend APIs for Admins to create patients (FR-9) and create/edit reports (FR-10, FR-11).
5.  **Admin Panel UI**: Build the frontend for Admin login and report management.
6.  **Patient Auth & Dashboard**: Implement Patient login (FR-1) and the patient-facing dashboard to view reports and charts (FR-3, FR-4, FR-5).
7.  **Theming**: Implement the dark theme (FR-14) across all frontend components using the new styling system.

**Cross-component dependencies**
-   The `frontend` application is entirely dependent on the `backend` API.
-   The `backend` application is dependent on the MongoDB database.
-   There are no circular dependencies.

## 7. Validation
**Coherence check:** The chosen technologies (NestJS, Next.js, MongoDB) are highly compatible and form a modern, coherent MERN stack. The ADRs are consistent with each other.
**Requirements coverage:**
-   **FR-1 to FR-13**: All functional requirements are mapped to components in the project structure and addressed by the ADRs. FR-12 and FR-13, which mandate end-to-end functionality, are covered by the overall client-server architecture and the implementation of the defined API contracts (ADR-contracts).
-   **FR-14 (Dark Theme)**: Covered by ADR-styling.
-   **NFR-1 (HTTPS)**: Handled at the deployment/ingress level, outside the application code.
-   **NFR-2 (RBAC)**: Covered by ADR-auth.
-   **NFR-3 (Validation)**: Covered by ADR-contracts.
-   **NFR-4 (Audit Logging)**: To be implemented as a dedicated module in the backend.
-   **NFR-5 (Rate Limiting)**: To be implemented in the backend using `@nestjs/throttler`.
-   **NFR-6 (Scalability)**: Covered by ADR-data.
-   **NFR-7 (Mobile-first)**: A core responsibility of the Next.js frontend implementation, supported by ADR-styling.
**Implementation readiness:** This document provides a clear foundation. The Dev stage can proceed by bootstrapping the projects with the specified scaffolders and then implementing features in the sequence provided.
**Gap analysis:** The plan covers all specified MVP requirements. There are no critical gaps.
