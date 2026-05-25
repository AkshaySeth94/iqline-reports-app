---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-iqline-reports-app-2026-05-25/prd.md
  - _artifacts/architecture.md  # prior pipeline output — current single-tenant architecture (brownfield reference)
  - _artifacts/spec.md          # prior pipeline output — current functional spec (brownfield reference)
  - _artifacts/api-surface.md   # prior pipeline output — current REST API surface (brownfield reference)
workflowType: 'architecture'
project_name: 'iqline-reports-app'
user_name: 'Ajax'
date: '2026-05-26'
title: 'Architecture — Multi-Tenant Lab Segregation (iqline-reports-app)'
status: 'final'
---

# Architecture Decision Document — Multi-Tenant Lab Segregation

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD specifies ~75 numbered FRs organized into 11 thematic groups (FR-1xx Lab management, FR-2xx Lab-admin management, FR-3xx Patient identification & first-visit linking, FR-4xx Glucose report capture, FR-5xx Patient dashboard, FR-6xx Authentication & session, FR-7xx Tenant scoping enforcement, FR-8xx Audit, FR-9xx Migration, FR-10xx Cross-cutting UI). The defining invariant — *a patient becomes visible to a lab only after their first visit to that lab* — runs through the entire FR set and drives every other decision.

Three actors with non-overlapping access:
- **SuperAdmin** (1–3 internal employees): platform-level CRUD on Labs and LabAdmins, cross-lab read access for audit and metrics.
- **LabAdmin** (per-lab clinical operators, high-frequency): strict per-lab isolation; cannot read, write, or enumerate any data outside their own `labId`.
- **Patient** (end consumers): aggregated read across every lab they've visited; static-OTP login retained as v1 constraint.

**Non-Functional Requirements:**

NFRs are grouped into seven domains: Security (S), Privacy (P), Performance (Pe), Availability (A), Accessibility (Ac), Observability (O), Data integrity (D). The four that dominate architectural shape are:

- **Tenant scoping integrity (NFR-S7).** Zero is the only acceptable rate for `tenant-scope-assertion.failure`; any non-zero value is declared a P0 incident in §8.5. This makes tenant isolation a *correctness* property, not a best-effort control — it must be enforced structurally (interceptor + per-method assertion + CI test), not by convention.
- **Privacy hygiene (NFR-P1–P4).** Terms-of-service acknowledgment, name+DOB-only disclosure in cross-lab match dialog with auditing of every impression, 24-month audit retention, WiredTiger storage-engine encryption-at-rest. India context; no formal DPDP/HIPAA certification target in v1.
- **Performance (NFR-Pe1–Pe4).** Patient dashboard ≤2s for ≤100 reports; LabAdmin patient search p95 ≤500ms at 5,000 linked patients; report submit p95 ≤1s. Specific compound indexes are named (Report.{labId, patientId, reportDate}, PatientLabLink.{labId, patientId} unique, User.phone unique).
- **Active-status enforcement (FR-503).** Every authenticated request must validate active status of both user and (for LabAdmins) their lab, regardless of JWT validity. Cannot rely on JWT expiry alone for suspension to take effect.

### Scale & Complexity

- **Primary technical domain:** full-stack web (NestJS backend + Next.js 14 frontend), MongoDB persistence, REST API contract.
- **Complexity level:** medium-high for a single retrofit. Multiple cross-cutting patterns interact: tenant interceptor + RBAC guards + active-status check + immutability-on-Final rule + audit middleware + migration script + soft-delete. The interactions matter more than the individual pieces.
- **Estimated architectural components:** 5 new backend modules (labs, lab-admins, patient-lab-links, super-admin-metrics, migration), 1 new interceptor (LabScopeInterceptor), 1 new guard (ActiveStatusGuard), 2 expanded modules (auth for JWT v2; reports for labId stamping + Final/Corrected transition); 3 new frontend route groups (`/super`, `/panel` rebuilt, `/dashboard` rebuilt).
- **Estimated data model deltas:** 1 new collection (Lab), 1 new join collection (PatientLabLink), `labId` field added to Report and AuditLog, `status` field added to User and Lab, `deletedAt` added to Report, schema versioning for JWT payload v2.

### Technical Constraints & Dependencies

