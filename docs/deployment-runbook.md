# LabDash Deployment Runbook — Multi-Tenant Cutover

Owner: Ajax · Last updated: 2026-05-26

## 0. Scope

This runbook covers the v1 single-tenant → multi-tenant cutover, plus the
ongoing operational procedures listed under AR-9 (encryption keyfile, JWT v2
grace window, migration cutover, demo-OTP warning, Sentry).

## 1. WiredTiger encryption-at-rest

### Initial provisioning

1. Generate a 32-byte random keyfile on the Mongo host:
   ```bash
   sudo openssl rand -base64 32 | sudo tee /etc/mongodb/encryption.key > /dev/null
   sudo chown root:root /etc/mongodb/encryption.key
   sudo chmod 0400 /etc/mongodb/encryption.key
   ```
2. Add to mongod.conf (`/etc/mongod.conf`):
   ```yaml
   security:
     enableEncryption: true
     encryptionKeyFile: /etc/mongodb/encryption.key
   ```
3. Restart mongod and confirm: `journalctl -u mongod | grep -i encryption`.

### Rotation (v1 manual procedure)

WiredTiger rotation requires a full dump → re-encrypt → restore. Plan a
maintenance window. KMS-integrated rotation is deferred to the managed-Mongo
epic.

## 1b. OTP-only login (post-cutover)

All three roles log in via phone + static OTP (`123456`) on per-role routes:
- `/auth/super/login` + `/auth/super/verify-otp` — SuperAdmin only
- `/auth/labadmin/login` + `/auth/labadmin/verify-otp` — LabAdmin/Admin only
- `/auth/patient/login` + `/auth/patient/verify-otp` — Patient only

Each endpoint returns 403 if the phone exists but belongs to a different role.
No passwords are stored. `SUPERADMIN_PHONE` is the only credential operators
need in production — that phone logs in with OTP `123456` to bootstrap the
console. Real SMS OTP is a separate epic.

## 2. JWT v2 grace-window cutover sequence

Phases must run in this order:

1. **Run multi-tenant migration** (`npm run migrate:up` in `backend/`).
   Verify pre-flight / post-flight counts match. Assert Default Lab exists,
   legacy admin role is `LabAdmin`, every Report has a `labId`.
2. **Deploy backend** with `JWT_V2_DEPLOY_TIMESTAMP` env var set to the deploy
   moment in ms (e.g. `JWT_V2_DEPLOY_TIMESTAMP=$(date +%s)000`). This anchors
   the 24h grace window. v1 tokens issued before deploy are accepted for 24h.
3. **Deploy frontend** which now requests v2 tokens.
4. **Watch the grace window**. After 24h, v1 tokens are rejected — users will
   be redirected to `/login` and re-issued v2 tokens.

### Rollback decision

If anything goes wrong inside the 24h window:
- App-layer rollback: `git revert` and redeploy. The migration's `down()` is
  the database-layer rollback (see §3).
- After 24h: rolling back is much harder — v2 tokens cannot be downgraded.
  Decide to revert the backend container only or to also restore the DB from
  the pre-migration snapshot.

## 3. migrate-mongo cutover playbook

### Pre-flight

Always take a snapshot before running `up()` in production:
```bash
mongodump --uri="$MONGODB_URI" --gzip --out /backup/$(date +%Y%m%d-%H%M)
```

### Run

```bash
cd backend
npm run migrate:status            # sanity check
npm run migrate:up                # one-shot retrofit
```

Inspect the script's stdout for `[pre-flight]` and `[post-flight]` counts.
They must match for `users` and `reports`.

### Rollback

```bash
npm run migrate:down
```

`down()` reverts:
- removes `labId`/`deletedAt`/`mealContext`/`unit` from Reports
- removes `labId` from AuditLogs
- drops PatientLabLink collection
- reverts legacy admin role from LabAdmin → Admin
- deletes the Default Lab document

If `down()` cannot complete cleanly, restore from the pre-cutover snapshot:
```bash
mongorestore --uri="$MONGODB_URI" --gzip --drop /backup/<timestamp>
```

## 4. Demo-OTP-in-production warning

When the backend starts in `NODE_ENV=production`, it emits this WARN log:

> WARNING: production deployment is using static patient OTP. This should be
> replaced with real SMS OTP before public launch.

This warning is **expected** in v1 and does not block startup (per PRD FR-504
with [NOTE FOR PM]). Real SMS OTP is a separate epic.

If the warning appears unexpectedly in staging without an explicit decision
to retain static OTP, treat it as a config error and investigate before
proceeding.

## 5. Sentry DSN

1. Provision a Sentry project per environment.
2. Set `SENTRY_DSN` env var on the backend container (`@sentry/node`).
3. Set `NEXT_PUBLIC_SENTRY_DSN` on the frontend build (`@sentry/nextjs`).
4. Alert rules: see §7. Without `SENTRY_DSN`, the SDK is a no-op.

## 6. Backup + restore drill (Story 6.3)

Daily backup procedure (cron on the Mongo host):
```bash
0 2 * * * /usr/local/bin/mongodump-cron.sh
```
Where `mongodump-cron.sh` writes a `mongodump --gzip` to S3 (or equivalent)
with a 30-day retention policy. Encrypt the bucket at rest.

Drill cadence: **quarterly**. Steps:
1. Take a current snapshot in S3.
2. Spin a fresh staging instance.
3. Restore the snapshot via `mongorestore`.
4. Start the backend against the restored DB; smoke-test login + a fetch.
5. Record drill timing in `docs/drill-log.md`.

## 7. `tenant-scope-assertion.failure` — P0 incident

This metric is **load-bearing** — any non-zero rate means cross-tenant data
might be leaking. PagerDuty alert rule: page on-call immediately on a single
event.

### Triage

1. Pull the offending request from structured logs by `requestId`.
2. Confirm the offending tenant context vs the document's actual `labId`.
3. Pause writes to the affected collection if uncertain.
4. File post-mortem within 24h.

## 8. Metrics counters (Story 6.4)

Backend emits via `MetricsService.increment()` to stdout. Required dashboards:

- `login.success` / `login.failure` (split by `role`, `reason`)
- `reports.created` (split by `labId`)
- `patients.linked` (split by `labId`)
- `labs.suspended`
- `lab.first-report.recorded` (split by `labId`)
- `tenant-scope-assertion.failure` — **alert on any non-zero rate**
- `audit.write.failure` — alert on any spike

## 9. Pre-launch checklist

- [ ] All CI gates green (unit, e2e, migration-roundtrip, orphan-check, audit-presence-lint)
- [ ] WiredTiger encryption verified active in production
- [ ] `JWT_SECRET` ≥32 chars, rotated for production
- [ ] `SUPERADMIN_PHONE` set in production (login is phone + OTP — no password)
- [ ] `SENTRY_DSN` set; Sentry alerts wired to on-call
- [ ] Backup cron running; restore drill completed in past 90 days
- [ ] Staging cutover dry run completed (Story 6.7)
- [ ] Operator sign-off recorded
