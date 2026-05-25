---
title: "PRD — Multi-Tenant Lab Segregation (iqline-reports-app)"
status: final
created: 2026-05-25
updated: 2026-05-26
owner: Ajax
facilitator: John (PM)
stakes: launch-grade
---

# PRD — Multi-Tenant Lab Segregation

## 1. Executive Summary

iqline-reports-app today is a single-tenant clinical reporting tool: one admin role enters glucose readings, one patient role views their own trend chart. This release converts it into a **multi-tenant platform** where many independent **labs** operate side-by-side on shared infrastructure, each lab seeing only the patients who have visited it, while **patients** continue to see their full history aggregated across every lab they've used.

Three roles will exist after this release: **SuperAdmin** (platform operator), **LabAdmin** (clinical operator at one lab), and **Patient** (consumer of their own data). The defining invariant — *a patient becomes visible to a lab only after their first visit to that lab* — is the privacy contract we make with both labs and patients.

This is a brownfield retrofit: the existing NestJS + MongoDB + Next.js 14 stack and JWT auth are kept, augmented with a `labId` tenant dimension on every collection and a backend interceptor that auto-scopes all LabAdmin queries to their lab. Patient OTP auth (static `123456`) is intentionally retained.

## 2. Background & Context

### 2.1 Current state (single-tenant)

- Two roles: `Admin`, `Patient` (see `backend/src/common/enums/user-role.enum.ts`).
- One global pool of patients; admin can see and write reports for any patient.
- Reports are glucose-only, plotted as a Recharts area chart on the patient dashboard.
- Auth: admin uses phone + bcrypt password (1h JWT); patient uses phone + static OTP `123456` (24h JWT). One admin is seeded at boot.
- No notion of "lab," "tenant," or organizational ownership anywhere in the schema or query path.

### 2.2 Why retrofit now

- The product needs to onboard partner labs (multiple, independent) without exposing one lab's patients to another's admins.
- Patients have repeatedly asked to see results from different labs in one place — the platform is uniquely positioned to deliver that.
- Doing the multi-tenant work before the next report type (HbA1c, lipid, etc.) is far cheaper than retrofitting after — every new schema gets `labId` from birth.

### 2.3 What stays unchanged

- Tech stack: NestJS, Mongoose/MongoDB, Next.js 14 App Router, Passport JWT, Recharts.
- Patient OTP = static `123456`. Demo banner gated to non-production environments.
- Admin password auth (bcrypt + JWT).
- The clinical data model for a single glucose reading.

---

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Tenant isolation:** No LabAdmin can read, write, or even enumerate a patient who has not visited their lab. Zero cross-lab data leakage by construction (backend interceptor), not by convention.
2. **Patient continuity:** A patient sees a single unified trend across every lab they've ever visited, color-coded by lab, with full provenance on each data point.
3. **SuperAdmin operability:** One person at the platform level can onboard a lab, provision its admin, and see system-wide health in under five minutes per lab.
4. **Lossless migration:** Existing single-tenant data is preserved and assigned to a seeded "Default Lab" with zero data loss and zero downtime.
5. **Audit completeness:** Every privileged action is recorded with actor + lab context, sufficient for incident investigation by the SuperAdmin.

### 3.2 Non-Goals (this release)

See §12 for the canonical out-of-scope list. The headline omissions: additional report types, Doctor/Physician role, billing, white-labeling, real SMS OTP, PDF download, patient self-service deletion/export, public lab sign-up.

---

## 4. Personas

### 4.1 SuperAdmin (Platform Operator)
- **Who:** Internal employee (1–3 people total). Responsible for onboarding lab partners and platform health.
- **Primary jobs:** Register labs after sales handoff; provision lab admin credentials; suspend bad actors; eyeball aggregate platform metrics.
- **Frequency:** Logs in a few times per week. Sessions are short and task-focused.
- **Sophistication:** Comfortable with admin consoles. Will hand temporary passwords to lab partners over the phone or via secure messaging — *not* in-app email.

### 4.2 LabAdmin (Clinical Operator)
- **Who:** A receptionist, technician, or lab manager at a partnered diagnostic lab.
- **Primary jobs:** Receive walk-in patients; identify or register them; record glucose reading; correct mistakes; look up their own patients' historical results from this lab.
- **Frequency:** Many sessions per day, often dozens of report entries per session. Speed and accuracy of the patient lookup + report-entry flow is the #1 UX driver.
- **Sophistication:** Domain-expert in lab workflow; not necessarily technical. Expects forms that match the paper request slip in front of them.

### 4.3 Patient
- **Who:** Any person who has had a glucose test at any partnered lab. India-context first.
- **Primary jobs:** Check the most recent reading; see the trend over weeks/months; compare across labs to understand differences.
- **Frequency:** Infrequent — checks shortly after each test, then perhaps weekly. May go months without logging in, then return after a new test.
- **Sophistication:** Wide range. UX must be readable on a phone, in good and bad lighting, by users who are not health-data literate.