**Inherited from existing project (must respect):**
- Monorepo with `npm workspaces` (frontend + backend siblings).
- NestJS 10 + Mongoose 8 + Passport JWT — no migration to another framework.
- Next.js 14 App Router + React 18 + Recharts — no rewrite to a different charting library or routing model.
- MongoDB as the only datastore; no SQL, no Redis, no cache layer in v1.
- TypeScript everywhere; class-validator DTOs on every controller.
- bcryptjs for password hashing (cost factor ≥12 per NFR-S2).

**New constraints introduced by PRD:**
- Static patient OTP `123456` MUST be retained as v1 behavior (FR-501); real SMS OTP is explicitly OOS.
- WiredTiger encryption-at-rest is the v1 deployment baseline (NFR-P4); managed Mongo with KMS deferred.
- Self-hosted Mongo (not Atlas) is the implied operational model.
- LabScopeInterceptor pattern is non-negotiable — the PRD specifies the structural guard explicitly in FR-600/601.

### Cross-Cutting Concerns Identified

1. **Tenant scoping (security-critical).** Every lab-scoped query path must inject `labId` from the JWT. Combined with a per-method assertion that result-set `labId` matches requester's `labId`. A CI test must attempt cross-tenant reads and assert they fail (NFR-S7).
2. **Audit logging (compliance hygiene).** All writes + sensitive reads (patient list views, match-dialog impressions, patient report views) must be captured with actor + lab context. 24-month retention.
3. **Active-status check (auth correctness).** Cannot trust JWT alone — every request validates `user.status` and `lab.status`. Suspended labs must lock out LabAdmins even with valid tokens.
4. **Migration (one-time, high-risk).** Brownfield data must be back-filled with `labId = DefaultLabId`. Idempotent + rollback-able. Pre/post count assertions in the script itself.
5. **Immutability-on-Final (clinical integrity).** Report state machine: Final is immutable; only the transition Final→Corrected allows edits. Audit must capture before/after on every Corrected save.
6. **Cross-lab patient identity (data model).** A single global User per phone, many-to-many to Labs via PatientLabLink. First-visit creates the link; second-link is idempotent. Race conditions on patient create handled by unique phone index + retry-and-link.
7. **Color-coded multi-lab chart (UX-driven backend).** Patient dashboard query must return per-report lab metadata (name, license) and current lab status (so suspended labs render with "(Suspended)" label). Aggregation is a single `find` with population, not multiple round-trips.
8. **Demo-OTP banner gating (deployment hygiene).** Environment-aware UI must render banner only when `NODE_ENV !== 'production'`. Backend emits CRITICAL log on startup if production runs with static OTP (warning posture, not refuse-to-start — per PRD FR-504 with [NOTE FOR PM]).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (NestJS REST API + Next.js 14 App Router frontend), already scaffolded. This architectural pass is a brownfield retrofit, not a greenfield bootstrap.

### Starter Selection: N/A — Inherited

No new starter is selected. The project was originally bootstrapped via the commands recorded in the prior single-tenant architecture (`_artifacts/architecture.md`), and those scaffolds remain authoritative:

- **Backend scaffold (already executed):**
  ```bash
  npx --yes @nestjs/cli@latest new backend --skip-git --package-manager npm
  ```
- **Frontend scaffold (already executed):**
  ```bash
  npx --yes create-next-app@latest frontend --typescript --eslint --app --src-dir --use-npm --import-alias "@/*" --tailwind --no-turbopack
  ```

### Architectural Decisions Inherited From the Existing Scaffold

The following decisions are **locked in** by the existing codebase and are not re-litigated in this architecture pass:

| Concern | Inherited choice |
|---|---|
| Language | TypeScript (strict mode) |
| Backend framework | NestJS 10 (Express adapter) |
| Frontend framework | Next.js 14 (App Router, React 18) |
| Database | MongoDB (Mongoose 8 ODM) |
| Auth library | Passport (local + jwt strategies), bcryptjs |
| Styling | Tailwind CSS (inherited dark theme) |
| Charting | Recharts |
| Validation | class-validator + class-transformer on DTOs |
| Build tooling | `nest build` (Webpack) backend, `next build` frontend |
| Testing | Jest |
| Linting | ESLint (default for both frameworks) |
| Repo shape | npm workspaces monorepo (`/backend` + `/frontend`) |
| Runtime packaging | Dual-process container (single Docker image) — _re-validated in §4 ADRs_ |

### What This Means for the Retrofit

The architectural work in this document is **additive and modifying**, not greenfield:

