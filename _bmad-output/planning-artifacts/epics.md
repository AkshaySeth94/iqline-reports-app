---
stepsCompleted: [1, 2, 3, 4]
status: 'final'
finalized: '2026-05-26'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-iqline-reports-app-2026-05-25/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _artifacts/architecture.md   # brownfield prior architecture (reference only)
title: 'Epics & Stories — Multi-Tenant Lab Segregation (iqline-reports-app)'
status: 'in-progress'
created: '2026-05-26'
owner: 'Ajax'
facilitator: 'John (PM)'
---

# iqline-reports-app — Epic Breakdown

## Overview

This document decomposes the multi-tenant lab segregation feature (PRD + Architecture) into epics and stories for the Developer agent (Amelia). Brownfield retrofit: Epic 1 Story 1 is the schema + migration foundation, NOT a "scaffold" story.

## Requirements Inventory

### Functional Requirements

56 FRs across 11 groups, defined fully in [prd.md §6](prds/prd-iqline-reports-app-2026-05-25/prd.md). Compact summary below; the PRD is the canonical source of truth for AC language.

**FR-1xx — Lab management (SuperAdmin) — 6 FRs**
- FR-101: Register lab with name, address, license #, contact details
- FR-102: List labs (paginated, searchable, with patient/report counts)
- FR-103: View lab detail (profile + admins + activity)
- FR-104: Suspend / re-activate lab (cascade rules per PRD)
- FR-105: Edit lab profile (renames audited)
- FR-106: No hard delete — suspension is the disable mechanism

**FR-2xx — Lab-admin management (SuperAdmin) — 6 FRs**
- FR-110: Create LabAdmin (name, phone, temp password ≥10 chars)
- FR-111: Force password change on first login
- FR-112: List lab admins per lab
- FR-113: Disable / re-enable lab admin
- FR-114: Reset lab admin password
- FR-115: No reassignment across labs in v1

**FR-12x — SuperAdmin metrics — 3 FRs**
- FR-120: Platform tiles (active labs, patients, reports last 7/30 days)
- FR-121: Per-lab activity sparkline (reports/week, last 4 weeks)
- FR-122: Audit log search by actor / lab / action / date

**FR-2xx — Patient identification & first-visit linking (LabAdmin) — 6 FRs**
- FR-200: Patient search by phone (this-lab list OR cross-lab match flow)
- FR-201: Cross-lab match found — confirmation dialog shows name + DOB
- FR-202: No match found — "Add new patient" modal (name + DOB required)
- FR-203: Duplicate-phone safety (no silent dupes; race-safe)
- FR-204: PatientLabLink record created on first link; idempotent
- FR-205: Patient list scoped exactly to this lab's links