---

## 5. Key User Journeys

### UJ-1 — SuperAdmin onboards a new lab

> Acme Diagnostics signs a partnership. SuperAdmin opens `/super`, clicks **Register Lab**, types name, address, license number, primary contact. Lab appears in the list as **Active**. SuperAdmin clicks into the lab, then **Add Lab Admin**, types the admin's name + phone, sets a temporary password, hands the credential to Acme over a phone call. Acme's admin logs in within the hour, is forced to change the password, and is ready to record their first patient.

### UJ-2 — LabAdmin records a glucose report for a returning patient

> A patient walks in. LabAdmin opens `/panel`, types the patient's phone in the search box. Patient appears in the list (because they've visited this lab before). LabAdmin clicks the patient, opens **New Report**, selects today's date, enters `145`, picks unit `mg/dL`, marks `Fasting`, status `Final`, saves. Trend chart for that patient is now updated. Total clicks: 4. Total typed characters: 10 (phone) + 3 (glucose value).

### UJ-3 — LabAdmin records a report for a patient who has visited *another* lab but not this one

> Patient walks in. LabAdmin types phone in the search box. **No results** in this lab's list, but the system has found a matching global patient. A confirmation dialog appears: **"A patient with this phone number exists in our system. Name: Ramesh K. Link to your lab to proceed?"** LabAdmin confirms — they have the patient in front of them, name matches. Patient is silently linked to the lab. New Report form opens with patient pre-selected. LabAdmin saves the report. Patient now appears in this lab's patient list for all future visits.

### UJ-4 — LabAdmin tries to register a brand-new patient

> Patient walks in for the first time anywhere on the platform. LabAdmin types phone in the search box. No results in lab list, no global match. **+ Add new patient** appears. LabAdmin clicks it; modal asks for name and DOB; LabAdmin submits. New patient is created + linked to this lab in one step. Report form opens with patient pre-selected.

### UJ-5 — Patient views aggregated trend across labs

> Patient logs in via phone + OTP `123456`. Dashboard shows a single trend chart spanning the last 90 days, points color-coded by lab (Acme = blue, Beta Labs = green). Filter chips above the chart: **All** (default) / **Acme Diagnostics** / **Beta Labs**. Below the chart, a scrollable list of report cards — each card shows lab name, date, value + unit, fasting/post-meal tag, status. The most recent reading is highlighted at the top.

### UJ-6 — Patient logs in for the first time, has zero reports

> New patient, no lab has yet recorded them — patient should not exist on the platform. Login attempts return "No account found; visit a partnered lab to be registered." _Patients are never self-created; they only exist via a LabAdmin's first-visit link._

### UJ-7 — SuperAdmin suspends a misbehaving lab

> SuperAdmin opens `/super/labs/{labId}`, clicks **Suspend**. From this moment, no admin of that lab can log in (existing JWTs continue to validate until expiry — see FR-503 for active-status check). Patients of the lab continue to see their existing reports in their dashboard; the chart label / per-report card still shows the lab's name. SuperAdmin can re-activate at any time.

---

## 6. Functional Requirements

> IDs are stable; renumber only by deprecation, not by reordering. `MUST` is a hard requirement; `SHOULD` is recommended but not blocking; `MAY` is optional.

### 6.1 Lab management (SuperAdmin)

- **FR-101 — Register lab.** A SuperAdmin MUST be able to create a new Lab record with: `name` (required, unique within platform), `address` (required, free text), `licenseNumber` (required, unique within platform), `primaryContactName`, `primaryContactPhone`, `primaryContactEmail`. On success, lab status defaults to `Active`.
- **FR-102 — List labs.** A SuperAdmin MUST see all labs in a paginated, searchable table showing name, license #, status (`Active` / `Suspended`), patient count, report count, created date.
- **FR-103 — View lab detail.** Clicking a lab MUST reveal the lab's profile fields, its lab admins, its linked patient count, its report count for the last 7 / 30 days, and its created/updated metadata.
- **FR-104 — Suspend / re-activate lab.** A SuperAdmin MUST be able to toggle a lab between `Active` and `Suspended`. When `Suspended`: (a) no LabAdmin of that lab can complete a fresh login; (b) any LabAdmin session whose JWT is still valid MUST be denied on the next API call via the active-status check defined in FR-503; (c) the lab's existing reports MUST remain visible to the patients who own them; (d) no new patients can be linked to the lab; (e) the lab MUST appear with a clearly marked `Suspended` badge in the SuperAdmin console.
- **FR-105 — Edit lab profile.** A SuperAdmin MUST be able to edit address, contact fields, and license number. Lab `name` MAY be edited; renames MUST be recorded in the audit log with both old and new values.
- **FR-106 — Labs cannot be deleted in v1.** Suspension is the disable mechanism. _(Hard delete deferred — would orphan reports.)_