- New NestJS modules added under `backend/src/` (labs, lab-admins, patient-lab-links, super-admin-metrics, migration).
- New Mongoose schemas added (Lab, PatientLabLink) and existing schemas extended (User.role enum expanded; User.status added; Report.labId + deletedAt added; AuditLog.labId added).
- New NestJS interceptor (LabScopeInterceptor) and guard (ActiveStatusGuard) added at the global app level.
- New frontend route group `/super` added; existing `(admin)/panel` and `(patient)/dashboard` route groups rebuilt against the new APIs.
- No new top-level dependencies introduced unless a new ADR requires one (each such dependency will be justified in §4 with a named ADR).

**Note:** Because no new scaffold runs, there is no "Story 1 = run starter command" in the downstream epic plan. Story 1 of Epic 1 will instead be the **schema + migration foundation** that everything else depends on.

## Core Architectural Decisions

### Decision Priority Analysis

**Already decided (inherited, not re-litigated):** Stack (NestJS 10 + Next.js 14 + Mongoose 8 + Passport JWT + Tailwind + Recharts), TypeScript everywhere, monorepo shape, dual-process container, class-validator DTOs, bcrypt cost-factor ≥12 — see "Starter Template Evaluation" above and the 8 prior ADRs in `_artifacts/architecture.md`.

**Critical (block implementation):** ADR-tenant-model, ADR-tenant-scoping, ADR-patient-link, ADR-jwt-v2, ADR-active-status, ADR-migration, ADR-soft-delete.

**Important (shape architecture):** ADR-audit, ADR-encryption-at-rest, ADR-api-pagination, ADR-rate-limit, ADR-frontend-state, ADR-color-encoding, ADR-runtime-retained, ADR-observability, ADR-error-shape.

**Deferred (post-v1):** KMS-integrated encryption-at-rest (when we move to managed Mongo); active-status caching layer (only if measured DB load demands it); real SMS OTP integration (separate epic per PRD).

---

### Data Architecture

#### ADR-tenant-model — Per-row `labId` in a single shared database

**Decision:** Single MongoDB cluster. Every tenant-scoped document carries a `labId` ObjectId field. No per-tenant database sharding, no per-tenant collections.

**Rationale:** For a platform scaling to dozens or low-hundreds of labs, per-row scoping is operationally simplest: single backup story, single index set, single migration script. Per-tenant DB sharding becomes worth its operational cost only at thousands of tenants or under strong regulatory isolation requirements — neither applies in v1. The PRD's defining cross-lab patient aggregation is trivially a single query under this model; per-tenant DB sharding would require fan-out reads across N databases for every patient dashboard load.

**Affects:** All new schemas (Lab, PatientLabLink, Report, AuditLog), query layer (LabScopeInterceptor depends on it), migration script.

#### ADR-patient-link — Separate `PatientLabLink` collection (not a denormalized array)

**Decision:** A `PatientLabLink` collection records the many-to-many between Patients and Labs. Unique compound index on `{ patientId, labId }`. **Not** a `labs: ObjectId[]` array on the User document.

**Rationale:**
- Separate collection lets us attach link-event metadata (`linkedAt`, `linkedByAdminId`) cleanly — load-bearing for the "first visit" PRD invariant and for audit.
- Avoids unbounded array growth on User docs.
- Bidirectional queries ("patients of lab X" / "labs of patient Y") both efficient with compound indexes in either direction.
- Race-condition handling: `findOneAndUpdate({ patientId, labId }, ..., { upsert: true })` on the unique compound index is atomic and idempotent — directly implements FR-204's idempotence requirement.

**Tradeoff:** Two-collection join for the LabAdmin's "patient list" query. Mitigated by compound index `{ labId, patientId }` on PatientLabLink + `$lookup` to User — measured under NFR-Pe2's 500ms p95 budget at 5k patients via a pre-implementation spike.

**Affects:** User schema (no `labs[]` field), new PatientLabLink schema, all patient-list queries.

#### ADR-soft-delete — Manual `deletedAt` + Mongoose query helper

**Decision:** Reports get `deletedAt: Date | null`. A custom Mongoose query helper on ReportSchema named `.alive()` auto-injects `{ deletedAt: null }` filter. All read paths use `.alive()`. SuperAdmin audit views opt in via `.withDeleted()`. Patients are never soft-deleted in v1.

**Rationale:** Manual is transparent — `mongoose-delete` plugin silently modifies findOne and has caused production surprises. Custom helpers keep the opt-in explicit: a code reviewer sees `.alive()` and knows the filter is applied. Tracks PRD FR-305.

