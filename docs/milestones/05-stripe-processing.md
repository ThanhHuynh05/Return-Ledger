# Milestone 5: Stripe processing

[Roadmap](./README.md) | [Previous](./04-csv-imports.md) | [Next: hosted demonstration](./06-hosted-demonstration.md)

Status: Planned. Use Stripe test mode throughout this milestone.

## Goal

Receive verified provider events, process them durably, and preserve correct refund totals under duplicate delivery, unordered events, crashes, and replay.

## Checkpoint 5A: Configure and verify intake

### 5.1 Add the SDK and local tooling

From apps/server, when implementing:

```powershell
npm.cmd install stripe --no-audit
```

Install the Stripe CLI from its official distribution. Store the test API key and endpoint signing secret only on the server. Pin a reviewed SDK/API version.

Verify: the SDK initializes with test credentials and no provider secret appears in browser configuration.

### 5.2 Define the provider contract

Select documented refund event types and supported refund lifecycle states for the pinned API version.

Specify how provider account, environment, payment reference, refund identity, currency, amount, and status map into local records.

Verify: contract fixtures cover the event shape actually delivered to this endpoint.

### 5.3 Configure raw-body signature verification

Implement POST /webhooks/stripe. Enable Nest's raw-body support while preserving application configuration.

Verify the signature using the untouched request bytes, signature header, and configured endpoint secret before business parsing/storage.

Verify: invalid signatures create no inbox or financial records. This provider-authenticated route must not require an employee's bearer token.

### 5.4 Establish realistic test mappings

Create test payments/refunds in Stripe's test environment and record the payment mapping in ReturnLedger.

Use the configured endpoint/account context and verified provider data to resolve ownership; do not trust arbitrary organization metadata.

For an over-refund case, total refunds may exceed the approved return amount while still remaining within the original charge amount.

Verify: known test records map correctly and unmapped synthetic CLI events go to review.

Suggested commit: feat: verify Stripe refund event intake.

## Checkpoint 5B: Persist and claim work

### 5.5 Add the durable inbox schema

WebhookEvent needs connection/event identity, payload or retained evidence reference, state, attempts, next retry, lease token/expiry, and sanitized last error.

Uniquely scope the provider event ID to its connection/account and environment.

Verify: the same event delivered twice produces one inbox record.

### 5.6 Acknowledge only durable receipt

After verification, save the event and return success. Existing duplicate delivery returns success too.

Return an error if durable storage fails so the provider can retry. Do not acknowledge merely because an in-memory job was scheduled.

Verify: stopping the API after acknowledgment does not lose the saved event.

### 5.7 Add a separate worker entry point

Create a worker bootstrap that reuses the backend's domain modules and database connection.

Give it an explicit npm script and graceful shutdown. Keep the worker out of the API request lifecycle.

Verify: the inbox can accumulate while the worker is stopped and drain when it restarts.

### 5.8 Implement atomic claims and leases

Use a transactional claim such as PostgreSQL row locking with SKIP LOCKED. Assign a fresh lease token and expiration.

Reclaim expired work. Require the current lease token when committing results so a stale worker cannot commit after another worker takes ownership.

Verify: two workers do not successfully apply the same claimed work concurrently.

Suggested commit: feat: process a durable webhook inbox with worker leases.

## Checkpoint 5C: Apply authoritative refund effects

### 5.9 Resolve the order or quarantine the event

Use the stored provider payment mapping inside the resolved organization. Missing or ambiguous mappings require review and an explicit retry/recovery path.

Verify: no refund is attached to another order solely because its amount matches.

### 5.10 Handle unordered observations

Do not use event arrival order or event timestamps alone as an ordering guarantee.

Use authoritative provider state or a documented lifecycle rule. Serialize the full fetch/apply lifecycle for one refund, or validate/re-fetch if a provider read can become stale before application.

Do not keep a long database transaction open around network calls.

Verify: a late older event cannot regress a newer financial state.

### 5.11 Apply updates atomically

In one database transaction:

1. Verify processing ownership/version.
2. Upsert the canonical Refund.
3. Calculate the change from previously applied effective amount.
4. Append any new ledger movement.
5. Record a durable reconciliation follow-up or dirty marker.
6. Mark the event processed.

Verify: forced failure at any point leaves no partial refund/effect/processed marker.

### 5.12 Deduplicate business effects

Different events may describe the same refund state. Event-ID deduplication alone is insufficient.

Use a stable effect identity tied to a serialized local business revision/transition. A repeated observation with no effective change posts no movement.

A bare event ID duplicates effects across events; a bare status-pair key can suppress a legitimate repeated lifecycle transition. Design for both cases.

Verify: repeated same-state events create one effect; a confirmed reversal preserves the original and adds the correct compensation.

Suggested commit: feat: apply provider refund state and ledger effects atomically.

## Checkpoint 5D: Recover and prove correctness

### 5.13 Add bounded retries

Classify temporary provider/database failures separately from permanent validation/mapping issues.

Use backoff and jitter, bounded attempts, and sanitized diagnostics. Document the proposed retry policy and tune it using evidence.

Verify: retry does not duplicate a successfully applied effect.

### 5.14 Add controlled replay

Expose failed-event inspection and replay to the permitted operations role. Require a reason and record the actor/action.

Replay the existing durable record through the same processing path; do not create an alternate ledger-writing shortcut.

Verify: unauthorized replay is rejected and repeated replay remains safe.

### 5.15 Test delivery and crash scenarios

Cover invalid signature, identical event repeated, different events for one refund, stale/unordered delivery, missing mapping, transaction rollback, expired lease, crashed worker, provider outage, and confirmed reversal.

With the API and worker configured:

```powershell
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Use the signing secret supplied by this local listener for its forwarded events. Configure the endpoint's required event types and use real mapped test objects for a meaningful reconciliation demonstration.

Verify: totals remain unchanged after duplicate delivery and recover correctly after restart.

### 5.16 Record operational evidence

Save an integration-test report and a short recording of repeated delivery, worker interruption, restart, and unchanged correct totals.

Document supported provider semantics and known limitations. Add a periodic provider-completeness check before real production use; reliable intake alone does not prove every source record was received.

Suggested commit: test: verify Stripe duplicate delivery and crash recovery.

## Completion gate

- [ ] Invalid signatures have no inbox/financial side effects.
- [ ] Durable receipt happens before success acknowledgment.
- [ ] Duplicate events and duplicate observations post no extra money.
- [ ] Worker leases recover safely after crashes.
- [ ] Unordered events preserve authoritative state.
- [ ] Refund, ledger, follow-up, and completion changes are atomic.
- [ ] Retries and authorized replay preserve correct totals.
- [ ] Confirmed reversal preserves historical entries.
- [ ] All work uses test credentials and synthetic merchant records.

## References

- [Stripe webhook verification and delivery behavior](https://docs.stripe.com/webhooks)
- [Stripe refund lifecycle](https://docs.stripe.com/refunds)
- [PostgreSQL row locking and SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)