### 6.2 Lab admin management (SuperAdmin)

- **FR-110 — Create lab admin.** A SuperAdmin MUST be able to create a LabAdmin user from within a lab's detail page, providing: `name` (required), `phone` (required, must not collide with any existing user phone across roles), `temporaryPassword` (required, ≥ 10 chars, ≥ 1 letter + 1 digit).
- **FR-111 — Force password change on first login.** A newly-created LabAdmin's first successful login MUST redirect to a "Set your password" screen before granting access to `/panel`. New password MUST meet the same strength rule; new password MUST differ from the temporary one.
- **FR-112 — List lab admins per lab.** A SuperAdmin MUST see all lab admins under a lab with name, phone, status (`Active` / `Disabled`), last login.
- **FR-113 — Disable / re-enable lab admin.** A SuperAdmin MUST be able to toggle a LabAdmin between `Active` and `Disabled`. A `Disabled` LabAdmin MUST be blocked from login and from API access on next request.
- **FR-114 — Reset lab admin password.** A SuperAdmin MUST be able to issue a new temporary password to a LabAdmin; the next login MUST again force a password change.
- **FR-115 — Reassign lab admin.** _Out of scope v1._ A LabAdmin is tied to exactly one lab; to move them, disable and recreate.

### 6.3 SuperAdmin metrics

- **FR-120 — Platform tiles.** The SuperAdmin landing page MUST display tiles: total active labs, total active patients, reports created in the last 7 days, reports created in the last 30 days.
- **FR-121 — Per-lab activity.** The lab detail page MUST show reports/week (last 4 weeks) as a sparkline or small bar chart.
- **FR-122 — Audit log search.** A SuperAdmin MUST be able to search the audit log by `actorId`, `labId`, `action`, and date range, with results showing actor name, lab name, action, target, timestamp.

### 6.4 Patient identification & first-visit linking (LabAdmin)

- **FR-200 — Patient search.** The LabAdmin patient search MUST accept a full phone number and (a) return matching patients in this lab's patient list if any exist, OR (b) initiate the cross-lab match flow defined in FR-201/202.
- **FR-201 — Cross-lab match found.** If the typed phone matches a global patient who is **not** linked to this lab, the UI MUST present a confirmation dialog showing the patient's `name` and `dateOfBirth` (full DOB), e.g. _"Patient found: Ramesh K., DOB 1985-04-12. Link to your lab?"_ DOB is disclosed to support reliable identity confirmation against the person physically present at the lab and reduce wrong-patient link risk. No other fields (address, prior reports, other linked labs) MUST be disclosed. Two actions: **Link patient to this lab** (proceeds to report form, creates the link record) or **Cancel** (no link created, audit log records a "lookup performed" entry with the searched phone and the matched patientId).
- **FR-202 — No match found.** If the typed phone matches no patient anywhere on the platform, the UI MUST offer an **Add new patient** action that opens a modal asking for `name` (required) and `dateOfBirth` (required). On submit, the system MUST create a new Patient user and link them to the current lab atomically.
- **FR-203 — Duplicate-phone safety.** The system MUST never silently create a second patient record for an existing phone number. If a race condition produces a collision, the second create MUST fail and the LabAdmin MUST be shown the cross-lab match dialog from FR-201.
- **FR-204 — Link record.** A `PatientLabLink` MUST be created the moment a patient is first linked to a lab. The link record MUST capture: `patientId`, `labId`, `linkedByAdminId`, `linkedAt`. A second link to the same (patient, lab) pair MUST be a no-op (idempotent).
- **FR-205 — Patient list scope.** The LabAdmin patient list MUST be exactly `{ User WHERE _id ∈ PatientLabLink.patientId for links WHERE labId == requester.labId }`. No rows from any other source.

### 6.5 Glucose report capture (LabAdmin)

