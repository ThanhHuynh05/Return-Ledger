# Milestone 3: Investigation

[Roadmap](./README.md) | [Previous](./02-reconciliation.md) | [Next: CSV imports](./04-csv-imports.md)

Status: Planned. Depends on reconciliation and foundation identity.

## Goal

Let an employee understand a discrepancy, investigate it, and preserve a reviewer's decision without changing the financial facts.

## Checkpoint 3A: Define the workflow and API

### 3.1 Define investigation states

Use Open, Investigating, and Resolved. Document allowed manual and system transitions.

Define who can assign, annotate, resolve, and reopen. Supervisors resolve; analysts investigate and add notes.

Verify: an operation's permission is enforced on the API, not only by a hidden button.

### 3.2 Extend the exception schema

Add assignee, version, current result link, and current resolution information. Add ExceptionNote, ExceptionTransition, and audit records.

Preserve previous resolutions in transition history.

Verify: resolving and reopening twice does not overwrite the first decision.

### 3.3 Add read endpoints

Implement GET /exceptions and GET /exceptions/:id with organization ownership, pagination, filters, and linked financial evidence.

Verify: the R-003 details explain expected 4000, effective refunded 2500, and a 1500-cent shortfall.

### 3.4 Add controlled mutation endpoints

Implement POST /exceptions/:id/notes and PATCH /exceptions/:id.

Allowlist mutation fields. Require a reason for resolution and an expected version for updates. Give retryable note creation a stable request identity.

Verify: attempts to patch refund amounts or ledger entries are rejected.

Suggested commit: feat: add investigation records and protected APIs.

## Checkpoint 3B: Build the three connected screens

### 3.5 Build the overview

Show expected refund total, effective refunded total, and unresolved exception count. State date range, currency, and reconciliation freshness.

Obtain authorized aggregates from the API; do not total only the visible page of rows.

Verify: filters change both the stated scope and the totals consistently.

### 3.6 Build the returns table

Add search, filters, server pagination, expected/refunded/pending/difference columns, finding, and overdue indicator.

Use stable record IDs for navigation and deterministic sorting.

Verify: switching pages does not change the meaning of the aggregate totals.

### 3.7 Build exception details

Show linked return/refund records, mismatch explanation, current finding, assignee, notes, and timeline.

Preserve filters when returning to the list.

Verify: a reviewer can explain the discrepancy without examining database tables.

### 3.8 Add complete interaction states

Implement loading, empty, error, and insufficient-permission states. Support keyboard navigation, readable labels, and status text alongside color.

Show a clear next action after a failed save.

Verify: a failed network request never appears as a successful resolution.

Suggested commit: feat: build reconciliation investigation screens.

## Checkpoint 3C: Preserve decisions and audit history

### 3.9 Save notes and assignments

Validate note length/content and require an active organization member as assignee.

Record actor and time on the server. Render notes as text rather than trusted HTML.

Verify: refresh preserves the note and another organization's user cannot be assigned accidentally.

### 3.10 Resolve with a reason

Require supervisor permission, a non-empty validated reason, and the expected exception version.

Save the transition, current state, and audit event together in one transaction.

Verify: resolving R-003 leaves its 1500-cent financial shortfall unchanged.

### 3.11 Reopen on a material finding change

Define a finding fingerprint using category, expected amount, effective refunded amount, currency, and mapping.

When a later run changes that fingerprint for a resolved case, reopen it and record a system transition linked to the new result.

Verify: a later reversal reopens the case and preserves the earlier reason. An unchanged rerun creates no redundant transition.

### 3.12 Handle concurrent reviewers

Make updates conditional on the submitted version. On conflict, return a stable conflict response and reload the latest record.

Do not automatically replace another reviewer's decision with a stale form submission.

Verify: two simultaneous resolutions create one successful decision and one conflict, with no lost history.

Suggested commit: feat: preserve investigation decisions and concurrent updates.

## Checkpoint 3D: Verify the complete investigation

### 3.13 Add workflow and permission tests

Cover analyst notes, supervisor resolution, viewer rejection, inactive membership, cross-organization access, concurrent saves, replayed note creation, and material-change reopening.

Include a browser workflow: open R-003, read the difference, add a note, resolve with a reason, reload, and inspect history.

Verify: the same history remains visible after a fresh API read and browser reload.

### 3.14 Review and save evidence

Run the existing checks plus the new database/browser cases. Update API examples and screenshots.

Suggested commit: test: verify investigation history and permissions.

## Suggested files

- apps/server/src/modules/investigations.
- apps/server exception/audit migrations and tests.
- apps/web/src/features/overview.
- apps/web/src/features/returns.
- apps/web/src/features/investigations.

## Completion gate

- [ ] Overview totals identify currency, range, and freshness.
- [ ] Returns and exception details are connected.
- [ ] Notes, assignments, and decisions survive reload.
- [ ] Resolution requires permission and a reason.
- [ ] Financial findings remain separate from investigation status.
- [ ] Changed findings reopen cases without erasing history.
- [ ] Concurrent updates and unauthorized operations are handled correctly.
- [ ] The R-003 browser workflow passes.

Evidence: screenshots, browser test output, permission test results, and preserved transition history.