**Affects:** ReportSchema, every Report read path.

#### ADR-migration — `migrate-mongo` with idempotent + rollback scripts

**Decision:** Adopt `migrate-mongo` for all schema changes. The multi-tenant retrofit ships as a single up-migration with a matching down-migration. Pre-flight: count current Users/Reports. Post-flight: same counts + new collections populated as expected. Re-running the up-migration with nothing to migrate is a no-op.

**Rationale:** PRD FR-800-803 mandates idempotence + rollback. Rolling our own is feasible but migrate-mongo already provides the state table and locking. New top-level dep justified by the high-risk, one-shot nature of the operation.

**Affects:** Deployment workflow, new `backend/migrations/` directory, runbook.

---

### Authentication & Security

#### ADR-jwt-v2 — Versioned JWT payload with explicit `v` field

**Decision:** JWT payload v2 = `{ v: 2, sub, phone, role: SuperAdmin|LabAdmin|Patient, labId: ObjectId|null, name, iat, exp }`. Old v1 tokens (no `v` field) accepted in a 24-hour grace window after deploy then rejected (forced re-login).

**Rationale:** Explicit version field beats inferring v2 from `labId` presence: clearer intent, easier evolution, painless rollback. The grace window prevents user-visible disruption at deploy time and matches the v1 patient JWT 24h-expiry naturally.

**Affects:** Auth module (token issue + verify), session-validity guard, deployment runbook.

#### ADR-tenant-scoping — Interceptor + per-method assertion + CI test

**Decision:** Three-layer defense:

1. **Global NestJS `LabScopeInterceptor`** reads the JWT, populates a request-scoped `TenantContext` (`labId`, `role`, `userId`). For LabAdmin requests, all lab-scoped Mongoose service methods MUST consult `TenantContext.labId` (enforced by service-layer convention — the context lives in request-scoped DI, cannot be forgotten or spoofed).
2. **Per-method assertion** inside every lab-scoped service method: after the find completes, assert every returned document's `labId` equals `TenantContext.labId`. Mismatch throws, emits `tenant-scope-assertion.failure` metric (P0 alert per PRD §8.5), returns 500 to caller (never leak wrong-tenant data, even on the error path).
3. **CI test** (`tenant-isolation.e2e-spec.ts`) seeds two labs, logs in as LabAdmin A, attempts to read LabAdmin B's reports via every list/get endpoint. Asserts 404/403. Build fails on any cross-tenant read success.

**Rationale:** PRD FR-600/601 specifies the structural-not-conventional posture. Each layer alone could be defeated by a bug; the three together require a coordinated regression across interceptor, assertion, AND CI to leak data.

**Affects:** New NestJS interceptor, new TenantContext service, every lab-scoped service method, CI pipeline.

#### ADR-active-status — DB lookup on every authenticated request (no cache in v1)

**Decision:** `ActiveStatusGuard` runs after `JwtAuthGuard`. Reads User by `sub` (projection: `{_id, status, role, labId}`). If user.status !== "Active" → 401. If role === LabAdmin: reads Lab by `user.labId` (projection: `{_id, status}`). If lab.status !== "Active" → 401. Populates TenantContext. No cache in v1.

**Rationale:** FR-503 requires immediate revocation on suspension; a cache by definition introduces a staleness window. Two indexed `_id` lookups are sub-ms under MongoDB's WiredTiger cache — within NFR-Pe budgets. If measured load justifies it later, add a 30s-TTL in-memory cache with explicit invalidation hooks. Defer until measured.

**Affects:** New ActiveStatusGuard, all protected routes, observability metric `auth.active-check.duration`.

#### ADR-audit — Decorator + interceptor, async write

**Decision:** `@Audit('lab.created')` on controller methods marks them for write audit. `@AuditRead('patient-list.read')` for sensitive read audit. Global `AuditInterceptor` reads decorator metadata, captures actor + lab + request summary + result, writes to AuditLog asynchronously (queued, never blocks the request response). CI lint rule verifies decorators are present on a known list of audit-required endpoints.

**Rationale:** PRD FR-700/701 demands broad coverage; centralization beats per-controller try/catch. Async writes keep audit off the request critical path (reports submit p95 ≤1s per NFR-Pe3).