- **FR-300 — Create report.** A LabAdmin MUST be able to create a glucose Report for any patient in their lab's list, with: `patientId` (required, MUST be in this lab's patient list), `reportDate` (required, defaults to today), `glucoseValue` (required, positive number), `unit` (required, enum: `mg/dL` or `mmol/L`, default `mg/dL`), `mealContext` (required, enum: `Fasting` / `PostMeal` / `Random`), `status` (required, enum: `Final` / `Corrected`, default `Final`), `notes` (optional, free text ≤ 500 chars).
- **FR-301 — Auto-stamped fields.** On create, the system MUST stamp `labId` from the LabAdmin's JWT, `createdBy` and `updatedBy` to the LabAdmin's user id, and `createdAt` / `updatedAt`. A LabAdmin MUST NOT be able to override `labId`.
- **FR-302 — Edit report.** A LabAdmin MUST be able to update a report they (or another admin of the same lab) created, but ONLY if `status` is `Corrected`, OR the update IS the transition `Final` → `Corrected`. Any field except `labId`, `patientId`, `createdBy`, `createdAt` MAY be changed. The status transition and field edits MAY occur in a single update operation (the system MUST NOT require two saves). `[NOTE FOR PM: this enforces an immutability-on-Final pattern — a Final report cannot be silently updated, only transitioned to Corrected. Example: report saved at 10:00 as Final, value 145. At 11:00 LabAdmin spots a typo and submits an update that simultaneously transitions to Corrected and changes value to 165. Audit log records both states. Trades small UX friction for clinical/legal defensibility.]`
- **FR-303 — No cross-lab visibility.** A LabAdmin MUST NOT see, retrieve, or otherwise enumerate any Report whose `labId` differs from their own. This MUST be enforced at the query layer by `LabScopeInterceptor`, NOT only at the UI layer.
- **FR-304 — Patient detail drawer.** Clicking a patient in the lab's list MUST open a drawer showing patient name, DOB, phone, and a chronological list of reports — scoped to this lab only.
- **FR-305 — Delete report.** A LabAdmin MUST be able to soft-delete a report they created in error. Soft-deleted reports MUST NOT appear in the lab's view, the patient's view, or affect the trend chart. They MUST remain in storage with a `deletedAt` timestamp for audit. Only the issuing LabAdmin or a SuperAdmin can soft-delete.

### 6.6 Patient dashboard (aggregated view)

- **FR-400 — Aggregated reports query.** When a patient loads their dashboard, the system MUST return all non-deleted reports across all labs for that patient, joined with each report's lab `name`, `licenseNumber`, and current `status` (so a suspended lab's reports still render with a "(Suspended)" label).
- **FR-401 — Trend chart.** The chart MUST plot every report as a point on a time axis (`reportDate`), with values normalized to `mg/dL` for the y-axis. Each point MUST be color-coded by lab; the legend MUST show lab name → color mapping. Unit normalization formula: `mmol/L × 18.0182 ≈ mg/dL`. The normalization MUST be visible on hover ("142 mg/dL — original 7.9 mmol/L"). Color palette MUST be the Paul Tol "Bright" qualitative scale, which is colorblind-safe: `#4477AA` (blue), `#EE6677` (red), `#228833` (green), `#CCBB44` (yellow), `#66CCEE` (cyan), `#AA3377` (purple), `#BBBBBB` (grey), `#000000` (black). Assignment of color to lab is by `hash(labId) % 8` so a given lab gets a stable color over time. If a patient has visited more than 8 labs, the 9th and later cycle the palette; the legend's lab-name → color mapping disambiguates collisions. Each point MUST also have a non-color visual cue (shape: circle, triangle, square, diamond, etc., chosen by `hash(labId) % 4`) so the chart degrades gracefully if printed monochrome.
- **FR-402 — Filter chips.** Above the chart, chips MUST allow filtering to **All labs** (default) or any single lab the patient has visited. Selecting a single lab MUST hide other labs' points and dim its chip's siblings. `MealContext` filter chips (`All` / `Fasting` / `PostMeal` / `Random`) MUST also be present — clinically apples-to-apples comparison is the goal.
- **FR-403 — Per-report cards.** Below the chart, a chronological list of cards (newest first) MUST show: lab name, report date, glucose value with unit (no normalization in the card — show what the lab recorded), meal context badge, status badge (`Final` / `Corrected`), notes (truncated to 1 line, expandable).
- **FR-404 — Empty state.** A patient with zero reports MUST see a clear empty state: "You have no reports yet. Visit one of our partnered labs to add your first reading." Partner lab listing is intentionally excluded from this state (marketing-adjacent; deferred to a later release).
- **FR-405 — Most-recent highlight.** The single most recent report (across all labs, all meal contexts) MUST be visually highlighted at the top of the page (large value, lab name, date, time-since-test in human terms). Rounding bands for the "time-since-test" string:

  | Elapsed | Rendered as |
  |---|---|
  | < 1 minute | "just now" |
  | 1–59 minutes | "N minutes ago" |
  | 1–23 hours | "N hours ago" |
  | 24–47 hours | "yesterday" |
  | 2–6 days | "N days ago" |
  | 7–27 days | "N weeks ago" |
  | 28 days – 11 months | "N months ago" |
  | ≥ 1 year | "N years ago" |

### 6.7 Authentication & session

