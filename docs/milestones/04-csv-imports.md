# Milestone 4: CSV imports

[Roadmap](./README.md) | [Previous](./03-investigation.md) | [Next: Stripe processing](./05-stripe-processing.md)

Status: Planned. Depends on financial posting rules and organization permissions.

## Goal

An authorized employee previews approved-return/refund files, understands row errors, and commits a safe repeatable batch.

## Checkpoint 4A: Define formats and validation

### 4.1 Publish the two file contracts

Approved returns:

```csv
return_ref,order_ref,payment_ref,expected_minor,currency,approved_at,due_at
```

Refunds:

```csv
provider_refund_id,order_ref,payment_ref,amount_minor,currency,status
```

The authenticated import context selects the organization and provider connection. A CSV field cannot grant organization ownership.

Verify: a sample template makes each required column and accepted value clear.

### 4.2 Add a real CSV parser

From apps/server, when implementing this milestone:

```powershell
npm.cmd install csv-parse --no-audit
```

Handle quoted commas, escaped quotes, BOM, line endings, and quoted multiline fields. Do not split strings on commas.

Verify: a quoted reference field does not shift the remaining columns.

### 4.3 Implement row validators

Validate headers, required identifiers, bounded integer minor units, USD, supported statuses, timestamps, due-time ordering, and order/payment mappings.

Define whitespace/normalization rules explicitly. Reject scientific notation or fractional cents if the contract requires integer text.

Verify: each rejected row reports a stable code, field, and record number.

### 4.4 Set bounded import limits

Proposed starting limits: 5 MiB per file, 10,000 records, and a configurable preview expiry such as 24 hours.

These are product limits to test, not a measured processing-capacity claim.

Verify: oversized or malformed uploads fail before they consume unbounded memory or create business records.

Suggested commit: feat: define validated return and refund CSV formats.

## Checkpoint 4B: Save a preview without business writes

### 4.5 Add staging records

Create ImportBatch and ImportRow with organization, connection, creator, file type/hash, preview version, normalized rows, validation errors, state, and expiry.

Retain only necessary source data under a defined access/retention policy.

Verify: preview rows can be traced to the uploaded batch and creator.

### 4.6 Add POST /imports/preview

Authenticate, check import permission, parse, validate, and save the preview. Return counts, row outcomes, and whether commit is allowed.

Preview must not insert Return, Refund, or LedgerEntry records.

Verify: previewing a valid file changes staging counts only.

### 4.7 Detect duplicates and conflicts

Classify:

- New source identity.
- Exact existing record: harmless duplicate.
- Repeated identical row in one file: harmless duplicate.
- Same identity with conflicting values: blocking conflict.
- Ambiguous mapping: blocking review item.

Scope identity by organization, connection, and source type. A file hash alone is not sufficient duplicate protection.

Verify: renaming or reordering a file cannot bypass row-level uniqueness.

### 4.8 Build the preview interface

Show file context, accepted/duplicate/error counts, row messages, and the precise batch to commit.

For the first release, any blocking error prevents the whole batch from committing. Exact duplicates may be no-ops.

Verify: the user can correct a file and preview it again without hidden partial imports.

Suggested commit: feat: add persisted import preview and row feedback.

## Checkpoint 4C: Commit atomically and idempotently

### 4.9 Add POST /imports/commit

Accept batch ID, preview version, and an operation idempotency key. Do not accept arbitrary replacement rows from the browser.

Verify batch ownership, permission, expiry, and state.

Verify: another organization cannot commit or inspect the batch.

### 4.10 Revalidate current database state

Recheck mappings, conflicts, and permissions at commit time. A preview may become stale after another import or provider event.

Reject stale/conflicting state clearly and require a refreshed preview.

Verify: a competing insert between preview and commit does not silently overwrite a record.

### 4.11 Save the approved batch in one transaction

Write source records, refund state/effects through the shared posting service, provenance links, commit state, and audit information atomically.

Bound the batch size so transaction duration remains reasonable.

Verify: an injected failure rolls back every business write in the batch.

### 4.12 Make retries harmless across sources

Repeated commits return the recorded outcome. The same identity imported again cannot post a second ledger movement.

CSV records and later Stripe events for the same provider refund share the canonical provider identity.

Do not let a CSV silently regress newer provider-confirmed state.

Verify: importing a file twice preserves business-record counts and effective totals. New audit/import-attempt records may still document the repeated attempt.

Suggested commit: feat: commit imports with transactional duplicate protection.

## Checkpoint 4D: Prove the workflow

### 4.13 Add representative fixtures and tests

Commit synthetic files for valid records, quoted fields, invalid amounts, duplicate rows, conflicting IDs, missing mappings, wrong currency, and repeated imports.

Test preview purity, stale previews, permission changes, transaction rollback, and retries.

Verify: a malformed row has a useful message and no financial side effect.

### 4.14 Connect import to reconciliation

After commit, let the user start a reconciliation run and navigate to the resulting findings.

Show import provenance on investigation details.

Verify: preview, commit, reconcile, investigate, and reload work in one browser workflow.

Suggested commit: test: cover import reconciliation and recovery.

## Completion gate

- [ ] Both templates are documented and parse correctly.
- [ ] Preview creates no business/financial records.
- [ ] Errors and conflicts have row-level explanations.
- [ ] Commit revalidates and saves atomically.
- [ ] Repeated files and commits preserve financial counts/totals.
- [ ] CSV/provider identities do not duplicate one refund.
- [ ] Organization access and file limits are enforced.
- [ ] The import-to-investigation browser workflow passes.

Evidence: sample CSVs, preview screenshots, rollback/duplicate test output, and the end-to-end workflow.

## Reference

[CSV Parse documentation](https://csv.js.org/parse/)