**Tradeoff:** Small window where request succeeds but audit write fails. Mitigated by bounded in-memory retry queue; overflow logged to disk + alert.

**Affects:** New AuditModule, AuditInterceptor + decorators, CI lint rule.

#### ADR-rate-limit — `@nestjs/throttler` with two policies

**Decision:** Two named policies:
1. **Auth endpoints** (`/auth/*/login`, `/auth/*/verify-otp`): 5 requests per 5 minutes per source IP, AND 5 per 5 minutes per phone number (both axes enforced independently).
2. **Authenticated endpoints**: 100 requests per minute per JWT `sub`.

**Rationale:** NFR-S5 mandates rate-limiting on login. Two-axis enforcement defeats both blanket bot-spraying (IP) and targeted account-takeover (phone). The generous authenticated limit accommodates LabAdmin "dozens of reports per session" frequency.

**Affects:** AuthModule, global ThrottlerGuard.

#### ADR-encryption-at-rest — WiredTiger keyfile, local filesystem

**Decision:** MongoDB started with `--enableEncryption --encryptionKeyFile /etc/mongodb/encryption.key`. Keyfile = 32-byte random, permissions `0400 root:root`. Rotation: documented manual procedure in v1.

**Rationale:** PRD NFR-P4 mandates WiredTiger storage-engine encryption, self-hosted baseline. Local keyfile is the simplest setup that satisfies it. KMS integration deferred to managed-Mongo epic.

**Tradeoff:** Keyfile compromise = decryption capability. Mitigated by tight file permissions + host-level access controls + filesystem audit.

**Affects:** Deployment runbook, ops procedures.

---

### API & Communication Patterns

#### ADR-api-pagination — Cursor pagination on list endpoints

**Decision:** All list endpoints potentially returning >100 rows use opaque cursor pagination: `?cursor=<opaque>&limit=50`. Default 50, max 200. Cursor encodes `_id` + sort key (typically `createdAt`) for stable ordering. Affected endpoints: LabAdmin patient list, SuperAdmin audit log search, patient report history (when grown large).

**Rationale:** Offset pagination breaks under concurrent writes and gets slower as offset grows. Cursor over a compound index hits NFR-Pe2's 500ms p95 budget trivially. PRD UI doesn't ask for "jump to page N."

**Affects:** Backend list endpoints, frontend list components (infinite scroll or "load more").

#### ADR-error-shape — Inherit prior `{statusCode, message, error}` shape, add `requestId`

**Decision:** Continue the existing error response shape from prior ADR-contracts: `{ statusCode: number, message: string | string[], error: string }`. Add a `requestId` field for correlation with observability logs.

**Rationale:** No reason to break existing frontend consumers. `requestId` is purely additive and supports NFR-O1 (structured logs with request id).

**Affects:** All API responses, frontend error handler.

---

### Frontend Architecture

#### ADR-frontend-state — TanStack Query for server state, React Context for local

**Decision:** Server state cached and synced by TanStack Query (React Query). Local UI state by React `useState` + `useContext`. No Redux, no Zustand, no Jotai.

**Rationale:** Three small consoles; server-state caching is the only non-trivial concern. TanStack Query handles caching, refetch-on-focus, optimistic updates, stale-while-revalidate idiomatically — and lets us hit NFR-Pe1 (dashboard ≤2s) by serving cached data on revisits. A global state library is overkill for the local state involved.

**Tradeoff:** One new top-level dep (`@tanstack/react-query`). Justified.

**Affects:** Frontend, package.json, all data-fetching hooks.

#### ADR-color-encoding — Shape + color encoding for accessibility

**Decision:** Each lab gets `color = paulTolBright[hash(labId) % 8]` and `shape = ['circle','triangle','square','diamond'][hash(labId) % 4]`. Both encodings applied to every chart point and the legend.

**Rationale:** PRD NFR-Ac2 + FR-401 require color-blind safe + monochrome-printable. Color-alone fails monochrome; shape-alone is less scannable. Combined gives both.

**Affects:** GlucoseChart component, legend.

---

### Infrastructure & Deployment

#### ADR-runtime-retained — Dual-process container retained

**Decision:** Keep the existing dual-process Docker container. No split into separate services.

**Rationale:** PRD NFR-A1 targets 99.5% uptime — achievable with single-container deployment. Splitting adds operational complexity without serving any v1 requirement. Revisit if uptime target rises to 99.9%+ or scaling needs diverge.

**Affects:** Deployment (unchanged from existing Dockerfile).

