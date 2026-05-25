# PRD Quality Review — Multi-Tenant Lab Segregation (iqline-reports-app)

## Overall verdict

This is a high-substance, decision-ready PRD: the invariant ("a patient becomes visible to a lab only after their first visit") is named in §1, threaded through FRs (FR-200–205, FR-600–603), and shows up as the #1 counter-metric (tenant-scope-assertion failures = P0). FRs are concrete and largely testable, scope omissions are explicit, and brownfield context (current code, migration, rollback) is honest. The main risks lie in a thin Privacy posture that gestures at DPDP without committing (NFR-P1–P4), a few load-bearing UX terms left undefined ("color-coded by lab" with no palette source-of-truth), and several `[ASSUMPTION — confirm]` tags still open on a launch-grade PRD that flags itself "ready" for downstream UX/Arch handoff.

## Decision-readiness — strong

The PRD is unusually direct for a brownfield retrofit. Choices are stated as choices: "Strict isolation … not by convention" (§3.1), "Suspension is the disable mechanism. _(Hard delete deferred — would orphan reports.)_" (FR-106), "Patient OTP = static `123456`. … _(Real SMS OTP is out of scope.)_" (FR-501). Trade-offs are surfaced with what was given up — e.g., FR-303 enforces no cross-lab visibility "at the query layer … NOT only at the UI layer," and FR-801 explicitly *does not* force a password reset on the existing admin because it "would lock the user out of a production system." Open Questions in §9 (Q1–Q4) are genuinely open: Q1 (show DOB in cross-lab match dialog) names the privacy-vs-mislink-rate tension and proposes a revisit trigger ("if mis-link rate is non-trivial").

What's missing: there is no `[NOTE FOR PM]` callout anywhere despite multiple real tensions — e.g., FR-302's "edit only if status is Corrected, OR the update IS the transition `Final` → `Corrected`" is a non-obvious workflow constraint that should be flagged for PM confirmation, and the static-OTP-in-production behavior (FR-504: "a clearly logged warning at server startup if ever active in production") is a posture decision rather than a guardrail and merits a `[NOTE FOR PM]`. The decision log lists these as user-confirmed, but a downstream reader of the PRD alone won't see them as live.

### Findings
- **medium** Missing `[NOTE FOR PM]` on production static-OTP behavior (FR-504) — "a clearly logged warning at server startup if ever active in production" treats a security-relevant posture as a runtime log, not a build-time block; deserves explicit PM-attention marker. *Fix:* add `[NOTE FOR PM: confirm whether static OTP in production is a refuse-to-start condition like FR-505's missing-secret check, or only a warning.]`
- **low** Edit-window rule in FR-302 (`Corrected`-only edits) is buried — clinically significant and engineering-significant; should be a `[NOTE FOR PM]`. *Fix:* annotate with PM callout and add an example timeline to the FR.

## Substance over theater — strong

Persona count is correct (3) and each persona drives FRs: SuperAdmin → §6.1–6.3, LabAdmin → §6.4–6.5, Patient → §6.6. The "Frequency" and "Sophistication" lines for LabAdmin ("Many sessions per day, often dozens of report entries per session. Speed and accuracy … is the #1 UX driver") visibly drive UJ-2's click/keystroke budget ("Total clicks: 4. Total typed characters: 10 (phone) + 3 (glucose value)") — this is the rare PRD where persona substance is auditable in the requirements.

Differentiation is asserted in the North-star (§8.1) — "the metric that captures the platform's distinctive value vs a single lab's own portal" — and matches the patient-aggregation thesis. NFRs mostly avoid boilerplate: NFR-Pe1–Pe3 give concrete latency budgets with the cohort the budget applies to, NFR-Pe4 names actual indexes by collection+field, NFR-S5 names a rate-limit threshold ("5 attempts per 5 minutes").

Weak spots:
- NFR-P1 (consent modal) reads as compliance furniture: it captures a checkbox but the PRD doesn't say what happens if the patient *declines* the consent — does the dashboard fail closed? Is there a withdraw-consent flow? Without that, consent capture is theater.
- NFR-P4 ("Data at rest in MongoDB MUST use the storage engine's at-rest encryption … MUST be documented in the deployment runbook") shifts the actual requirement to a runbook that doesn't exist yet.

### Findings
- **high** Consent capture is incomplete (NFR-P1) — "a one-time modal" with no decline path, no withdrawal flow, no statement of what data processing requires consent vs. is contract-necessary. *Fix:* either state "consent is informational only, not a gate" and remove "consent" framing, or specify decline behavior and a withdrawal flow.
- **medium** NFR-P4 punts encryption-at-rest to a non-existent runbook. *Fix:* state which deployment target (e.g., MongoDB Atlas with KMS) is the v1 baseline, or downgrade to "SHOULD" with a tracked follow-up.

## Strategic coherence — strong

