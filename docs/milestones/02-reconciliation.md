# Milestone 2: Reconciliation

[Roadmap](./README.md) | [Previous](./01-foundation.md) | [Next: investigation](./03-investigation.md)

Status: Planned. Depends on the completed foundation.

## Goal

Compare approved refund obligations with effective completed refunds, explain every result, and persist repeatable reconciliation runs.

## Checkpoint 2A: Define and persist financial inputs

### 2.1 Define the money contract

Store USD in integer cents. Validate safe integer bounds, non-negative source amounts, currency, identifiers, and timestamps.

Define difference_minor = expected_minor - effective_refunded_minor.

Verify: USD 40.00 becomes 4000; fractional cents, negative source amounts, unsafe numbers, and non-USD input are rejected. Define safe aggregate limits or decimal-string serialization if using BIGINT.

### 2.2 Extend the schema

Add ProviderConnection, Return, Refund, LedgerEntry, ReconciliationRun, and ReconciliationResult. Extend Order with the provider payment mapping.

Add a minimal Exception record for the current discrepancy. Notes and full investigation transitions belong to milestone 3.

Keep organization_id on merchant-owned records. Keep provider account and test/live environment on the connection.

Verify: each refund and return can be traced to its organization and source order.

### 2.3 Enforce database relationships and uniqueness

Add:

- One approved return per organization/order for the first release.
- Unique provider refund identity within its connection.
- Unique ledger effect keys.
- Unique current exception per organization/return.
- Unique result per run/return.
- Composite organization-aware relationships where needed.
- Currency/amount checks and indexes for common queries.

Verify: the database rejects duplicate identities and cross-organization links even if a service has a bug.

### 2.4 Seed the four required cases

Use stable synthetic order, return, refund, and effect references. Give R-002 an already elapsed due time.

| Return | Expected cents | Effective refunded cents | Expected result |
| --- | ---: | ---: | --- |
| R-001 | 3000 | 3000 | Matched |
| R-002 | 5000 | 0 | Missing refund |
| R-003 | 4000 | 2500 | Under-refunded by 1500 |
| R-004 | 2000 | 4000 | Over-refunded by 2000 |

Verify: seeding twice preserves counts. Keep synthetic provider references separate from real Stripe test-object mappings.

Suggested commit: feat: model reconciliation records and sample cases.

## Checkpoint 2B: Implement refund movement history

### 2.5 Create one posting service

Make one service responsible for applying refund state and posting financial effects inside the caller's transaction.

Routes, seed helpers, imports, and the later worker must use the same rules.

Verify: a duplicate business operation creates no second financial movement.

### 2.6 Define lifecycle effects and immutability

Pending: no completed movement. Successful completion: positive movement. Confirmed reversal of an already posted completion: compensating negative movement.

Preserve old entries. Do not update or delete a posted amount. Restrict the runtime database role and test its permissions separately from a privileged migration role.

Verify: reversing a 2500-cent completed refund preserves the original +2500 and appends -2500. Effective refunded becomes zero.

Provider-specific transitions must be supported by actual provider evidence; a guessed status change is not enough to reverse money.

### 2.7 Choose the authoritative total

Derive effective refunded amounts from the ledger projection. Refund holds current provider state; it is not a second amount to add to ledger totals.

Expose pending amounts separately.

Verify: a completed refund is counted once even when its current Refund row and its historical LedgerEntry both exist.

Suggested commit: feat: add immutable refund movement posting.

## Checkpoint 2C: Implement deterministic matching and rules

### 2.8 Match by identifiers

Use organization, provider connection, order, provider payment reference, and currency. Do not match merely because amounts look similar.

Unmapped or ambiguous provider records go to a review queue.

Verify: one refund cannot be counted against two returns. Multiple returns per order remain blocked until explicit allocation exists.

### 2.9 Write the calculation as a domain function

Pass evaluated obligation, matched movement totals, pending amounts, and evaluation time into a function independent of HTTP/database access.

