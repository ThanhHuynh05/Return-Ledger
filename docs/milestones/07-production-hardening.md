# Milestone 7: Production hardening

[Roadmap](./README.md) | [Previous](./06-hosted-demonstration.md)

Status: Planned. A hosted demonstration is a prerequisite, not proof that this milestone is complete.

## Goal

Demonstrate that real merchant operations can be supported with defined access controls, reliability targets, recoverable data, and operational ownership.

## Checkpoint 7A: Define measurable operating requirements

### 7.1 Agree on workload and service targets

Record expected organizations, daily records, peak webhook rate, file size, concurrent reviewers, retention, and important query sizes.

Set availability, processing-freshness, recovery-time, and recovery-point targets with the intended operator.

Verify: each target has an owner and a measurement method. Proposal numbers are not presented as measured capacity.

### 7.2 Measure realistic workloads

Use synthetic datasets representative of the agreed workload. Measure API latency, run/import duration, inbox age, database connections, memory, and storage.

Identify indexes and bounded batch/concurrency limits from the results.

Verify: results are repeatable and include dataset, environment, application version, and bottlenecks.

### 7.3 Separate deployment privileges

Review migration, runtime, worker, and operational identities. Limit normal access to the actions required by each process.

Enforce ledger/audit write restrictions and controlled access to replay and demonstration resets.

Verify: the actual runtime role cannot rewrite posted financial history, and production has no ordinary demo-reset endpoint.

Suggested checkpoint: documented operating targets and privilege matrix.

## Checkpoint 7B: Prove recovery

### 7.4 Configure database backups

Select backup frequency, retention, encryption/access, and point-in-time recovery where needed to meet the agreed recovery point.

Monitor backup failures and storage limits.

Verify: a backup is available through a controlled recovery process, not merely listed as enabled.

### 7.5 Restore into an isolated environment

Restore a representative backup into a separate database. Check record counts, financial projections, investigation history, and queued processing state.

Measure elapsed recovery time and the actual recoverable point.

Verify: results satisfy the targets or identify a remediation before launch.

### 7.6 Rehearse migration and release recovery

Test migrations against realistic old data. Prefer compatible/additive schema changes across rolling application versions.

Document whether a failed release rolls back application code or requires a forward schema fix.

Verify: the chosen procedure works without assuming every data migration is reversible.

### 7.7 Rehearse worker and service interruption

Stop a worker while it owns a lease, interrupt the API during delivery, and simulate a provider/database outage.

Restore service and inspect claims, retries, effects, follow-up reconciliation, and failed-event handling.

Verify: work resumes within the freshness/recovery target with no duplicate financial effects.

Suggested checkpoint: restore and interrupted-processing evidence.

## Checkpoint 7C: Protect access and retained data

### 7.8 Re-audit organization isolation

Test object access, lists, aggregates, exports, import batches, run results, worker mappings, and replay endpoints.

For shared multi-merchant hosting, add/test database row-level security as defense in depth before enabling it. Use non-bypass runtime roles and transaction-local organization context with pooled connections.

Verify: switching a request or job's organization cannot reveal another merchant's data.

### 7.9 Validate identity lifecycle and secrets

Review membership revocation, disabled users, session/token handling, key rotation, issuer/audience validation, CORS, HTTPS, and secret rotation.

Apply dependency maintenance through the approved review process.

Verify: a revoked membership stops subsequent protected operations, and rotating a provider secret has a tested transition procedure.

### 7.10 Define retention and deletion behavior

Separate source uploads, raw provider payloads, operational logs, financial evidence, and investigation/audit records.

Specify access, retention, deletion, and restoration consequences for each category. Validate the policy with the responsible business owner before using real data.

Verify: routine cleanup cannot erase the financial or decision history required for active investigations.

### 7.11 Add actionable monitoring

Monitor API failures, readiness, oldest pending event, retry/failure backlog, reconciliation freshness, database pressure, and backup status.

Assign alert ownership and provide a corresponding runbook. Keep routine business discrepancies in the investigation workflow unless a notification rule explicitly says otherwise.

Verify: a simulated failure reaches the intended operator with enough context to act and without secrets in the alert.

Suggested checkpoint: completed access/data controls and alert exercise.

## Checkpoint 7D: Verify completeness and launch readiness

### 7.12 Detect missed provider ingestion

Add a periodic authenticated provider read/backfill with pagination, checkpoints, overlap windows, and documented limits.

Mark API-fetched evidence with its real source kind; do not pretend it passed webhook signature verification.

Route missing records through the same canonical refund/posting services.

Verify: an intentionally omitted webhook is detected and recovered, and an already processed refund creates no second effect.

### 7.13 Run the combined failure exercise

Exercise restore, provider outage, worker crash, duplicate/unordered events, permission revocation, competing reviewer changes, and release recovery.

Compare final provider observations, effective ledger totals, reconciliation results, and preserved decisions.

Verify: correctness and recovery targets hold under the tested combinations, or the remaining gap is explicitly blocking launch.

### 7.14 Review the production gate

Review workload evidence, security/access tests, restore results, completeness checks, runbooks, release process, and named operational ownership.

Record the intended supported scope and unresolved limitations. Production promotion is an explicit release decision based on evidence.

Suggested commit: chore: complete production readiness controls and runbooks.

## Completion gate

- [ ] Workload and recovery/freshness targets are defined.
- [ ] Representative load measurements are recorded.
- [ ] Runtime/migration privileges are appropriate.
- [ ] Actual restore results satisfy the recovery requirements.
- [ ] Service interruptions recover without duplicate money.
- [ ] Organization and identity lifecycle checks pass.
- [ ] Retention and secret-management procedures exist.
- [ ] Alerts have owners and tested runbooks.
- [ ] Provider completeness checks detect missed ingestion.
- [ ] Combined failure exercises pass.
- [ ] Remaining limitations are reviewed before production promotion.

Evidence: measured reports, restore record, isolation/security results, operator runbooks, failure-exercise output, and the release decision.

This milestone still does not add refund execution, currency conversion, payout reconciliation, or full accounting. Those require separate product/design work.