#### ADR-observability — Structured JSON to stdout, Sentry for errors

**Decision:** Structured JSON logging (per prior ADR — retained) augmented with required fields per NFR-O1: `requestId`, `userId`, `labId`, `route`, `status`, `duration`. Sentry for error tracking (NFR-O2). Business counters (NFR-O3: `reports.created`, `patients.linked`, `labs.suspended`, `login.success`, `login.failure`, `lab.first-report.recorded`, `tenant-scope-assertion.failure`) emitted via a thin `MetricsService` writing to stdout; downstream collector ships to metrics backend.

**Rationale:** Sentry is the boring choice; APM alternatives are heavier deps for the same value. Stdout-JSON-to-collector keeps the application loosely coupled to the metrics backend.

**Affects:** New SentryModule, new MetricsService, deployment (collector sidecar/agent).

---

### Decision Impact Analysis

**Implementation sequence (order downstream stories should be built in):**

1. **Schema + migration foundation.** Add Lab, PatientLabLink schemas; extend User/Report/AuditLog with `labId`, `status`, `deletedAt`. Write migrate-mongo up + down scripts. Seed Default Lab + back-fill. Verify in staging.
2. **Auth v2.** JWT payload v2 issuance + verification, grace window, JwtAuthGuard + ActiveStatusGuard. Promote existing admin to LabAdmin of Default Lab.
3. **Tenant scoping infrastructure.** TenantContext service, LabScopeInterceptor, per-method assertion helper, tenant-isolation E2E test in CI. Must land before any new business endpoint.
4. **Audit infrastructure.** AuditModule, AuditInterceptor, `@Audit` / `@AuditRead` decorators, async-write queue.
5. SuperAdmin lab/admin CRUD endpoints + UI.
6. LabAdmin patient lookup + cross-lab linking endpoints + UI.
7. Glucose report capture (extended) + Final/Corrected transition + soft-delete.
8. Patient aggregated dashboard.
9. Cross-cutting UI + observability + Sentry.

**Cross-component dependencies (non-obvious):**

- Every business endpoint depends on steps 1-4 — cannot start business work before scoping + auth + audit infrastructure lands.
- LabScopeInterceptor depends on TenantContext (request-scoped DI) — must register in correct order in `app.module.ts`.
- ActiveStatusGuard depends on User and Lab schemas having `status` fields — cannot enable until migration runs.
- Frontend cannot consume v2 API until the JWT v2 grace window opens — deployment order: migration → backend → frontend.
- migrate-mongo "down" script must drop new collections cleanly — tested in CI by a round-trip up→down→up migration on a seeded fixture.

---

## Implementation Patterns & Project Structure

### Inherited (no change)

Naming conventions, file/path conventions, error response shape, logging format, and commit message standard are inherited from `_artifacts/architecture.md` §4. Do not re-derive.

### Retrofit-specific patterns

- **Tenant-scoped services** access `TenantContext` via constructor injection: `constructor(private readonly tenantContext: TenantContext)`. They never receive `labId` as a method parameter — DI is the contract.
- **Lab-scoped Mongoose finds** end with the standard assertion helper:
  ```typescript
  const reports = await this.reportModel.find({ ... }).alive().exec();
  this.tenantContext.assertLabIdOf(reports);  // throws + alerts on mismatch
  return reports;
  ```
- **Audit decorators** are placed on the controller method, never the service:
  ```typescript
  @Post()
  @Roles(UserRole.LabAdmin)
  @Audit('report.created')
  create(@Body() dto: CreateReportDto) { ... }
  ```
- **Mongoose query helpers** for filterable states are named `.alive()` (not deleted) and `.withDeleted()` (admin-only opt-in).
- **DTO file location**: `backend/src/<feature>/dto/<verb>-<noun>.dto.ts`.
- **Migrations**: `backend/migrations/<timestamp>-<slug>.js`, plain CommonJS (migrate-mongo convention), idempotent on every operation.

### Project structure deltas