Return expected, refunded, pending, difference, finding, overdue, and an explanation.

Verify: the same inputs and time produce the same output.

### 2.10 Implement the classification policy

| Condition | Finding |
| --- | --- |
| Effective refunded equals expected | Matched |
| Positive expected, zero refunded, before due time | Awaiting refund |
| Positive expected, zero refunded, at/after due time | Missing refund |
| Positive refunded below expected | Under-refunded |
| Refunded exceeds expected | Over-refunded |
| Missing/ambiguous mapping | Needs mapping review |

For partial refunds before the due time, show Under-refunded with overdue=false. A zero obligation and zero effective refund is Matched.

Verify: due-time boundary behavior is explicit and pending refunds never count as completed.

### 2.11 Test the rules before building the screens

Cover the four cases, split partial refunds, pending/failed/canceled records, reversals, zero amounts, due-time boundaries, wrong currency, invalid amounts, and ambiguous mappings.

Use a controllable clock. Test expected business outcomes rather than reproducing each line of implementation.

Verify: the domain tests fail when an amount is counted twice or the due-time comparison changes incorrectly.

Suggested commit: feat: implement reconciliation rules and edge cases.

## Checkpoint 2D: Save runs and expose results

### 2.12 Add the protected run endpoint

Implement POST /reconciliation-runs with an organization-scoped input, evaluation time/scope, permission check, and idempotency key.

Persist run state and return a run ID. Add GET /reconciliation-runs/:id.

Verify: unauthorized callers cannot start or inspect another organization's run. A repeated operation key cannot start a second equivalent run; conflicting key reuse is rejected.

### 2.13 Preserve a consistent input snapshot

For the bounded first release, use a consistent database snapshot and serialize reconciliation per organization.

Persist rule version, evaluation time, input versions/evaluated values, source links, and run summary. Old results must remain explainable after provider rows change.

Verify: a concurrent refund update cannot produce a half-old, half-new result inside one run.

### 2.14 Update current exceptions safely

Upsert one current exception per organization/return. Link it to the latest completed finding while preserving historical results.

Financial findings and investigation status stay separate. Later investigation behavior will reopen materially changed resolved cases.

Verify: rerunning unchanged data creates neither duplicate current exceptions nor financial effects. Older concurrent runs cannot overwrite a newer current result.

### 2.15 Add read endpoints and integration checks

Expose a protected paginated GET /returns and return details with expected, recorded, pending, difference, finding, and evidence links.

Test transaction rollback, run retry, concurrency, isolation, and repeated execution against PostgreSQL.

Verify: the API reports the four expected results and a failed transaction leaves no partial result/exception changes.

### 2.16 Document and review the checkpoint

Document matching assumptions, money limits, sign convention, due-time policy, input snapshot strategy, and one-return-per-order restriction.

Run builds, lint, domain tests, database checks, and authorization tests in the disposable test environment.

Suggested commit: feat: persist reconciliation runs and discrepancy results.

## Suggested files

- apps/server/prisma/schema.prisma and new migrations.
- apps/server/src/modules/returns.
- apps/server/src/modules/refunds.
- apps/server/src/modules/ledger.
- apps/server/src/modules/reconciliation.
- Domain fixtures and PostgreSQL integration tests.

From apps/server, module scaffolding may use the installed CLI:

```powershell
npx.cmd --no-install nest generate module modules/reconciliation
```

Create services/controllers deliberately after defining their responsibilities.

## Completion gate

- [ ] Four sample cases return the correct result.
- [ ] Integer money, currency, mapping, and due-time policies are enforced.
- [ ] Pending and reversed refunds have correct effective totals.
- [ ] Ledger entries remain immutable and effects unique.
- [ ] Run results preserve evaluated evidence.
- [ ] Repeated and concurrent runs remain consistent.
- [ ] Organization and permission checks pass.
- [ ] Transaction failure rolls back partial changes.

Evidence: migration, repeatable seed, passing tests, sample API response, and a short explanation of each matching rule.