- **FR-500 — JWT payload v2.** All JWTs issued by this release MUST include: `sub` (user id), `phone`, `role` (enum: `SuperAdmin` / `LabAdmin` / `Patient`), `labId` (Object id when role is `LabAdmin`; `null` for the other two roles), `name`, `iat`, `exp`.
- **FR-501 — Patient OTP.** Patient login MUST remain phone + static OTP `123456`. JWT lifetime: 24h. _(Real SMS OTP is out of scope.)_
- **FR-502 — Admin password login.** SuperAdmin and LabAdmin login MUST be phone + bcrypt-verified password. JWT lifetime: 1h. Tokens MUST refresh transparently when a request arrives within the last 15 minutes of validity.
- **FR-503 — Active-status check on every request.** Every authenticated API call MUST validate that the user is `Active` and (for LabAdmins) that their lab is `Active`. A suspended user or lab MUST receive `401`/`403` regardless of JWT validity.
- **FR-504 — Demo OTP banner.** In non-production environments (`NODE_ENV !== 'production'`), the patient login screen MUST display a clearly visible banner: "Demo mode — OTP is `123456`." In production, this banner MUST be hidden; the static-OTP behavior MUST emit a CRITICAL-level log line at server startup that is monitored. `[NOTE FOR PM: this is a deliberate pragmatic posture for v1 — the server does NOT refuse to start in production with static OTP, unlike FR-505's missing-secret check. Revisit when real SMS OTP is added; at that point, static OTP in production becomes a refuse-to-start condition.]`
- **FR-505 — Bootstrap SuperAdmin.** On a fresh install, exactly one SuperAdmin MUST be seeded via environment variables (`SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD`). If the env vars are missing in production, the application MUST refuse to start. The bootstrap SuperAdmin MUST be required to change their password on first login (FR-111 applies).

### 6.8 Tenant scoping (cross-cutting enforcement)

- **FR-600 — LabScopeInterceptor.** A NestJS interceptor MUST inspect the JWT on every request and, for `LabAdmin` role, MUST inject `labId` into the query filter for any service method that queries lab-scoped collections (Reports, PatientLabLinks, Patients indirectly via links). Service methods MUST NOT need to remember to add the filter manually.
- **FR-601 — Defense-in-depth assertion.** Every lab-scoped service method MUST also assert in code that the result set's `labId` matches the requester's `labId` (a paranoid double-check; an assertion failure is a security incident).
- **FR-602 — SuperAdmin bypass.** SuperAdmin requests MUST bypass the `LabScopeInterceptor` (they need to see everything). SuperAdmin queries MUST log a `cross-tenant-read` audit entry for any single-lab data access.
- **FR-603 — Patient scope.** Patient queries MUST be scoped to `patientId = req.user.sub`, never to a `labId`. (Patients see the union, not the intersection.)

### 6.9 Audit log

- **FR-700 — What gets audited.** Every write operation (lab create/edit/suspend, lab admin create/disable/password-reset, patient create, patient-lab link, report create/edit/soft-delete, login success, login failure) MUST be recorded. Sensitive reads MUST also be recorded: LabAdmin viewing patient list (action = `patient-list.read`), Patient viewing report list (action = `patient.reports.read`). Patient list views by LabAdmins MUST include the search term if any.
- **FR-701 — Audit fields.** Each entry MUST capture: `actorId`, `actorRole`, `labId` (the lab whose data was touched; null for SuperAdmin platform-level actions), `action` (enum-like string), `targetType` + `targetId` (when applicable), `details` (free-form JSON: e.g. for "report.update" includes before/after of changed fields), `ipAddress`, `userAgent`, `createdAt`.
- **FR-702 — Audit retention.** Audit entries MUST NOT be deletable from the application. Retention period: 24 months minimum. Cleanup MUST be a separate operational job, not user-triggered.

### 6.10 Migration from single-tenant