```
backend/src/
├── app.module.ts                    # EDITED (register new modules + global interceptors/guards)
├── tenant-context/                  # NEW
│   ├── tenant-context.module.ts
│   ├── tenant-context.service.ts    # request-scoped DI; exposes labId, role, userId, assertLabIdOf()
│   └── lab-scope.interceptor.ts     # global interceptor; populates TenantContext from JWT
├── active-status/                   # NEW
│   ├── active-status.module.ts
│   └── active-status.guard.ts       # runs after JwtAuthGuard
├── audit/                           # EDITED (already exists per prior arch)
│   ├── audit.module.ts
│   ├── audit.interceptor.ts         # NEW — decorator-driven
│   ├── decorators/
│   │   ├── audit.decorator.ts       # @Audit('action.name')
│   │   └── audit-read.decorator.ts  # @AuditRead('action.name')
│   ├── audit-write-queue.service.ts # NEW — async batch writer
│   └── schemas/audit-log.schema.ts  # EDITED — add labId
├── labs/                            # NEW
│   ├── labs.module.ts
│   ├── labs.controller.ts
│   ├── labs.service.ts
│   ├── schemas/lab.schema.ts        # NEW
│   └── dto/{create,update,suspend}-lab.dto.ts
├── lab-admins/                      # NEW
│   ├── lab-admins.module.ts
│   ├── lab-admins.controller.ts
│   ├── lab-admins.service.ts
│   └── dto/{create,reset-password,disable}-lab-admin.dto.ts
├── patient-lab-links/               # NEW
│   ├── patient-lab-links.module.ts
│   ├── patient-lab-links.service.ts
│   └── schemas/patient-lab-link.schema.ts
├── super-admin-metrics/             # NEW
│   ├── super-admin-metrics.module.ts
│   ├── super-admin-metrics.controller.ts
│   └── super-admin-metrics.service.ts
├── users/                           # EDITED — schema gets status + extended role enum
├── reports/                         # EDITED — schema gets labId + deletedAt + meal context + unit
├── auth/                            # EDITED — JWT payload v2, grace window
└── common/
    ├── enums/user-role.enum.ts      # EDITED — SuperAdmin | LabAdmin | Patient
    ├── enums/status.enum.ts         # NEW — Active | Suspended | Disabled
    ├── enums/meal-context.enum.ts   # NEW — Fasting | PostMeal | Random
    └── enums/glucose-unit.enum.ts   # NEW — MgDl | MmolL

backend/migrations/                  # NEW (migrate-mongo)
└── 20260526000000-multi-tenant-retrofit.js

frontend/src/app/
├── (auth)/login/                    # EDITED (env-gated demo OTP banner)
├── (super)/                         # NEW — SuperAdmin route group
│   ├── layout.tsx
│   ├── page.tsx                     # metrics tiles dashboard
│   ├── labs/page.tsx
│   ├── labs/[labId]/page.tsx        # lab detail + admins list
│   └── audit/page.tsx
├── (admin)/panel/                   # REBUILT — patient search, drawer, enhanced glucose form
└── (patient)/dashboard/             # REBUILT — color/shape chart, filter chips, per-report cards
```

### Required indexes (per NFR-Pe4)

```javascript
// User
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ role: 1, status: 1 });

// Lab
db.labs.createIndex({ name: 1 }, { unique: true });
db.labs.createIndex({ licenseNumber: 1 }, { unique: true });
db.labs.createIndex({ status: 1 });

// PatientLabLink
db.patientlablinks.createIndex({ patientId: 1, labId: 1 }, { unique: true });
db.patientlablinks.createIndex({ labId: 1, patientId: 1 });  // for LabAdmin patient list
db.patientlablinks.createIndex({ labId: 1, linkedAt: -1 });  // for "recently linked patients"

// Report
db.reports.createIndex({ labId: 1, patientId: 1, reportDate: -1 });  // LabAdmin patient drawer
db.reports.createIndex({ patientId: 1, reportDate: -1 });            // patient dashboard
db.reports.createIndex({ labId: 1, createdAt: -1 });                 // metrics + audit views
db.reports.createIndex({ deletedAt: 1 }, { sparse: true });          // soft-delete cleanup

// AuditLog
db.auditlogs.createIndex({ labId: 1, createdAt: -1 });               // per-lab forensics
db.auditlogs.createIndex({ actorId: 1, createdAt: -1 });             // per-user forensics
db.auditlogs.createIndex({ action: 1, createdAt: -1 });              // search by action
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 63072000 });  // 24-month TTL
```

---

## Validation

### Coherence check

The ADRs are mutually compatible. Per-row tenancy (ADR-tenant-model) + LabScopeInterceptor pattern (ADR-tenant-scoping) + ActiveStatusGuard (ADR-active-status) form a complete request-time enforcement chain. Migrate-mongo (ADR-migration) + `labId` back-fill (ADR-tenant-model schema delta) + JWT grace window (ADR-jwt-v2) form a complete deployment sequence. No ADR contradicts another; no ADR contradicts an inherited prior ADR.

