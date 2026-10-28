# Milestone 6: Hosted demonstration

[Roadmap](./README.md) | [Previous](./05-stripe-processing.md) | [Next: production hardening](./07-production-hardening.md)

Status: Planned. Depends on the working local import, investigation, and Stripe-recovery workflows.

## Goal

Deploy a protected demonstration that a reviewer can use from a fresh browser with synthetic data and Stripe test mode.

## Checkpoint 6A: Make applications deployable

### 6.1 Externalize local addresses

Use a configured API base URL for every browser request, including the health request. Build the frontend with the hosted public URL.

Make server port, bind address, allowed origins, and identity settings explicit.

Verify: the hosted page never calls a reviewer's localhost:3000.

### 6.2 Package the API and worker

Create reviewed multi-stage container definitions or equivalent managed-platform builds. Generate Prisma Client and compile the API during build.

Run the API and worker through distinct entry points. Keep provider credentials out of images.

The current development API binds to 127.0.0.1. In a container, bind to the configured container interface, commonly 0.0.0.0, behind the intended HTTPS ingress.

Verify: both process types start from a clean built artifact.

### 6.3 Package the frontend

Build static output, configure SPA fallback if routes require it, and ensure public environment values are supplied at the appropriate build/runtime stage.

Verify: directly opening an exception-details URL does not produce a hosting 404.

Suggested commit: build: package API worker and web demo.

## Checkpoint 6B: Provision a separate demonstration environment

### 6.4 Choose and provision hosting resources

Provision static frontend hosting, API execution, a long-running worker, PostgreSQL, and the identity service.

Choose resources using actual process/network requirements and expected demonstration load. Document the selected host and cost assumptions when making that decision.

Verify: the worker can run independently and the database is reachable only through intended private/application access.

### 6.5 Configure secrets and identity

Set server database/provider credentials through the host's secret mechanism. Configure exact hosted CORS origins and OIDC redirect/logout URLs.

Create limited demonstration users and roles. Do not publish privileged shared administrative credentials.

Verify: sign-in returns to the hosted app and role differences remain enforced.

### 6.6 Apply migrations once per release

Use one controlled migration job with the committed migrations. Keep migration credentials separate from routine runtime credentials where supported.

Seed only explicitly selected synthetic data; never automatically run a demo seed against an unknown database.

Verify: release restart does not duplicate users, returns, or financial effects.

Suggested working checkpoint: documented environment inventory and successful migration/seed evidence.

## Checkpoint 6C: Connect and operate the hosted workflow

### 6.7 Deploy and verify health

Deploy the frontend, API, worker, and database configuration.

Verify HTTPS, process health, readiness, browser-to-API access, and worker processing. Ensure health responses omit secrets and detailed internal diagnostics.

Verify: the reviewer can reach the expected application version and its dependencies.

### 6.8 Configure the hosted Stripe test endpoint

Register the hosted HTTPS webhook destination for the required test events. Store its own signing secret; do not reuse a local CLI listener secret accidentally.

Verify: verified test events are stored and processed, while invalid signatures fail.

### 6.9 Add demonstration operations

Provide structured logs and a minimal view of failed/pending work.

Document startup, rollback/forward-fix, controlled replay, and an explicitly scoped synthetic-data reset procedure. Reset must be unavailable to ordinary reviewers and excluded from production routes.

Verify: a failed demonstration event can be explained and recovered without manual ledger edits.

Suggested commit: chore: configure protected hosted demonstration.

## Checkpoint 6D: Make the project reviewable

### 6.10 Test from a fresh browser

Use a reviewer account to sign in, import, reconcile, open a discrepancy, add a note, resolve with a reason, reload, and inspect history.

Repeat a webhook delivery and demonstrate correct totals. Include an unauthorized operation and organization-isolation check.

Verify: the workflow needs no developer terminal access.

### 6.11 Complete reviewer documentation

Write local setup, architecture, API/OpenAPI documentation, sample-data instructions, test commands, known limitations, and recovery notes.

Record a short walkthrough covering the problem, the financial result, and duplicate-event recovery.

Verify: screenshots and claims match actual observed behavior.

### 6.12 Complete the release gate

Run CI for the candidate commit, apply migrations to a fresh demonstration database, rehearse the release, and save the hosted review evidence.

Suggested commit: docs: publish demo walkthrough and release instructions.

## Completion gate

- [ ] Reviewer sign-in and the complete business workflow work over HTTPS.
- [ ] Client, API, worker, and database are deployed.
- [ ] Hosted CORS, identity redirects, and test webhook secrets are correct.
- [ ] Unauthorized operations fail.
- [ ] Duplicate delivery/restart recovery preserves correct totals.
- [ ] Migrations and synthetic seed are repeatable.
- [ ] CI and release smoke checks pass.
- [ ] Setup, limitations, and recovery are documented.
- [ ] The walkthrough uses observed results, not invented performance claims.

A passing demonstration does not complete milestone 7 or authorize the use of real merchant data.