The thesis is explicit in §1 ("the defining invariant … is the privacy contract we make with both labs and patients") and again in §2.2 ("Doing the multi-tenant work before the next report type … is far cheaper than retrofitting after"). The MVP shape is platform — and the scope logic matches: backend interceptor + migration + three role consoles, no new report types, no monetization. Feature prioritization in §10's phased rollout (Phase A backend skeleton → B SuperAdmin → C LabAdmin → D Patient → E cutover) follows the dependency arc, not whoever-shouted-loudest.

Success metrics validate the thesis (§8.1's north-star is cross-lab share, not just DAU), and counter-metrics (§8.5) include the tenant-scope-assertion failure as P0 and a fraud-detection signal ("Unique patients linked to ≥ 5 labs in < 30 days"). These earn their place.

One coherence gap: §8.2 ("Time-to-first-report after LabAdmin creation. Target median ≤ 24h, p90 ≤ 7d") measures lab activation behaviour but no FR captures the operational hooks needed to measure it (e.g., emitting a `lab.activated` event tied to first report). NFR-O3 lists business counters but not this one.

### Findings
- **low** §8.2 activation metric ("Time-to-first-report after LabAdmin creation") has no corresponding emit in NFR-O3's counter list. *Fix:* add `lab.first-report.recorded` (or similar) to NFR-O3.

## Done-ness clarity — adequate

Most FRs are testable. FR-201 ("UI MUST present a confirmation dialog showing only the patient's `name`. (No DOB, no other PII…)") is unambiguous. FR-301's auto-stamp list is enumerated. FR-303's enforcement layer is named. FR-401 includes the exact normalization formula ("`mmol/L × 18.0182 ≈ mg/dL`") and the hover behavior. FR-402 specifies default state and dim behavior. FR-204's idempotence is explicit.

Where the bar slips:
- FR-205 — "No other patients MUST appear, even if they share a phone-number area code or any other attribute." — "any other attribute" is gestural; the testable form is "scope = `PatientLabLink.labId == requester.labId`" full stop. The current wording invites a reader to wonder about edge attributes that aren't real.
- FR-405 — "human terms — '3 days ago'" — no spec for the rounding boundaries (when does "yesterday" flip to "2 days ago"? when does "3 weeks ago" become "1 month ago"?). Story-creation will improvise.
- FR-900 — "lab name in the top bar … SuperAdmin sees 'Platform Admin.'" — no spec for truncation of long lab names, no spec for the suspended-lab badge in top bar (vs only in the SuperAdmin table per FR-104).
- FR-902 — "clears the JWT from local storage" — ignores any sessionStorage / cookie path; localstorage is a current-code assumption, fine to state, but should be the *only* storage location asserted (or this becomes an architecture surprise).
- NFR-Ac2 ("distinguishable by users with the most common color-vision deficiencies") — gives the principle but no palette and no test (e.g., "run color-blindness simulator on the chart, must not produce two adjacent points within ΔE < X").

### Findings
- **medium** "Color-coded by lab" (FR-401, FR-402, UJ-5) is load-bearing for the Patient persona but has no palette source-of-truth, no max-lab-count guidance, and no fallback when a patient has visited >N labs. *Fix:* specify palette (e.g., 8-color colorblind-safe ordinal scale), and define overflow behavior ("if patient has visited >8 labs, hash bucket the remainder").
- **medium** FR-405 "human terms" rounding bounds undefined. *Fix:* tabulate the bands ("< 1 min: just now; 1–59 min: N minutes ago; …; > 30 d: short date") or reference a library.
- **low** FR-205 "any other attribute" wording is gestural. *Fix:* rewrite as a positive scope rule.
- **low** FR-900 needs truncation + suspended-lab badge spec for the top bar.

## Scope honesty — adequate

§3.2 and §12 explicitly list non-goals. `[ASSUMPTION — confirm]` tags are placed on inferred decisions (FR-115, FR-404, three items in §3.2/§12), and the decision log roundtrip works — every `[ASSUMPTION]` in the PRD corresponds to a decision-log entry marked `[ASSUMPTION]` (lines 19–22 of the decision log).

Two structural issues:
1. The PRD's status header says `status: draft` and §14 lists "Reviewers (pending)" — yet the same section names the next phase as "UX design → Architecture → Epics & Stories," signalling green-light intent. A launch-grade PRD that still carries `[ASSUMPTION — confirm]` tags on scope (FR-115, FR-404, three §12 items) is mixing "ready for handoff" with "still has open scope decisions." Either resolve the assumptions before handoff or downgrade the readiness signal.
2. There is no Assumptions Index section. The rubric calls for `[ASSUMPTION]` tags "indexed at the end." The decision log partially fulfills this, but it's a separate file (`.decision-log.md`) and a downstream reader of `prd.md` alone won't find an index.

Open-items density is moderate (4 Open Questions, ~6 `[ASSUMPTION]` tags) — fine for a launch-grade PRD if the assumptions get cleared in the Finalize pass.

### Findings
- **high** No Assumptions Index section in `prd.md` — every inline `[ASSUMPTION — confirm]` should roll up at the end for the PM's clearing pass. *Fix:* add `## 15. Assumptions Index` listing each tag, its location, and clearing-criterion.
- **medium** Status/readiness mismatch — `status: draft` + open `[ASSUMPTION — confirm]` tags + "Next phase: UX design" together send a mixed signal. *Fix:* either resolve the four `[ASSUMPTION — confirm]` items before handoff or change `status` to `awaiting-resolution`.

## Downstream usability — adequate

Glossary (§13) defines the six core terms (Lab, LabAdmin, SuperAdmin, Patient, PatientLabLink, Default Lab) and they are used consistently in FR text. FR / UJ / NFR IDs follow a clean banded scheme (FR-1xx labs, FR-2xx patients, FR-3xx reports, FR-4xx patient view, FR-5xx auth, FR-6xx scoping, FR-7xx audit, FR-8xx migration, FR-9xx UI). NFR prefixes are consistent (NFR-S, P, Pe, A, Ac, O, D).

UJs are labelled UJ-1 through UJ-7 and each names a persona. Cross-references mostly resolve — e.g., FR-104(b) → NFR-3.2 is actually a typo (NFR-3.2 doesn't exist; the active-status check is NFR-S-adjacent and lives in FR-503). FR-104(b) also says "see NFR-3.2 for token revocation" but no NFR addresses token revocation; FR-503 ("Active-status check on every request") is the real referent.

Other usability gaps:
- "Active" appears as a status on Lab (FR-101), LabAdmin (FR-110), Patient implicitly. Glossary doesn't define the state machine.
- "Corrected" vs "Final" status transition rule lives in FR-302 only; the Glossary doesn't define the enum.
- Phase A in §10 says "Add `labId` to `User`, `Report`, `AuditLog`" but `User.labId` is only meaningful for LabAdmin — this nuance is captured in FR-500 (`labId` is "null for the other two roles") but a careless schema reader could assume `User.labId` is required.

### Findings
- **medium** Broken cross-reference: FR-104(b) refers to "NFR-3.2 for token revocation" — NFR-3.2 doesn't exist; intended target is FR-503. *Fix:* change reference to FR-503.
- **low** Glossary doesn't define status enums (Lab: Active/Suspended; User: Active/Disabled; Report: Final/Corrected; Report `deletedAt`). *Fix:* add a "Status states" subsection in §13.
- **low** Patient implicit "Active" state — no FR defines patient disable/suspend. If patient can never be disabled in v1, state it as a non-goal.

## Shape fit — strong

This is a multi-stakeholder B2B+B2C product with meaningful UX (LabAdmin entry speed, Patient comprehension) — UJs and personas are appropriately load-bearing and not overspec'd (7 UJs for 3 roles is right-sized). It is brownfield, and the PRD honors that: §2.1 cites the exact source-of-truth (`backend/src/common/enums/user-role.enum.ts`), §2.3 lists what stays unchanged, §6.10 migration and §11 migration plan address the existing data. The PRD distinguishes new flows from existing flows (e.g., FR-801 explicitly keeps the existing admin's password to avoid lockout).

It is also chain-top — explicitly feeds UX → Architecture → Stories per §14 — so downstream usability matters more, which is why the Assumptions Index gap and the broken cross-ref are real findings, not nits.

No findings — shape is correctly calibrated.

## Mechanical notes

- **Glossary drift:** "Active" / "Suspended" / "Disabled" / "Final" / "Corrected" / "Deleted" used as enum-like statuses but not defined in §13. "lab admin" (lowercase, two words) appears in FR-110 next to "LabAdmin" (PascalCase) elsewhere — consider tightening.
- **ID continuity:** FR bands are clean. NFR IDs are clean. UJ-1 through UJ-7 contiguous. No duplicates spotted.
- **Cross-references:** FR-104 references "NFR-3.2" — does not exist (see Downstream usability finding). §9 row R5 references FR-503 correctly. FR-111 ("FR-111 applies") is referenced inside FR-505 — resolves.
- **Assumptions Index roundtrip:** No `## Assumptions Index` section in `prd.md`. The `.decision-log.md` lists `[ASSUMPTION]` entries (lines 19–22) but the inline tags in the PRD (FR-115, FR-404, three §12 items, and the §3.2 items) are not indexed in the document itself. Roundtrip is partial via the side file but a reader of `prd.md` alone cannot enumerate the open assumptions.
- **UJ persona linkage:** UJ-1 ("SuperAdmin"), UJ-2/3/4/7 ("LabAdmin" / "SuperAdmin"), UJ-5/6 ("Patient") — every UJ uses an exact persona label from §4. Clean.
- **Required sections:** Executive Summary, Background, Goals/Non-Goals, Personas, UJs, FRs, NFRs, Success Metrics, Risks/Open Q, Phased Rollout, Migration Plan, OOS, Glossary, Document Control — present. Assumptions Index missing. UX mockups / wireframes pointer absent but acceptable (next phase is UX).