### Requirements coverage

Every FR group and every NFR group is addressed:

| PRD area | Architecture coverage |
|---|---|
| FR-101–106 Lab management | New Labs module; ADR-tenant-model schema; FR-104 cascade handled by ADR-active-status (every request validates lab status) |
| FR-110–115 LabAdmin management | New LabAdmins module; force-password-change on first login is a v1-grade FR handled in AuthModule (not its own ADR) |
| FR-120–122 SuperAdmin metrics | New SuperAdminMetrics module; ADR-tenant-scoping bypass for SuperAdmin (FR-602) |
| FR-200–205 Patient identification & linking | ADR-patient-link (separate collection + upsert idempotence); cross-lab match dialog implemented in Patients service with name+DOB-only return shape (NFR-P2) |
| FR-300–305 Glucose capture | Extended Report schema + Final/Corrected transition logic + ADR-soft-delete + ADR-audit |
| FR-400–405 Patient dashboard | Reports query with `$lookup` to Lab (population); ADR-color-encoding for chart; cursor pagination only kicks in for high-volume patients (>100 reports) |
| FR-500–505 Auth & session | ADR-jwt-v2; bootstrap SuperAdmin via env (FR-505) handled at AuthModule startup |
| FR-600–603 Tenant scoping | **ADR-tenant-scoping** (three-layer defense); SuperAdmin bypass per FR-602 |
| FR-700–702 Audit | ADR-audit (decorator + interceptor); 24-month retention via the TTL index above |
| FR-800–804 Migration | ADR-migration (migrate-mongo); rollback script + idempotence enforced by the tool |
| FR-900–904 Cross-cutting UI | Frontend route group rewrites; FR-504 demo banner gated on `NODE_ENV`; ADR-frontend-state for caching |
| NFR-S1–S7 Security | HTTPS at ingress; bcrypt cost ≥12 (inherited); JWT secret env-var required (inherited); ADR-rate-limit; ADR-tenant-scoping + CI test (NFR-S7) |
| NFR-P1–P4 Privacy | TermsOfServiceAck module (small, no dedicated ADR); FR-201 disclosure shape codified in PatientService; 24-month audit (TTL index); ADR-encryption-at-rest |
| NFR-Pe1–Pe4 Performance | Index spec above; ADR-api-pagination; ADR-frontend-state caching |
| NFR-A1–A2 Availability | ADR-runtime-retained; backup cadence is a runbook item, not ADR |
| NFR-Ac1–Ac2 Accessibility | ADR-color-encoding (shape+color); WCAG AA contrast in Tailwind palette is a frontend implementation concern |
| NFR-O1–O3 Observability | ADR-observability |
| NFR-D1–D3 Data integrity | Phone normalization in AuthModule; orphan-checking CI test is a separate epic story; soft-delete-doesn't-cascade enforced by ADR-soft-delete |

### Implementation readiness

This architecture provides what the Dev agent (Amelia) needs to begin:
- Concrete module structure with named files and DTO locations.
- Named ADRs for every cross-cutting concern with explicit decisions, not hand-waved patterns.
- Index spec ready to drop into migrate-mongo as the first migration's index-creation step.
- Test strategy for the load-bearing invariant (CI tenant-isolation E2E test).
- Defense-in-depth pattern for tenant scoping (no story can accidentally write a tenant-leaky service method without the CI catching it).

### Gap analysis

Two minor gaps acknowledged, neither blocking:
- **UX wireframes are not produced.** Per the conversation, Ajax deliberately deferred `bmad-create-ux-design`. Frontend stories will inherit UI design decisions from PRD FR text + this architecture's project structure. If story-level UI ambiguity becomes a blocker, surface it during epics and revisit.
- **Real SMS OTP integration architecture is intentionally not designed.** When that epic is taken on, this architecture will need a `NotificationsModule` ADR.

---

## Document Control

- **Status:** final
- **Created:** 2026-05-26
- **Author:** Winston (System Architect), facilitated for Ajax
- **PRD:** [prd.md](prds/prd-iqline-reports-app-2026-05-25/prd.md) (status: final)
- **Next phase:** Epics & Stories (`bmad-create-epics-and-stories`) → Dev (Amelia)