- **FR-800 — Default Lab.** A migration script MUST create a single `Lab` named "Default Lab" with status `Active`, the placeholder license number `MIGRATION-DEFAULT-0001` (which satisfies FR-101's uniqueness invariant as a sentinel value), and a flag `isMigrationDefault: true`. The SuperAdmin MUST be prompted at first login after migration to replace the placeholder with the real license number before the lab is used for net-new partner activity.
- **FR-801 — Existing admin migration.** The currently-seeded admin (phone `9999942496`) MUST be promoted from the old `Admin` role to `LabAdmin`, assigned to the Default Lab. The admin's password MUST remain valid (no forced reset for the existing admin — this would lock the user out of a production system).
- **FR-802 — Existing reports migration.** Every existing Report MUST be back-filled with `labId = Default Lab.id`. Every existing Patient referenced by those reports MUST get a `PatientLabLink` to the Default Lab.
- **FR-803 — Migration idempotence.** The migration script MUST be safe to re-run; a second invocation MUST be a no-op.
- **FR-804 — Migration rollback plan.** A rollback script MUST exist that drops `labId` columns (or in Mongo, unsets the field), drops the `PatientLabLink` collection, and reverts the migrated admin's role. The rollback MUST be documented but not required to be tested in production.

### 6.11 Cross-cutting UI

- **FR-900 — Top-bar identity.** Every authenticated screen MUST show the logged-in user's name, role, and (for LabAdmin) lab name in the top bar. SuperAdmin sees "Platform Admin." Patient sees their own name only. Lab names longer than 24 characters MUST be truncated with a trailing ellipsis; full name MUST appear on hover/tooltip. If the LabAdmin's lab is `Suspended`, the top bar MUST show a `Suspended` badge adjacent to the lab name; clicking the badge MUST surface a "Contact platform admin" message.
- **FR-901 — Role-based routing.** A logged-in user attempting to access a screen outside their role MUST be redirected to their role's home (`/super` for SuperAdmin, `/panel` for LabAdmin, `/dashboard` for Patient). Unauthenticated users MUST be redirected to `/login`.
- **FR-902 — Logout.** Every authenticated screen MUST expose a logout action that clears the JWT from local storage and redirects to `/login`.
- **FR-903 — Empty / error states.** Every list view MUST have a designed empty state (no rows yet) and a designed error state (API failure, with a retry action).
- **FR-904 — Loading states.** Every async fetch MUST show a loading indicator (skeleton or spinner) within 100ms of the request starting; no blank screens.

---

## 7. Non-Functional Requirements

### 7.1 Security

- **NFR-S1.** All API traffic MUST be HTTPS in non-development environments.
- **NFR-S2.** Passwords MUST be bcrypt-hashed with cost factor ≥ 12. Password fields MUST be excluded from API responses (`select: false`).
- **NFR-S3.** JWT secret MUST be supplied via environment variable; the app MUST refuse to start in production with a default/missing secret.
- **NFR-S4.** No PII (phone, name, DOB) MUST appear in URL paths or query parameters; use POST bodies or auth-scoped derivation.
- **NFR-S5.** Login endpoints MUST be rate-limited per IP and per phone number (e.g. 5 attempts per 5 minutes) to thwart credential stuffing and OTP guessing — even though OTP is static, the rate limit prevents log-flooding.
- **NFR-S6.** Standard OWASP Top 10 protections: input validation on all DTOs (`class-validator`), Mongoose schema strictness `throw`, no string concatenation in queries.
- **NFR-S7.** Tenant scoping (FR-600/601) MUST have automated tests asserting that a LabAdmin cannot retrieve any record with another lab's `labId`. CI MUST fail if any such test fails.

### 7.2 Privacy (DPDP-inspired hygiene; no certification target in v1)

- **NFR-P1.** At first login, the patient MUST acknowledge the platform terms-of-service in a one-screen modal ("By using this service you accept the Terms of Service, which describe how your test results are stored and shared across visited labs."). Acknowledgment MUST be recorded in the audit log with timestamp. _This is a terms-of-service acknowledgment, not a consent gate — service availability is not conditioned on decline; the patient sees the terms once and then proceeds._
- **NFR-P2.** Cross-lab match dialog (FR-201) MUST disclose only the patient's `name` and `dateOfBirth`. Address, prior reports, other linked labs, and any other patient attribute MUST NOT be disclosed. Every match-dialog impression MUST be audited (searched phone, matched patientId, outcome = linked / cancelled).
- **NFR-P3.** Audit log MUST capture access to patient data so a SuperAdmin can answer "who looked at this patient and when?" within 24 months of the event.
- **NFR-P4.** Data at rest in MongoDB MUST use WiredTiger storage-engine encryption with a local keyfile. Keyfile location, permissions, and rotation policy MUST be documented in the deployment runbook. Self-hosted MongoDB is the v1 baseline; migration to a managed service with KMS-managed keys is deferred to a later release.

### 7.3 Performance

- **NFR-Pe1.** Patient dashboard initial load MUST complete in ≤ 2s on a typical 4G connection for patients with ≤ 100 reports.
- **NFR-Pe2.** LabAdmin patient search MUST return results within 500ms p95 on a lab with ≤ 5,000 linked patients.
- **NFR-Pe3.** Report create round-trip (form submit → success toast) MUST complete in ≤ 1s p95.
- **NFR-Pe4.** Indexes MUST exist on: `Report.{labId, patientId, reportDate}`, `Report.{patientId, reportDate}`, `PatientLabLink.{labId, patientId}` (unique), `User.phone` (unique).

### 7.4 Availability

- **NFR-A1.** Target uptime: 99.5% monthly for v1. _(Higher targets deferred to a later release with proper HA infrastructure.)_
- **NFR-A2.** Backups: daily MongoDB snapshot, retained 30 days. Documented restore procedure.

### 7.5 Accessibility

- **NFR-Ac1.** Patient-facing screens (login, dashboard, report cards) MUST meet WCAG 2.1 Level AA: color contrast ≥ 4.5:1, all interactive elements keyboard-accessible, all images and chart points have text alternatives.
- **NFR-Ac2.** Chart color palette MUST be distinguishable by users with the most common color-vision deficiencies (deuteranopia / protanopia). Pair color with shape or label, not color alone.

### 7.6 Observability

- **NFR-O1.** Structured logs (JSON) for every request: request id, user id, lab id, route, status, duration.
- **NFR-O2.** Error tracking integration (e.g. Sentry) — every 5xx response and every unhandled exception MUST be captured.
- **NFR-O3.** Key business counters MUST be emitted as metrics: `reports.created`, `patients.linked`, `labs.suspended`, `login.success`, `login.failure`, `lab.first-report.recorded` (supports the §8.2 activation metric), `tenant-scope-assertion.failure` (latter is a security alert).

### 7.7 Data integrity

- **NFR-D1.** Phone number normalization: stored canonically (digits only, with country code prefix). Login lookups MUST normalize input before query.
- **NFR-D2.** All foreign-key fields MUST be indexed; orphan-checking CI test MUST fail the build if any report references a non-existent patient or lab.
- **NFR-D3.** Soft-deletes (reports) MUST never cascade — patients are never soft-deleted in v1.

---

## 8. Success Metrics & Counter-Metrics

### 8.1 North-star

- **% of active patients who have results from ≥ 2 labs within 90 days of their account's first activity.** Target by end of release + 6 months: ≥ 25%. This is the metric that captures the platform's distinctive value vs a single lab's own portal.

### 8.2 Activation

- **% of onboarded labs that record ≥ 10 reports within 30 days of activation.** Target: ≥ 80%. Below this, lab onboarding isn't sticking.
- **Time-to-first-report after LabAdmin creation.** Target median ≤ 24h, p90 ≤ 7d.

### 8.3 Engagement

- **% of patients who log in within 7 days of a new report being recorded for them.** Target: ≥ 50%.
- **Median reports per active lab per week.** Watched metric — informs scaling.

### 8.4 Trust

- **Report correction rate** (`Corrected` reports / total reports). Target: ≤ 2%. Higher signals data-entry UX issues.
- **Patient-reported "wrong patient linked"** complaints, tracked via support. Target: ≤ 1 per 1,000 link events.

### 8.5 Counter-metrics (what to watch for downside)

- **Tenant-scope-assertion failures.** Target: 0. **Any non-zero value is a P0 incident.**
- **Login failure rate per lab admin.** Spike may indicate compromised credentials or a UX regression.
- **Unique patients linked to ≥ 5 labs in < 30 days.** Anomaly signal — could indicate identity reuse or fraud; investigate manually.
- **Time-to-load patient dashboard for top-decile patients (most reports).** Watch as reports grow; pagination/aggregation refactor needed if it crosses 4s.

---

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Forgotten `labId` filter in a new service method silently leaks data. | `LabScopeInterceptor` + per-method assertion (FR-600/601) + CI test (NFR-S7). |
| R2 | Phone-number collision on patient create races with cross-lab link flow. | Unique index + retry-and-merge logic (FR-203). |
| R3 | Patient confusion when two labs report different glucose values close in time. | Per-report cards show lab + meal context + unit transparently; trend chart filter chips let patient slice by lab and meal context (FR-402). |
| R4 | LabAdmin links the wrong patient by typo on phone, exposing one patient's identity to a lab they didn't visit. | Confirmation dialog discloses name + DOB (FR-201, NFR-P2) so LabAdmin can verify against the person physically present. Every match-dialog impression is audited so suspicious lookup patterns can be investigated by SuperAdmin. |
| R5 | Suspended-lab JWTs continue to grant access until expiry. | FR-503 active-status check on every request neutralizes this. |
| R6 | Bootstrap SuperAdmin credentials in env vars get committed to repo by accident. | Doc + `.env.example` only; CI secret-scan; deployment runbook. |
| R7 | Mongo schema migrations are not atomic — `labId` back-fill could partially complete. | FR-803 idempotent migration; pre-flight count + post-flight count assertions. |

_No open questions remain at finalization. See §15 Assumptions Index for the audit trail of every assumption and open question that was resolved during this PRD's lifecycle._

---

## 10. Phased Rollout

Recommendation: ship as **one release with a feature flag for the legacy single-tenant path** to allow rollback. Sub-phases inside the release:

1. **Phase A — Backend skeleton (no UI changes):**
   - New schemas: `Lab`, `PatientLabLink`. Add `labId` to `User`, `Report`, `AuditLog`.
   - JWT payload v2 (FR-500). `LabScopeInterceptor` (FR-600).
   - Migration script (FR-800–803). Run on staging, verify counts.
2. **Phase B — SuperAdmin console:**
   - `/super` routes, lab + lab admin CRUD, metrics tiles.
3. **Phase C — LabAdmin retrofit:**
   - `/panel` rebuilt: patient search, first-visit linking, enhanced glucose form, lab-scoped drawer.
4. **Phase D — Patient dashboard upgrade:**
   - Aggregated query, color-coded chart, filter chips, per-report cards, empty state, demo OTP banner.
5. **Phase E — Cutover:**
   - Run migration on production. Switch flag. Monitor `tenant-scope-assertion.failure`, login error rates, dashboard load p95 for 48h.

---

## 11. Migration Plan (summary — full runbook in addendum)

1. Schedule a 30-min maintenance window (low-traffic, communicated to existing admin).
2. Snapshot Mongo before any migration.
3. Run migration script (FR-800–803) — creates Default Lab, promotes admin, back-fills reports + links.
4. Deploy new application code with feature flag ON for multi-tenant routes.
5. Verify: counts match, existing admin can log in, existing patient dashboards render unchanged.
6. If anything fails: revert app version (rollback flag), restore from snapshot if data was modified.

---

## 12. Out of Scope (confirmed for this release)

- Additional report types beyond glucose (architecture must accommodate)
- Doctor / Physician role
- Billing, subscriptions, lab-paid plans
- White-labeling / per-lab branding
- Real SMS / email OTP delivery
- PDF report generation / download
- Patient self-deletion / data-export UI
- Public lab sign-up (all labs SuperAdmin-curated)
- Cross-lab read access for LabAdmins
- LabAdmin reassignment across labs (use disable + recreate)
- Compliance certification target (DPDP / HIPAA formal posture)
- Patient account disable/suspend (patient status is implicitly always `Active` in v1)

---

## 13. Glossary

### 13.1 Entities

- **Lab** — a partnered diagnostic facility operating an account on the platform. Owns its own LabAdmins and its own report records.
- **LabAdmin** — a clinical operator at a lab; enters reports and manages that lab's patient list.
- **SuperAdmin** — a platform-level operator with full read access across all labs and write access on lab/admin configuration.
- **Patient** — an end consumer of test results. Singular global identity; visits zero-or-more labs over time.
- **PatientLabLink** — the many-to-many record asserting "this patient has visited this lab at least once." Created at first visit; never deleted in v1.
- **Default Lab** — the seeded lab to which existing single-tenant data is migrated.

### 13.2 Status states

- **Lab.status** — `Active` (default; logins permitted, new patients linkable, reports visible to patients) | `Suspended` (set by SuperAdmin; no logins, no new links, reports remain visible to patients).
- **LabAdmin.status** — `Active` (default) | `Disabled` (set by SuperAdmin per FR-113; login blocked, all API access blocked).
- **SuperAdmin.status** — always `Active` in v1; SuperAdmin disable/removal is OOS (the role is held by 1–3 internal employees only).
- **Patient.status** — always `Active` in v1; patient disable/suspend is OOS.
- **Report.status** — `Final` (default; immutable except for `Final → Corrected` transition per FR-302) | `Corrected` (mutable; the canonical record after a correction).
- **Report soft-delete** — a `deletedAt` timestamp set by FR-305. A soft-deleted report is invisible to LabAdmins, patients, and the trend chart, but remains in storage for audit.

---

## 14. Document Control

- **Status:** final
- **Created:** 2026-05-25
- **Finalized:** 2026-05-26
- **Owner:** Ajax
- **Facilitator:** John (PM)
- **Reviewer pass:** rubric walker — Grade: **Good** (0 critical, 2 high, 6 medium, 5 low — all addressed or accepted). See `review-rubric.md`.
- **Next phase:** UX design (`bmad-create-ux-design`) → Architecture (`bmad-create-architecture`) → Epics & Stories (`bmad-create-epics-and-stories`)

---

## 15. Assumptions Index

All inline `[ASSUMPTION — confirm]` tags and open questions from the draft pass have been resolved before finalization. The decision log (`.decision-log.md`) preserves the historical record.

### 15.1 Assumptions resolved

| Was tagged at | Original assumption | Resolution |
|---|---|---|
| §3.2 / §12 | Real SMS / email OTP out of scope for v1 | ✅ Confirmed OOS |
| §3.2 / §12 | PDF report download out of scope for v1 | ✅ Confirmed OOS |
| §3.2 / §12 | Patient self-deletion + data-export UI out of scope for v1 | ✅ Confirmed OOS |
| FR-115 | LabAdmin tied to one lab; reassignment via disable + recreate | ✅ Confirmed |
| FR-404 | Patient empty state does NOT list partner labs | ✅ Confirmed |

### 15.2 Open questions resolved at finalization

| Was open Q | Resolution |
|---|---|
| Show DOB in cross-lab match dialog? | ✅ **Yes — name + full DOB.** FR-201 and NFR-P2 updated accordingly. Tradeoff: mislink risk reduced; match-dialog impressions are audited (NFR-P2) so disclosure pattern is observable. |
| Show "first visit" date per lab on patient dashboard? | ✅ **No, deferred.** Per-report cards already convey lab + date adequately for v1. |

### 15.3 Deliberate flags preserved

The PRD carries two **`[NOTE FOR PM]`** callouts (FR-302 immutability-on-Final rule; FR-504 static-OTP-in-production posture). These are intentional posture flags — not open questions — left visible so they cannot be lost during downstream UX / architecture / story work.