**FR-3xx — Glucose report capture — 6 FRs**
- FR-300: Create report (patient, date, value, unit, mealContext, status, notes)
- FR-301: Auto-stamped fields (labId from JWT, createdBy, updatedBy, timestamps)
- FR-302: Edit only Corrected, OR transition Final→Corrected (single op OK)
- FR-303: No cross-lab visibility (interceptor + per-method assertion)
- FR-304: Patient detail drawer — this lab's reports only
- FR-305: Soft-delete (own lab's reports only; SuperAdmin override)

**FR-4xx — Patient dashboard (aggregated) — 6 FRs**
- FR-400: Aggregated reports query across all labs joined with lab metadata
- FR-401: Trend chart with mg/dL normalization, color + shape by lab
- FR-402: Filter chips (All labs / per-lab / meal context)
- FR-403: Per-report cards (lab name, date, value+unit, meal context, status)
- FR-404: Empty state for zero reports (no partner list disclosed)
- FR-405: Most-recent highlight with human-time bands

**FR-5xx — Auth & session — 6 FRs**
- FR-500: JWT payload v2 (sub, phone, role, labId, name, iat, exp, v)
- FR-501: Patient OTP login (static 123456, 24h JWT)
- FR-502: Admin password login (bcrypt, 1h JWT, transparent refresh)
- FR-503: Active-status check on every authenticated request
- FR-504: Demo OTP banner gated to NODE_ENV !== production
- FR-505: Bootstrap SuperAdmin via env (refuse to start in prod if missing)

**FR-6xx — Tenant scoping enforcement — 4 FRs**
- FR-600: LabScopeInterceptor injects labId on every LabAdmin query
- FR-601: Per-method assertion that result-set labId matches requester
- FR-602: SuperAdmin bypass (with cross-tenant-read audit entry)
- FR-603: Patient scoping by sub (never labId — patients see the union)

**FR-7xx — Audit log — 3 FRs**
- FR-700: Audit all writes + sensitive reads (patient-list, match-dialog, report views)
- FR-701: Audit fields (actor, lab, action, target, details, IP, UA, timestamp)
- FR-702: 24-month retention; non-deletable from app

**FR-8xx — Migration from single-tenant — 5 FRs**
- FR-800: Default Lab seeded with placeholder license sentinel
- FR-801: Existing admin promoted to LabAdmin of Default Lab (no forced reset)
- FR-802: Existing reports back-filled with labId; PatientLabLinks created
- FR-803: Migration script idempotent
- FR-804: Rollback script exists (drops labId, PatientLabLink, reverts role)

**FR-9xx — Cross-cutting UI — 5 FRs**
- FR-900: Top-bar shows user, role, lab name (truncated + suspended badge)
- FR-901: Role-based routing redirects
- FR-902: Logout clears JWT
- FR-903: Empty + error states on every list view
- FR-904: Loading states (skeleton/spinner ≤100ms)

### NonFunctional Requirements

25 NFRs across 7 domains, defined fully in [prd.md §7](prds/prd-iqline-reports-app-2026-05-25/prd.md).

**Security (S) — 7 NFRs**
- NFR-S1: HTTPS-only in non-dev environments
- NFR-S2: bcrypt cost ≥12; password fields excluded from API
- NFR-S3: JWT secret via env; refuse to start with default/missing
- NFR-S4: No PII in URL paths/query params
- NFR-S5: Rate limit login endpoints (5/5min per IP + per phone)
- NFR-S6: OWASP top 10 protections (input validation, no string concat in queries)
- NFR-S7: Tenant scoping CI test — build fails on any cross-tenant leak

**Privacy (P) — 4 NFRs**
- NFR-P1: Terms-of-service acknowledgment at first patient login (audited)
- NFR-P2: Match dialog discloses only name + DOB; every impression audited
- NFR-P3: Audit log answers "who looked at this patient" within 24 months
- NFR-P4: MongoDB WiredTiger encryption-at-rest with documented keyfile management

**Performance (Pe) — 4 NFRs**
- NFR-Pe1: Patient dashboard ≤2s on 4G for ≤100 reports
- NFR-Pe2: LabAdmin patient search p95 ≤500ms at 5k linked patients
- NFR-Pe3: Report create round-trip p95 ≤1s
- NFR-Pe4: Required compound indexes (per architecture index spec)

**Availability (A) — 2 NFRs**
- NFR-A1: 99.5% monthly uptime target
- NFR-A2: Daily backups retained 30 days; documented restore procedure

**Accessibility (Ac) — 2 NFRs**
- NFR-Ac1: Patient screens WCAG 2.1 AA (contrast, keyboard, alt text)
- NFR-Ac2: Chart palette colorblind-safe + shape encoding for monochrome

**Observability (O) — 3 NFRs**
- NFR-O1: Structured JSON logs with requestId, userId, labId, route, status, duration
- NFR-O2: Sentry error tracking for 5xx + unhandled exceptions
- NFR-O3: Business counter metrics (reports.created, patients.linked, labs.suspended, login.success/failure, lab.first-report.recorded, tenant-scope-assertion.failure)

**Data integrity (D) — 3 NFRs**
- NFR-D1: Phone number canonical normalization (digits + country code)
- NFR-D2: All FKs indexed; orphan-check CI test
- NFR-D3: Soft-deletes never cascade; patients never soft-deleted in v1

### Additional Requirements

Work items derived from the architecture (ADRs) that don't map to a specific FR but are required for implementation:

- **AR-1:** Install `migrate-mongo` and establish `backend/migrations/` directory (ADR-migration)
- **AR-2:** Install `@tanstack/react-query` and wire QueryClient provider into Next.js root layout (ADR-frontend-state)
- **AR-3:** Install Sentry SDK (`@sentry/node` for backend, `@sentry/nextjs` for frontend) with DSN-via-env config (ADR-observability)
- **AR-4:** Install/verify `@nestjs/throttler` and configure two policies (ADR-rate-limit)
- **AR-5:** Create all compound indexes via the first migration (architecture index spec)
- **AR-6:** Create CI E2E test `tenant-isolation.e2e-spec.ts` that proves no cross-tenant read succeeds (NFR-S7)
- **AR-7:** Create CI lint rule asserting `@Audit` decorator presence on a known list of audit-required endpoints (ADR-audit)
- **AR-8:** Create CI round-trip test for migrate-mongo up→down→up on a seeded fixture (ADR-migration)
- **AR-9:** Update deployment runbook with: WiredTiger keyfile provisioning + rotation, JWT v2 grace-window cutover sequence, migration cutover playbook, Sentry DSN setup, demo-OTP-in-prod warning interpretation
- **AR-10:** Create `TenantContext` request-scoped service with `assertLabIdOf()` helper (ADR-tenant-scoping)
- **AR-11:** Create `LabScopeInterceptor` registered globally in app.module (ADR-tenant-scoping)
- **AR-12:** Create `ActiveStatusGuard` registered globally after JwtAuthGuard (ADR-active-status)
- **AR-13:** Create `AuditInterceptor` + `@Audit` / `@AuditRead` decorators + async write queue (ADR-audit)
- **AR-14:** Create migrate-mongo migration that performs the full FR-800–803 retrofit (with explicit pre/post-count assertions and a tested rollback)

### UX Design Requirements

**N/A — no UX Design document was produced for this release.** User deliberately deferred `bmad-create-ux-design`. UI guidance is inherited from PRD FR text (e.g. FR-201 disclosure wording, FR-401 palette spec, FR-405 human-time bands, FR-900 top-bar layout) and the architecture's project structure (route groups, component file locations).

If story-level UI ambiguity becomes a blocker during implementation, surface it and schedule a focused UX pass before continuing.

### FR Coverage Map

| FR group | Epic(s) | Notes |
|---|---|---|
| FR-101–106 (Lab mgmt) | Epic 2 | |
| FR-110–115 (LabAdmin mgmt) | Epic 2 | |
| FR-120–122 (SuperAdmin metrics) | Epic 2 | |
| FR-200–205 (Patient ID & linking) | Epic 3 | |
| FR-300–305 (Glucose capture) | Epic 4 | FR-303 enforcement built in Epic 1, validated in Epic 4 |
| FR-400–405 (Patient dashboard) | Epic 5 | |
| FR-500, 502, 503, 505 (Auth core) | Epic 1 | JWT v2, ActiveStatusGuard, bootstrap SuperAdmin |
| FR-501, 504 (Patient OTP + banner) | Epic 5 | Surfaced when patient login UX is built |
| FR-600–603 (Tenant scoping) | Epic 1 | |
| FR-700–702 (Audit) | Epic 1 | |
| FR-800–804 (Migration) | Epic 1 | |
| FR-900–904 (Cross-cutting UI) | Epic 2 (initial) + Epic 6 (consistency pass) | Each epic adds its role's variant; Epic 6 audits consistency |

**Coverage check:** 56/56 FRs mapped. Every FR group has an epic owner.

## Epic List

### Epic 1: Multi-Tenant Foundation & Cutover

**User outcome:** The existing single-tenant system continues to operate without regression after cutover — the existing admin keeps logging in (now as a LabAdmin of "Default Lab"), existing patients still see their existing reports. The platform is now multi-tenant capable: every collection carries `labId`, every authenticated request runs through tenant scoping and active-status checks, every privileged action is audited. No new user-facing features yet — this epic ships the foundation that every other epic depends on.

**FRs covered:** FR-500, FR-502, FR-503, FR-505, FR-600, FR-601, FR-602, FR-603, FR-700, FR-701, FR-702, FR-800, FR-801, FR-802, FR-803, FR-804

**NFRs primarily addressed:** S1, S2, S3, S6, S7, P3, P4, O1, O2, O3, D1, D2, D3

**ARs covered:** AR-1 (migrate-mongo), AR-3 (Sentry init), AR-4 (throttler init), AR-5 (all compound indexes), AR-6 (tenant-isolation CI E2E), AR-7 (audit-decorator CI lint), AR-8 (migration round-trip CI test), AR-9 (initial runbook entries), AR-10 (TenantContext), AR-11 (LabScopeInterceptor), AR-12 (ActiveStatusGuard), AR-13 (AuditModule + decorators + async queue), AR-14 (the FR-800–803 migration itself)

### Epic 2: SuperAdmin Console — Lab & Admin Lifecycle

**User outcome:** SuperAdmin can onboard partnered labs end-to-end: register a lab, provision its admin with a temp password, see cross-lab platform metrics, suspend labs that misbehave. Delivers PRD UJ-1 and UJ-7.

**FRs covered:** FR-101, FR-102, FR-103, FR-104, FR-105, FR-106, FR-110, FR-111, FR-112, FR-113, FR-114, FR-115, FR-120, FR-121, FR-122

**Cross-cutting UI shell** (FR-900–904) lands here for the first user-facing route group; later epics inherit it.

**NFRs:** Pe2 (admin/lab list pagination), Ac1 (WCAG AA on SuperAdmin console)

### Epic 3: LabAdmin Patient Identification & First-Visit Linking

**User outcome:** A LabAdmin can find any patient who has visited their lab, link a patient on their first visit (with cross-lab match flow showing name + DOB confirmation), or register a brand-new patient. Delivers PRD UJ-2 (returning patient), UJ-3 (cross-lab match), UJ-4 (brand-new patient).

**FRs covered:** FR-200, FR-201, FR-202, FR-203, FR-204, FR-205, FR-304

**NFRs:** P2 (match dialog disclosure + impression audit), Pe2 (search p95)

**Note:** Stops at "patient selected, ready for report entry" — report capture is Epic 4.

### Epic 4: Glucose Report Capture, Correction & Soft-Delete

**User outcome:** A LabAdmin can record a glucose reading for any patient in their lab's list (with unit, meal context, status), correct a reading via Final→Corrected transition, and soft-delete an erroneous entry. Completes UJ-2's report-recording half.

**FRs covered:** FR-300, FR-301, FR-302, FR-303 (validated), FR-305

**NFRs:** Pe3 (submit p95)

**Note:** Adds a lab-specific Report tenant-scope E2E test on top of Epic 1's global infrastructure.

### Epic 5: Patient Aggregated Dashboard

**User outcome:** A patient logs in and sees a single trend chart spanning every reading from every lab they've visited, color-coded by lab (with shape encoding for colorblind/monochrome safety), with filter chips for "all/per-lab/meal context" and per-report cards showing provenance. New patients see a clear empty state. Terms-of-service acknowledgment captured at first login. Delivers UJ-5 and UJ-6.

**FRs covered:** FR-400, FR-401, FR-402, FR-403, FR-404, FR-405, FR-501, FR-504

**NFRs:** P1 (ToS ack), Pe1 (dashboard load ≤2s), Ac1, Ac2 (colorblind palette + shape)

**ARs:** AR-2 (TanStack Query setup lands here as the first heavily-cached read path)

### Epic 6: Production Readiness — Observability, Runbook, Cutover Rehearsal

**User outcome:** The operations team can support the production system: every business metric emits and is dashboarded, Sentry captures all 5xx and unhandled exceptions, the deployment runbook is complete (encryption keyfile, JWT v2 grace window, migration cutover, demo-OTP warning interpretation), and a staging cutover dry run has been executed successfully. This is the "we can actually ship this to production" gate.

**FRs covered:** Final consistency pass on FR-900–904 across all routes from Epics 2/3/5

**NFRs:** A1 (uptime target validation), A2 (backup/restore drill), O1/O2/O3 (full instrumentation audit), Ac1 (final WCAG AA pass on Patient screens)

**ARs:** AR-9 finalized

---

## Epic 1: Multi-Tenant Foundation & Cutover

Ship the schemas, migration, JWT v2, tenant scoping, audit infrastructure, and observability hooks needed for every later epic. Zero new user-visible features — the success criterion is "after cutover, the existing admin and existing patients continue to work, and the platform is multi-tenant capable."

### Story 1.1: Multi-tenant schemas + migrate-mongo foundation

As a developer,
I want the new `Lab` and `PatientLabLink` collections defined, `labId`/`status`/`deletedAt` fields added to existing collections, and `migrate-mongo` set up,
So that every later story can write data under proper tenant isolation.

**Acceptance Criteria:**

**Given** the backend codebase
**When** I run `npx migrate-mongo status`
**Then** the CLI is installed, `backend/migrations/` directory exists, and the migration state collection is initialized

**Given** the new schemas in code
**When** I inspect `backend/src/labs/schemas/lab.schema.ts` and `backend/src/patient-lab-links/schemas/patient-lab-link.schema.ts`
**Then** both Mongoose schemas exist with all fields per architecture (Lab: name, address, licenseNumber, primaryContact*, status, isMigrationDefault; PatientLabLink: patientId, labId, linkedByAdminId, linkedAt)
**And** the new `status.enum.ts` and the extended `user-role.enum.ts` (SuperAdmin | LabAdmin | Patient) are committed

**Given** existing User, Report, AuditLog schemas
**When** I inspect them after this story
**Then** User has `status: 'Active' | 'Disabled'`, Report has `labId: ObjectId` (required, indexed) + `deletedAt: Date | null` + `mealContext`/`unit` (defaults applied), AuditLog has `labId: ObjectId | null` (nullable for platform-level actions)

**Given** the first migration file
**When** it runs against a fresh database
**Then** all compound indexes from the architecture index spec are created (User.phone unique, Lab.{name, licenseNumber} unique, PatientLabLink.{patientId, labId} unique, Report.{labId, patientId, reportDate}, etc.)
**And** the AuditLog TTL index with `expireAfterSeconds: 63072000` (24 months) exists

**Given** the migration script is committed
**When** I run it twice in succession
**Then** the second run is a no-op (idempotence verified)

### Story 1.2: Default Lab seeding + existing data back-fill

As a developer,
I want the production migration to seed a "Default Lab," back-fill `labId` on existing Reports and AuditLog, create PatientLabLinks for existing patients, and promote the existing admin to a LabAdmin of the Default Lab,
So that the cutover produces zero data loss and the existing admin can keep logging in.

**Acceptance Criteria:**

**Given** a Mongo database with existing Users (1 admin + N patients) and Reports
**When** the migration's `up()` function runs
**Then** a Lab document exists with `name: "Default Lab"`, `licenseNumber: "MIGRATION-DEFAULT-0001"`, `status: "Active"`, `isMigrationDefault: true`
**And** the existing admin's role is updated to `LabAdmin` with `labId = Default Lab._id`, password preserved
**And** every existing Report has `labId = Default Lab._id`
**And** every existing Patient referenced by a Report has a PatientLabLink to Default Lab with `linkedAt = migration timestamp`

**Given** the migration's pre-flight assertions
**When** they run
**Then** they record current counts of Users/Reports
**And** post-flight assertions verify the same counts plus the new collections have the expected populations

**Given** the migration's `down()` function
**When** it runs after a successful `up()`
**Then** `labId` is unset from all back-filled Reports and AuditLog, PatientLabLink collection is dropped, the existing admin's role reverts to `Admin`, Default Lab is deleted

**Given** a CI test fixture
**When** I run up → down → up on the seeded fixture
**Then** the database state after the second `up()` matches the state after the first `up()` (round-trip idempotence)

### Story 1.3: JWT payload v2 + bootstrap SuperAdmin + grace window

As the system,
I want JWTs issued with payload v2 (including `labId` and `v: 2`), a bootstrap SuperAdmin seeded from env vars, and a 24-hour grace window accepting v1 tokens,
So that the auth model supports three roles and the cutover doesn't kick users out instantly.

**Acceptance Criteria:**

**Given** environment vars `SUPERADMIN_PHONE` and `SUPERADMIN_PASSWORD` set
**When** the backend starts
**Then** a SuperAdmin user is seeded with those credentials if it doesn't already exist
**And** the seed records the SuperAdmin in the audit log

**Given** `NODE_ENV=production` and `SUPERADMIN_PHONE` is missing
**When** the backend starts
**Then** the process refuses to start with a clear error message

**Given** `NODE_ENV=production` and `JWT_SECRET` is unset or matches a known default value
**When** the backend starts
**Then** the process refuses to start with a clear error message (NFR-S3)

**Given** a successful LabAdmin login
**When** I decode the issued JWT
**Then** it contains `{ v: 2, sub, phone, role: 'LabAdmin', labId: ObjectId, name, iat, exp }` with 1h expiry

**Given** a successful SuperAdmin login
**When** I decode the issued JWT
**Then** it contains `labId: null` and `role: 'SuperAdmin'`

**Given** a v1 JWT (no `v` field, no `labId`)
**When** the token's `iat` is within 24 hours of deploy time
**Then** the JwtAuthGuard accepts it (grace window)

**Given** a v1 JWT
**When** the token's `iat` is older than 24 hours from deploy time
**Then** the JwtAuthGuard returns 401 ("token format expired; please log in again")

### Story 1.4: ActiveStatusGuard + TenantContext request-scoped service

As the system,
I want every authenticated request to verify the user and (for LabAdmins) the lab are both `Active`, and the verified data populated into a request-scoped TenantContext,
So that suspended labs/users are revoked instantly regardless of JWT validity, and downstream services have a trustworthy tenant context.

**Acceptance Criteria:**

**Given** a globally registered `ActiveStatusGuard` ordered after JwtAuthGuard
**When** an authenticated request arrives
**Then** the guard reads the user by `_id` (projection: `_id, status, role, labId`)
**And** if `user.status !== 'Active'` → 401
**And** if `role === 'LabAdmin'`, reads the lab by `user.labId` (projection: `_id, status`); if `lab.status !== 'Active'` → 401

**Given** a successful pass through the guard
**When** any downstream service injects `TenantContext`
**Then** it gets a request-scoped instance with `labId`, `role`, `userId` populated from verified DB state (not from JWT alone)

**Given** the `TenantContext.assertLabIdOf(documents)` helper
**When** it's called with an array of Mongoose docs
**Then** if any doc's `labId !== this.labId`, it throws a `TenantScopeViolation` error
**And** emits a `tenant-scope-assertion.failure` metric
**And** the request returns 500

**Given** a suspended lab
**When** a LabAdmin of that lab makes an API call with a still-valid JWT
**Then** the response is 401 within 50ms (single DB lookup, no cache staleness)

### Story 1.5: LabScopeInterceptor + per-method assertion helper + SuperAdmin bypass

As the system,
I want a global `LabScopeInterceptor` that prepares lab-scoped query helpers and a SuperAdmin bypass with cross-tenant-read auditing,
So that LabAdmin queries cannot leak cross-tenant data and SuperAdmin platform-wide access is observable.

**Acceptance Criteria:**

**Given** the `LabScopeInterceptor` registered globally in `app.module.ts`
**When** a LabAdmin request arrives at any lab-scoped controller
**Then** the interceptor verifies `TenantContext.labId` is non-null
**And** the interceptor is registered to run AFTER ActiveStatusGuard

**Given** a lab-scoped service method that uses `tenantContext.assertLabIdOf(results)`
**When** the method returns any document whose `labId` doesn't match `tenantContext.labId`
**Then** the helper throws and emits the P0 metric

**Given** a SuperAdmin request
**When** it reaches a lab-scoped service method
**Then** the interceptor allows the request to bypass the lab filter
**And** an audit entry of action `cross-tenant.read` is written including the targeted `labId` and resource path

**Given** the dependency-injection wiring
**When** I review `app.module.ts`
**Then** the order is: `APP_GUARD: JwtAuthGuard` → `APP_GUARD: ActiveStatusGuard` → `APP_INTERCEPTOR: LabScopeInterceptor`

### Story 1.6: Audit infrastructure — decorators, interceptor, async queue, retention

As the system,
I want a decorator-driven audit pipeline that asynchronously writes every privileged action to the AuditLog,
So that every write and every sensitive read is recorded for SuperAdmin forensics with bounded latency impact.

**Acceptance Criteria:**

**Given** `@Audit('action.name')` and `@AuditRead('action.name')` decorators
**When** placed on a controller method
**Then** the `AuditInterceptor` reads the metadata and captures: actorId, actorRole, labId (from TenantContext), action, targetType + targetId (when supplied), details (before/after for updates), ipAddress, userAgent, createdAt

**Given** the async write queue
**When** an audited request returns
**Then** the response is sent first; the audit write happens off the critical path
**And** the audit write completes within 1 second for the 99th percentile under normal load

**Given** a bounded in-memory retry queue
**When** an audit write fails
**Then** it's retried up to 3 times with exponential backoff
**And** if all retries fail, the entry is logged to disk for manual reconciliation and a `audit.write.failure` metric is emitted

**Given** the AuditLog collection
**When** I inspect it after 24 months + 1 day
**Then** entries older than 24 months are auto-deleted by the TTL index

**Given** the `audit-presence.lint.ts` CI rule
**When** a developer adds a new controller method matching a known audit-required pattern (any non-GET, or known sensitive read endpoints)
**Then** the lint fails the build if neither `@Audit` nor `@AuditRead` is present

### Story 1.7: Rate limiting policies via @nestjs/throttler

As the system,
I want two named throttler policies — strict on auth endpoints, generous on authenticated endpoints,
So that login is protected from brute-force/credential stuffing while normal LabAdmin workflows are not throttled.

**Acceptance Criteria:**

**Given** `@nestjs/throttler` configured with two policies
**When** the same IP attempts more than 5 requests in 5 minutes to `/auth/*/login` or `/auth/*/verify-otp`
**Then** the 6th and subsequent requests within the window return 429

**Given** the same phone number attempted across different IPs
**When** more than 5 attempts occur in 5 minutes against an auth endpoint
**Then** the 6th attempt returns 429 (per-phone rate limit)

**Given** an authenticated LabAdmin
**When** they make more than 100 requests in 1 minute
**Then** the 101st returns 429

**Given** a 429 response
**When** I inspect the headers
**Then** `Retry-After` is set to the seconds remaining in the window

### Story 1.8: Sentry + structured logging fields + base metrics scaffolding

As an operator,
I want Sentry capturing all 5xx errors, structured JSON logs with full request context, and a `MetricsService` ready to receive business counters,
So that incident response works from day 1 on the multi-tenant stack.

**Acceptance Criteria:**

**Given** `@sentry/node` (backend) and `@sentry/nextjs` (frontend) installed
**When** the backend or frontend starts in a non-test environment with `SENTRY_DSN` set
**Then** Sentry is initialized and captures unhandled exceptions and 5xx responses
**And** Sentry is no-op when `SENTRY_DSN` is unset (development friendly)

**Given** the global logging middleware
**When** any request completes
**Then** a JSON log line is written containing `requestId`, `userId` (or null), `labId` (or null), `route`, `method`, `status`, `duration`

**Given** the `MetricsService` skeleton
**When** later stories instrument business counters
**Then** they can emit via `metrics.increment('reports.created', { labId })` and the service writes a structured JSON line to stdout that a downstream collector (Vector/Fluent Bit) can ship

**Given** the auth flow emits `login.success` and `login.failure` from this story
**When** a login completes
**Then** the corresponding counter line appears in stdout

### Story 1.9: CI tests — tenant isolation E2E, audit decorator lint, migration round-trip

As the platform owner,
I want CI to fail the build on any cross-tenant leak, missing audit decorator, or non-idempotent migration,
So that the load-bearing invariants from PRD §8.5 cannot regress unnoticed.

**Acceptance Criteria:**

**Given** the `tenant-isolation.e2e-spec.ts` test
**When** it runs in CI
**Then** it seeds Lab A and Lab B with patients and reports
**And** logs in as LabAdmin of Lab A
**And** attempts every list/get endpoint (Reports, Patients, PatientLabLinks) against Lab B's resources
**And** asserts every attempt returns 403 or 404 (never 200 with Lab B data)
**And** asserts that any leak triggers `tenant-scope-assertion.failure` metric (verified via stdout)

**Given** the `audit-presence.lint.ts` rule
**When** I add a new non-GET controller method without `@Audit`
**Then** CI fails with a clear error pointing to the file/line

**Given** the `migration-roundtrip.test.ts` test
**When** it runs in CI
**Then** it seeds a fixture database
**And** runs the multi-tenant migration up
**And** runs it down
**And** runs it up again
**And** asserts the state after the second up matches the state after the first up
**And** asserts no orphaned references exist in User or Report after the down

**Given** the `orphan-check.test.ts` test (NFR-D2)
**When** it runs in CI against a seeded fixture
**Then** it asserts every Report's `patientId` references an existing User
**And** every Report's `labId` references an existing Lab
**And** every PatientLabLink's `patientId` and `labId` both reference existing documents
**And** the build fails if any orphan exists

---

## Epic 2: SuperAdmin Console — Lab & Admin Lifecycle

Deliver the platform-operator workflow: register labs, provision their admins, see cross-lab metrics, suspend bad actors. Also establishes the global UI shell (top-bar, auth context, role-based redirects) that Epics 3 and 5 inherit.

### Story 2.1: SuperAdmin route group + global UI shell + role-based routing

As a SuperAdmin,
I want a `/super` route group that requires my role, a top-bar showing my identity, and an auth-context provider that handles login redirects,
So that I have a working console shell to build features on.

**Acceptance Criteria:**

**Given** a fresh visit to `/super` while unauthenticated
**When** the page loads
**Then** I'm redirected to `/login`

**Given** a fresh visit to `/super` while authenticated as a Patient or LabAdmin
**When** the page loads
**Then** I'm redirected to my role's home (`/dashboard` for Patient, `/panel` for LabAdmin)

**Given** I'm logged in as SuperAdmin
**When** any `/super/*` page renders
**Then** the top-bar shows my name and the label "Platform Admin"
**And** a logout button is visible

**Given** I click logout
**When** the action completes
**Then** my JWT is cleared from localStorage and I'm redirected to `/login`

**Given** the AuthContext + TanStack QueryClient providers are wired in the SuperAdmin layout
**When** child pages call `useAuth()` or `useQuery()`
**Then** both work without additional setup

### Story 2.2: Register lab + list labs

As a SuperAdmin,
I want to register a new lab with name/address/license/contact and see all labs in a searchable paginated list,
So that I can onboard partnered labs (UJ-1 first half).

**Acceptance Criteria:**

**Given** a "Register Lab" button on `/super/labs`
**When** I fill the form (name, address, licenseNumber, primaryContactName, primaryContactPhone, primaryContactEmail) and submit
**Then** `POST /labs` is called with the DTO
**And** if validation passes, a new Lab is created with `status: 'Active'`
**And** an audit entry `lab.created` is written

**Given** I submit a lab name or licenseNumber already in use
**When** the validation fires
**Then** I see a clear inline error ("a lab with that name/license number already exists")
**And** no new Lab is created

**Given** the `/super/labs` page loads
**When** the request completes
**Then** I see a table of all labs with columns: name, license #, status (Active/Suspended badge), patient count, report count, created date
**And** cursor-pagination controls are present (`?cursor=...&limit=50`)

**Given** a search input above the table
**When** I type at least 2 characters
**Then** the list filters by name OR license number (debounced 300ms)

### Story 2.3: View lab detail + suspend / re-activate lab

As a SuperAdmin,
I want a lab detail page showing the lab's profile and a suspend/reactivate toggle,
So that I can investigate a specific lab and disable bad actors (UJ-7).

**Acceptance Criteria:**

**Given** I click into a lab row on `/super/labs`
**When** the detail page loads
**Then** I see the lab's profile fields (name, address, license, contact), its admins list (placeholder for Story 2.4), its linked patient count, its report counts for the last 7/30 days, and a sparkline of reports/week for the last 4 weeks

**Given** the lab is `Active`
**When** I click "Suspend" and confirm the modal
**Then** `PATCH /labs/:id/status` is called with `status: 'Suspended'`
**And** the lab's status updates to `Suspended` and the badge changes accordingly
**And** an audit entry `lab.suspended` is written
**And** a `labs.suspended` metric is emitted

**Given** a lab is `Suspended`
**When** a LabAdmin of that lab attempts an API call with a still-valid JWT
**Then** they receive 401 (per Story 1.4's ActiveStatusGuard)

**Given** the same suspended lab
**When** I click "Re-activate" on the detail page
**Then** the lab's status returns to `Active` and the affected LabAdmins can log in again

**Given** I edit the lab's profile fields
**When** I save
**Then** changes persist
**And** if the name changed, the audit log entry includes both old and new values

### Story 2.4: Create LabAdmin + force password change on first login

As a SuperAdmin,
I want to create a LabAdmin under a specific lab with a temporary password,
So that I can hand over credentials and the admin can set their own password on first login (UJ-1 second half).

**Acceptance Criteria:**

**Given** the lab detail page
**When** I click "Add Lab Admin" and submit a form with name, phone, temporaryPassword (≥10 chars, ≥1 letter + 1 digit)
**Then** a new User is created with role `LabAdmin`, labId set to this lab, status `Active`, password hashed (bcrypt cost ≥12)
**And** a `forcePasswordChange: true` flag is set on the user
**And** an audit entry `lab-admin.created` is written

**Given** the new LabAdmin attempts to log in with their temp password
**When** auth succeeds
**Then** they're redirected to a "Set your password" screen before any other route
**And** they cannot bypass this screen (any `/panel/*` request is redirected back to it)

**Given** the password-change screen
**When** I submit a new password that meets the strength requirement and differs from the temp
**Then** the password is updated, `forcePasswordChange` is cleared, and I'm redirected to `/panel`

**Given** the phone number entered for the new admin already exists as a user (any role)
**When** I submit
**Then** I see an inline error and no user is created

### Story 2.5: List, disable, reset password for LabAdmins

As a SuperAdmin,
I want to see all admins of a lab and disable or reset-password any of them,
So that I can deactivate bad actors and recover from forgotten credentials.

**Acceptance Criteria:**

**Given** the lab detail page admins list
**When** it loads
**Then** I see each LabAdmin's name, phone, status (Active/Disabled), and last login timestamp

**Given** an Active LabAdmin
**When** I click "Disable" and confirm
**Then** `PATCH /lab-admins/:id/status` sets `status: 'Disabled'`
**And** the next API request from any active session of that LabAdmin returns 401
**And** an audit entry `lab-admin.disabled` is written

**Given** a Disabled LabAdmin
**When** I click "Re-enable"
**Then** their status returns to Active and they can log in again

**Given** any LabAdmin
**When** I click "Reset Password" and submit a new temp password
**Then** their password is updated, `forcePasswordChange: true` is set, and an audit entry `lab-admin.password-reset` is written

### Story 2.6: Platform metrics tiles on SuperAdmin landing page

As a SuperAdmin,
I want a landing-page dashboard with key platform counts,
So that I can eyeball platform health at a glance.

**Acceptance Criteria:**

**Given** `/super` loads
**When** the page renders
**Then** I see four tiles: "Active Labs" (count), "Active Patients" (count, distinct patients linked to any active lab), "Reports — Last 7 days" (count), "Reports — Last 30 days" (count)

**Given** any tile
**When** I click it
**Then** I navigate to the relevant detail view (Labs list, etc.)

**Given** the underlying aggregation queries
**When** they run
**Then** they complete in under 1 second p95 even with 100 labs / 50k reports

### Story 2.7: Audit log search

As a SuperAdmin,
I want to search the audit log by actor, lab, action, and date range,
So that I can investigate incidents.

**Acceptance Criteria:**

**Given** `/super/audit`
**When** the page loads
**Then** I see search filters: Actor (autocomplete by name/phone), Lab (autocomplete), Action (dropdown of known actions), Date range (from/to)

**Given** I apply filters and submit
**When** the request completes
**Then** I see a paginated table of matching audit entries with columns: timestamp, actor name+role, lab name, action, target type+id, summary of details

**Given** any audit row
**When** I click it
**Then** a detail drawer shows the full audit entry including the JSON `details` field

**Given** cursor pagination is used
**When** I scroll past the visible rows
**Then** the next page loads automatically (infinite scroll)

### Story 2.8: Empty / error / loading states across SuperAdmin views

As a SuperAdmin,
I want every list page to have proper empty, error, and loading states,
So that I'm never staring at a blank screen.

**Acceptance Criteria:**

**Given** any list page (Labs, LabAdmins per lab, Audit search)
**When** the data is loading
**Then** I see a skeleton or spinner within 100ms

**Given** the request fails
**When** the error renders
**Then** I see a clear message and a Retry button that re-fires the query

**Given** the result is empty (e.g. no labs registered yet)
**When** the page renders
**Then** I see a friendly empty state with a clear next action (e.g. "Register your first lab")

---

## Epic 3: LabAdmin Patient Identification & First-Visit Linking

Build the "front desk" workflow: a LabAdmin can find returning patients, link new-to-them patients (with cross-lab match confirmation), or register brand-new patients — but does NOT yet record reports (that's Epic 4).

### Story 3.1: LabAdmin route group + LabAdmin top-bar variant (lab name + suspended badge)

As a LabAdmin,
I want a `/panel` route group that requires my role, with a top-bar showing my lab name (and a "Suspended" badge if applicable),
So that I have a working LabAdmin shell to operate from.

**Acceptance Criteria:**

**Given** I navigate to `/panel` while unauthenticated or in another role
**When** the page loads
**Then** I'm redirected appropriately per Story 2.1's role-routing rules

**Given** I'm logged in as a LabAdmin
**When** any `/panel/*` page loads
**Then** the top-bar shows my name, the label "Lab Admin", and my lab's name
**And** if the lab name is longer than 24 characters, it's truncated with ellipsis and the full name appears on hover

**Given** my lab is `Suspended`
**When** the top-bar renders
**Then** a "Suspended" badge appears adjacent to the lab name
**And** clicking the badge surfaces a "Contact platform admin" message

**Given** any `/panel/*` page
**When** I click logout
**Then** my JWT is cleared and I'm redirected to `/login`

### Story 3.2: Patient search by phone (this-lab list path)

As a LabAdmin,
I want to type a patient's phone in the search box and immediately see them if they've visited my lab,
So that the common case (returning patient) is fast (UJ-2 first half).

**Acceptance Criteria:**

**Given** the `/panel` page with a search input
**When** I type a full phone number that matches a patient already linked to my lab
**Then** the patient appears in the result list with their name and DOB
**And** the search completes in p95 ≤500ms at 5k linked patients (NFR-Pe2)

**Given** a patient-list view request
**When** the backend handles it
**Then** the query uses the `PatientLabLink.{labId, patientId}` compound index
**And** an `@AuditRead('patient-list.read')` entry records the searched phone and the actor

**Given** I type a partial phone (less than 10 digits)
**When** the input debounces 300ms
**Then** no search fires (or a clear "enter full phone number" hint appears)

### Story 3.3: Cross-lab match dialog (name + DOB disclosure + impression audit)

As a LabAdmin,
I want to see a confirmation dialog when the phone I typed matches a patient from another lab,
So that I can confirm identity before linking (UJ-3).

**Acceptance Criteria:**

**Given** I type a phone matching a global patient NOT linked to my lab
**When** the search returns
**Then** a confirmation dialog appears showing: "Patient found: {name}, DOB {date}. Link to your lab?"
**And** no other PII (address, other labs, prior reports) is displayed

**Given** the dialog is rendered
**When** any state (dialog shown / link confirmed / cancelled) is reached
**Then** an audit entry `patient-match.dialog` is written including: searched phone, matched patientId, outcome (`shown` / `linked` / `cancelled`)

**Given** I click "Cancel"
**When** the dialog closes
**Then** no PatientLabLink is created
**And** the search input is cleared

### Story 3.4: Link patient to lab (idempotent upsert)

As a LabAdmin,
I want clicking "Link to your lab" in the match dialog to atomically create the PatientLabLink and add the patient to my lab's list,
So that the patient is immediately available for report entry.

**Acceptance Criteria:**

**Given** I click "Link to your lab" in the match dialog
**When** `POST /patient-lab-links` is called with `{ patientId, labId: my lab }`
**Then** a PatientLabLink is created via `findOneAndUpdate({patientId, labId}, $setOnInsert: {linkedByAdminId, linkedAt}, upsert: true)`
**And** the operation is idempotent — a second call returns the existing link without duplicating

**Given** the link is created
**When** I'm returned to the patient list
**Then** the patient now appears in my lab's list
**And** an audit entry `patient.linked` is written including patientId, labId, linkedByAdminId

**Given** the link is created
**When** the metrics emit
**Then** a `patients.linked` counter increments with the labId tag

### Story 3.5: Add new patient modal (atomic create + link)

As a LabAdmin,
I want to register a brand-new patient when the phone doesn't exist anywhere,
So that walk-ins who've never used the platform can have a record (UJ-4).

**Acceptance Criteria:**

**Given** I type a phone with no global match
**When** the search completes
**Then** a "+ Add new patient" action appears in the empty result area

**Given** I click "+ Add new patient"
**When** the modal opens
**Then** it shows fields: name (required), dateOfBirth (required, date picker)

**Given** I submit the form with valid values
**When** the backend handles `POST /patients`
**Then** a new User is created with role `Patient`, status `Active`, phone canonicalized
**And** a PatientLabLink is created to my lab in the same transaction (atomic — both or neither)
**And** audit entries `patient.created` and `patient.linked` are written

**Given** the modal opens with the phone pre-filled from the search input
**When** I submit without modifying phone
**Then** the phone field is read-only — name + DOB are the only editable values

### Story 3.6: Duplicate-phone race safety

As the system,
I want patient creation to be safe against concurrent requests on the same phone,
So that we never silently create duplicate patients (FR-203).

**Acceptance Criteria:**

**Given** two LabAdmins simultaneously try to register the same phone
**When** both submit roughly at the same time
**Then** the first wins (User created)
**And** the second receives a 409 Conflict with the existing patient's match-dialog payload
**And** the second LabAdmin's UI gracefully renders the match dialog (Story 3.3 flow) instead of an error toast

**Given** the unique index on `User.phone`
**When** any duplicate insert is attempted
**Then** the Mongoose error is caught in the service layer and converted to the 409 response above

### Story 3.7: Patient detail drawer (this-lab reports view stub)

As a LabAdmin,
I want clicking a patient in my list to open a drawer showing their info + a placeholder for their reports,
So that I can confirm I have the right patient before recording (full reports list lands in Epic 4).

**Acceptance Criteria:**

**Given** the patient list
**When** I click a patient row
**Then** a side drawer opens showing the patient's name, phone, DOB, "Visiting since" date (from PatientLabLink.linkedAt)
**And** the drawer has a "New Report" CTA (handler stubbed in this story; functional in Epic 4)
**And** the drawer's report list area renders an empty state with text "Report list coming soon"

**Given** the GET that loads the drawer's report list (when wired in Epic 4)
**When** the request fires
**Then** it includes `?labId=<my lab>` (auto-injected by TenantContext)
**And** the backend returns only reports created by this lab (FR-304 — strict isolation)

---

## Epic 4: Glucose Report Capture, Correction & Soft-Delete

Build the report-entry workflow on top of Epic 3's patient lookup. Adds the extended Report fields (unit, mealContext), Final/Corrected transition logic, and soft-delete.

### Story 4.1: Extend Report schema with `mealContext` and `unit` fields

As a developer,
I want the Report schema extended with `mealContext` and `unit` enums via a migrate-mongo migration,
So that the new report form has somewhere to write its data.

**Acceptance Criteria:**

**Given** a new migrate-mongo migration
**When** it runs
**Then** the Report schema has `mealContext: 'Fasting' | 'PostMeal' | 'Random'` (required, default `Random`) and `unit: 'mg/dL' | 'mmol/L'` (required, default `mg/dL`)
**And** existing reports get `mealContext: 'Random'` and `unit: 'mg/dL'` back-filled

**Given** the migration's down()
**When** it runs
**Then** both new fields are unset and existing reports' original shape is restored

**Given** the enums in `backend/src/common/enums/`
**When** I inspect them
**Then** `meal-context.enum.ts` and `glucose-unit.enum.ts` exist and are referenced by the DTOs

### Story 4.2: Create-report endpoint + LabAdmin form UI

As a LabAdmin,
I want a "New Report" form that captures patient, date, value, unit, mealContext, status, notes, and submits to create a report,
So that I can record a glucose reading (UJ-2 second half).

**Acceptance Criteria:**

**Given** I'm in the patient detail drawer and click "New Report"
**When** the form opens
**Then** I see fields: reportDate (defaults to today), glucoseValue (positive number), unit (radio: mg/dL | mmol/L, default mg/dL), mealContext (radio: Fasting | PostMeal | Random), status (radio: Final | Corrected, default Final), notes (optional text ≤500 chars)
**And** the patient is pre-selected and read-only

**Given** I submit the form
**When** `POST /reports` is called
**Then** the report is created with labId = my lab (from TenantContext, never from the request body), createdBy + updatedBy = my userId, createdAt set
**And** the response is 201 with the new Report shape
**And** the round-trip completes in p95 ≤1s (NFR-Pe3)

**Given** the report is created
**When** the audit + metrics emit
**Then** an `@Audit('report.created')` entry is written
**And** a `reports.created` counter increments tagged with labId
**And** if this is the lab's very first report, a `lab.first-report.recorded` counter also fires

**Given** I submit with an invalid value (e.g. glucoseValue ≤ 0)
**When** the request hits the DTO validator
**Then** I see an inline error and no report is created

### Story 4.3: Final / Corrected transition (single-op edit with audit before/after)

As a LabAdmin,
I want to correct a Final report by transitioning it to Corrected in a single save that also updates the value,
So that mistakes can be fixed with full audit trail (FR-302).

**Acceptance Criteria:**

**Given** a report with `status: 'Final'`
**When** I click "Edit" and modify the value and submit (status auto-set to `Corrected`)
**Then** `PATCH /reports/:id` accepts the combined transition + edit in one request
**And** the report's status updates to `Corrected` and the value is updated
**And** an `@Audit('report.corrected')` entry records before/after snapshots of every changed field

**Given** a report with `status: 'Final'` and I send a PATCH that ONLY changes a value (without status transition)
**When** the backend handles it
**Then** the request is rejected 409 ("Final reports cannot be edited; transition to Corrected first")

**Given** a report with `status: 'Corrected'`
**When** I edit any editable field
**Then** the edit succeeds and an audit entry records the before/after

**Given** I attempt to edit `labId`, `patientId`, `createdBy`, or `createdAt`
**When** the request hits the service
**Then** those fields are silently stripped from the update payload (never modifiable)

### Story 4.4: Soft-delete a report

As a LabAdmin,
I want to soft-delete a report I created in error,
So that wrong data doesn't appear in the patient's dashboard but the audit trail is preserved (FR-305).

**Acceptance Criteria:**

**Given** the report drawer view (only my lab's reports — Epic 3 Story 3.7 wired)
**When** I click "Delete" on a report I created and confirm
**Then** `DELETE /reports/:id` sets `deletedAt = now` (not a hard delete)
**And** an `@Audit('report.deleted')` entry records actor + reason (optional textarea)
**And** the report no longer appears in the lab's view or any patient's view

**Given** a soft-deleted report
**When** any list query uses the `.alive()` query helper
**Then** the soft-deleted report is filtered out

**Given** a SuperAdmin's audit drilldown
**When** they request a report by id via the `withDeleted()` opt-in path
**Then** the soft-deleted report is returned (for forensic visibility)

**Given** I attempt to soft-delete a report created by a different LabAdmin of my lab
**When** the request hits the service
**Then** it succeeds (lab-level ownership, not user-level — any admin of the same lab can soft-delete the lab's reports)

**Given** I attempt to soft-delete a report from a different lab
**When** the interceptor + assertion run
**Then** the request returns 404 (cross-lab data is invisible, so it doesn't exist from my perspective)

### Story 4.5: Report tenant-scope E2E test

As the platform owner,
I want a Report-specific E2E test that proves a LabAdmin cannot read, edit, or soft-delete reports from another lab,
So that the tenant isolation invariant is regression-proofed for the most sensitive collection.

**Acceptance Criteria:**

**Given** the existing `tenant-isolation.e2e-spec.ts` from Story 1.9
**When** I extend it with Report-specific scenarios
**Then** the test seeds Lab A with 5 reports and Lab B with 5 reports
**And** asserts that LabAdmin A's `GET /reports` returns only Lab A's reports
**And** asserts that LabAdmin A's `GET /reports/:id` for a Lab B reportId returns 404
**And** asserts that LabAdmin A's `PATCH /reports/:id` against a Lab B reportId returns 404
**And** asserts that LabAdmin A's `DELETE /reports/:id` against a Lab B reportId returns 404
**And** asserts no `tenant-scope-assertion.failure` metric fires on these legitimate-but-cross-tenant requests (404 should happen at the interceptor, not the assertion)

---

## Epic 5: Patient Aggregated Dashboard

Rebuild the patient `/dashboard` against the multi-tenant backend: aggregated trend across all labs, color + shape encoding, filter chips, per-report cards. Also lands TanStack Query (first heavily-cached read path) and the patient ToS acknowledgment.

### Story 5.1: Patient route group + TanStack Query provider + Patient top-bar variant

As a patient,
I want a `/dashboard` route that requires my role, with TanStack Query caching the data and a top-bar showing my name,
So that the patient app has its shell ready.

**Acceptance Criteria:**

**Given** I visit `/dashboard` while unauthenticated
**When** the page loads
**Then** I'm redirected to `/login`

**Given** I'm logged in as Patient
**When** any `/dashboard/*` page loads
**Then** the top-bar shows my name and "Patient portal"
**And** logout button is visible

**Given** `@tanstack/react-query` installed and `QueryClient` configured in the dashboard layout
**When** child components call `useQuery(['patient', 'reports'], fetchReports)`
**Then** the query is cached with a 30-second stale time (chosen to balance freshness vs refetch frequency)
**And** the query refetches on window focus

**Given** I install TanStack Query DevTools in non-production
**When** I open the page in development
**Then** the devtools panel is available for inspection

### Story 5.2: Aggregated reports query (cross-lab `$lookup`)

As the system,
I want a single backend query that returns the patient's reports across ALL labs with lab metadata joined,
So that the dashboard renders from one round-trip and lab provenance is visible.

**Acceptance Criteria:**

**Given** `GET /patients/me/reports`
**When** the backend handles it
**Then** the query uses `req.user.sub` as the patientId filter (FR-603: patient scope by sub, never labId)
**And** the query joins each report to its Lab document (`$lookup` on labId)
**And** the response shape is `[{ _id, reportDate, glucoseValue, unit, mealContext, status, notes, lab: { _id, name, licenseNumber, status } }, ...]`
**And** soft-deleted reports are excluded (`.alive()`)

**Given** the lab embedded in each report
**When** the lab is currently `Suspended`
**Then** the lab.status field reflects this (UI uses it to render "(Suspended)" label per FR-400)

**Given** a patient with 100 reports
**When** the query runs
**Then** the response completes in p95 ≤2s on a typical 4G connection (NFR-Pe1)

**Given** the query
**When** an `@AuditRead('patient.reports.read')` decorator is applied
**Then** an audit entry is written each time a patient views their reports

### Story 5.3: Trend chart with mg/dL normalization + Tol Bright palette + shape encoding

As a patient,
I want a single trend chart showing every reading from every lab,
So that I can see my glucose history at a glance with clear provenance per point (FR-401, NFR-Ac2).

**Acceptance Criteria:**

**Given** the dashboard with at least one report
**When** the chart renders
**Then** every report is plotted as a point on a time axis (reportDate)
**And** the y-axis is in mg/dL (mmol/L values converted via × 18.0182)
**And** each point's color is `paulTolBright[hash(labId) % 8]`
**And** each point's shape is `['circle','triangle','square','diamond'][hash(labId) % 4]`
**And** the legend below the chart shows lab name → color+shape mapping

**Given** I hover a point
**When** the tooltip renders
**Then** it shows: glucose value (mg/dL) + original unit if converted (e.g. "142 mg/dL — original 7.9 mmol/L"), lab name, mealContext, status

**Given** the chart palette
**When** rendered in a colorblind simulator (deuteranopia, protanopia)
**Then** adjacent points remain distinguishable

**Given** the chart printed in monochrome
**When** I scan
**Then** different labs are still distinguishable via shape alone

### Story 5.4: Filter chips — All / per-lab / mealContext

As a patient,
I want filter chips above the chart to slice by lab and meal context,
So that I can compare apples-to-apples (e.g. all fasting readings across labs) (FR-402).

**Acceptance Criteria:**

**Given** the dashboard
**When** the chips render
**Then** I see two chip rows: Lab filter (chips: "All labs" + one chip per lab the patient has visited) and Meal context filter (chips: All / Fasting / PostMeal / Random)
**And** "All labs" and "All" are selected by default

**Given** I click a single-lab chip
**When** the chart and per-report cards update
**Then** only that lab's points/cards are visible
**And** sibling chips dim to indicate they're inactive

**Given** I click a mealContext chip
**When** the chart updates
**Then** only points matching that meal context are visible

**Given** both filters are active simultaneously
**When** the chart re-renders
**Then** the intersection of the two filters is shown

### Story 5.5: Per-report cards

As a patient,
I want a chronological scrollable list of cards below the chart, each showing report details,
So that I can read individual results with full context (FR-403).

**Acceptance Criteria:**

**Given** the dashboard with reports
**When** the cards render below the chart
**Then** each card shows: lab name, reportDate, glucoseValue with original unit (not normalized — show what the lab recorded), mealContext badge, status badge (Final / Corrected), notes (truncated to 1 line)
**And** cards are ordered newest-first

**Given** a card with notes longer than the truncated preview
**When** I click "more"
**Then** the full notes expand inline

**Given** I have more than 50 reports
**When** I scroll near the bottom of the list
**Then** the next page loads via cursor pagination (infinite scroll)

**Given** the filter chips (Story 5.4) are applied
**When** the cards re-render
**Then** the visible cards match the filtered set

### Story 5.6: Empty state + most-recent highlight with human-time bands

As a patient,
I want a friendly empty state when I have no reports and a prominent display of my most recent reading at the top,
So that the page is meaningful at every state (FR-404, FR-405).

**Acceptance Criteria:**

**Given** I have zero reports
**When** the dashboard loads
**Then** I see: "You have no reports yet. Visit one of our partnered labs to add your first reading."
**And** no chart, no cards, no filters are rendered
**And** the partner-lab list is NOT shown (FR-404)

**Given** I have at least one report
**When** the dashboard loads
**Then** above the chart I see a highlight card showing: the value (large), unit, lab name, reportDate, time-since-test in human terms
**And** time-since-test uses the bands from FR-405 (just now / N minutes ago / N hours ago / yesterday / N days ago / N weeks ago / N months ago / N years ago)

### Story 5.7: Demo-OTP banner gated to non-production

As a patient (in non-production environments),
I want a clearly visible banner on the login screen telling me the demo OTP is `123456`,
So that I can log in during demos/development without confusion (FR-504).

**Acceptance Criteria:**

**Given** `NODE_ENV !== 'production'`
**When** the patient login screen renders
**Then** a banner appears at the top saying "Demo mode — OTP is `123456`"

**Given** `NODE_ENV === 'production'`
**When** the login screen renders
**Then** the banner is NOT shown

**Given** the backend starts in production with static OTP still active
**When** the application initializes
**Then** a CRITICAL-level log line is emitted at startup: "WARNING: production deployment is using static patient OTP. This should be replaced with real SMS OTP before public launch."
**And** the application starts normally (does NOT refuse to start — per PRD FR-504 [NOTE FOR PM])

### Story 5.8: Terms-of-service acknowledgment at first patient login

As a patient,
I want to see and acknowledge the platform terms-of-service on my very first login,
So that I understand how my test data is stored and shared (NFR-P1).

**Acceptance Criteria:**

**Given** a patient logs in for the first time (no `termsAcknowledgedAt` field on their User doc)
**When** they reach the dashboard
**Then** a one-screen modal renders with the ToS text + a single "Acknowledge" button
**And** they cannot dismiss or bypass the modal until they acknowledge
**And** on acknowledge, `termsAcknowledgedAt` is set on the User doc

**Given** a patient with `termsAcknowledgedAt` already set
**When** they log in
**Then** the modal is NOT shown again

**Given** acknowledgment is recorded
**When** the audit log emits
**Then** an `@Audit('patient.terms-acknowledged')` entry is written with timestamp

---

## Epic 6: Production Readiness — Observability, Runbook, Cutover Rehearsal

Tie a bow on the release: validate observability end-to-end, complete the deployment runbook, run a staging cutover dry run, and audit cross-route UI consistency. This is the "we can ship" gate.

### Story 6.1: Cross-route UI consistency audit (FR-900-904 final pass)

As an operator,
I want a consistency audit across all three consoles (SuperAdmin, LabAdmin, Patient) so the top-bar, role-routing, logout, empty/error/loading states all behave identically,
So that the user experience is coherent across roles (FR-900-904).

**Acceptance Criteria:**

**Given** all three route groups (`/super`, `/panel`, `/dashboard`)
**When** I navigate through them
**Then** each has the same top-bar height, the same logout button position, and the same role-label format

**Given** every list page across every console
**When** the data is loading
**Then** a skeleton/spinner appears within 100ms (no blank screens)

**Given** every list page across every console
**When** the API call fails
**Then** I see a clear error message + Retry button (consistent component)

**Given** every list page across every console
**When** the result is empty
**Then** I see a friendly empty state (consistent component, contextual copy)

**Given** I attempt to access a route outside my role
**When** the redirect fires
**Then** I land on my role's home (same behavior across all three roles)

### Story 6.2: WCAG 2.1 AA audit of Patient screens

As a patient,
I want all Patient-facing screens to meet WCAG 2.1 AA,
So that the app is usable for everyone (NFR-Ac1).

**Acceptance Criteria:**

**Given** the login, dashboard, empty state, ToS modal, and report card screens
**When** I run an automated accessibility scanner (axe-core or Lighthouse)
**Then** there are zero contrast violations (≥4.5:1 for normal text, ≥3:1 for large text)
**And** every interactive element is reachable via keyboard
**And** every image / chart point has an alt or aria-label

**Given** the chart
**When** screen-reader navigation reaches it
**Then** an accessible summary is provided ("Glucose trend over 90 days, N readings from M labs, latest value X mg/dL on DATE")

**Given** the filter chips
**When** navigated by keyboard
**Then** each chip is tab-stoppable and toggles via Enter or Space

### Story 6.3: Backup and restore drill

As an operator,
I want a documented and tested backup + restore procedure,
So that NFR-A2 is real, not paper-only.

**Acceptance Criteria:**

**Given** the deployment runbook's backup procedure
**When** I follow it
**Then** a daily MongoDB snapshot is taken (mongodump) and retained 30 days

**Given** a snapshot in cold storage
**When** I follow the documented restore procedure on a fresh staging instance
**Then** the database is fully restored within 30 minutes
**And** the application starts cleanly against the restored data

**Given** the drill
**When** it completes
**Then** the runbook is updated with any clarifications discovered during the drill

### Story 6.4: Business metrics instrumentation audit + dashboard setup

As an operator,
I want every business counter from NFR-O3 verified emitting + dashboarded,
So that I can answer "how is the platform doing?" at any time.

**Acceptance Criteria:**

**Given** the metrics collector pulling from stdout
**When** I trigger each business event in staging
**Then** the corresponding counter is observed:
- login.success / login.failure (every login attempt)
- reports.created (every successful report)
- patients.linked (every PatientLabLink creation)
- labs.suspended (every suspend action)
- lab.first-report.recorded (only on a lab's first-ever report)
- tenant-scope-assertion.failure (during E2E test fault injection)

**Given** the metrics backend (Grafana / Prometheus / equivalent)
**When** I open the platform dashboard
**Then** I see panels for each counter with appropriate time-series visualization
**And** an alert is configured: any non-zero `tenant-scope-assertion.failure` rate pages on-call (P0)

### Story 6.5: Sentry configuration validation + on-call alerting

As an operator,
I want Sentry validated capturing 5xx and unhandled errors with proper alert routing,
So that incident response is automated (NFR-O2).

**Acceptance Criteria:**

**Given** Sentry's DSN configured in staging
**When** I trigger a 500 in staging (e.g. via test endpoint)
**Then** Sentry captures the exception with full stack + request context (requestId, userId, labId, route)

**Given** Sentry's alert rules
**When** a new 5xx error occurs in production
**Then** the on-call engineer is notified per the rule (e.g. Slack channel + paging if rate-spikes)

**Given** Sentry's noise filters
**When** I review captured events
**Then** known-benign exceptions (e.g. user-cancelled requests) are filtered out

### Story 6.6: Deployment runbook completion

As an operator,
I want the deployment runbook complete and reviewed,
So that the cutover doesn't require improvisation (AR-9).

**Acceptance Criteria:**

**Given** the runbook
**When** I review the table of contents
**Then** it contains sections for: WiredTiger keyfile provisioning + rotation procedure, JWT v2 grace-window cutover sequence (migration → backend deploy → frontend deploy → monitoring window → grace expiry), migrate-mongo cutover playbook (pre-flight count, run up, verify, rollback decision), demo-OTP-in-production warning interpretation + decision tree, Sentry DSN setup, backup + restore (Story 6.3), incident-response runbook for `tenant-scope-assertion.failure` alerts

**Given** the runbook is reviewed by Ajax + at least one other operator
**When** sign-off is recorded
**Then** the runbook moves to "approved" status in the artifact tracker

### Story 6.7: Staging cutover dry run

As an operator,
I want a full end-to-end cutover dry run against a staging clone of production,
So that production cutover is rehearsed and timed before going live.

**Acceptance Criteria:**

**Given** a staging environment with a recent production data snapshot
**When** I follow the deployment runbook's cutover sequence
**Then** the migration runs cleanly (pre/post counts match expectations)
**And** the existing admin can still log in with their existing credentials
**And** existing patients see their existing reports unchanged
**And** a freshly-registered patient can be created + linked via the new flow
**And** end-to-end timing of each phase is recorded

**Given** the dry run completes
**When** I review the runbook
**Then** any discrepancies between the runbook and the actual sequence are corrected

**Given** any pre-cutover assertion fails (counts don't match, migration errors, smoke tests fail)
**When** the rollback procedure is invoked
**Then** the rollback completes successfully and the staging system is restored to its pre-cutover state
