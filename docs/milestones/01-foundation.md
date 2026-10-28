# Milestone 1: Foundation

[Roadmap](./README.md) | [Next: reconciliation](./02-reconciliation.md)

Status: In progress. Checkpoint 1A is implemented; 1B, 1C, and 1D remain planned.

## Goal

Create a dependable base: connected applications, persisted organization-owned records, sign-in, permissions, and repeatable setup.

The existing [foundation walkthrough](../foundation/README.md) contains the full commands and examples for this milestone. The breakdown below places it inside the whole-project roadmap.

## Checkpoint 1A: Connect the applications

Detailed guide: [Checkpoint A](../foundation/checkpoint-a-connect-applications.md).

### 1.1 Check the toolchain

Confirm Node 24.x, npm 11.x, and Git. Read each app's package requirements.

Verify: commands print supported versions and the repository path is correct.

### 1.2 Create the API and frontend

Use apps/server for NestJS and apps/web for React/Vite. They already exist; do not scaffold them again.

Verify: each app has a package.json and committed lockfile.

### 1.3 Add and connect process health

Implement GET /health, allow the local frontend origin, and display its result in React.

Verify: the browser shows returnledger-api: ok.

### 1.4 Test failure and recovery

Stop the API, refresh the frontend, restart the API, and retry.

Verify: loading, failure, and recovery are understandable; builds and existing tests pass.

Suggested working commit: feat: scaffold web and API with health connectivity.

## Checkpoint 1B: Add persistence

Detailed guide: [Checkpoint B](../foundation/checkpoint-b-add-persistence.md).

### 1.5 Start a local PostgreSQL service

Add a versioned Compose service, loopback port, named volume, and health check.

Verify: a SELECT 1 query succeeds and the database is not exposed on every network interface.

### 1.6 Add the initial organization schema

Integrate Prisma 7 and define Organization, User, Membership, and a sample organization-owned Order.

Verify: relationships and unique organization/reference keys exist in the migration.

### 1.7 Migrate and seed

Generate the client, apply a reviewed migration, and seed synthetic records through upserts.

Verify: running the seed twice does not increase counts.

### 1.8 Prove restart persistence

Restart the API and database; query the same sample order. Add database readiness separately from process health.

Verify: the record survives and readiness detects database failure/recovery.

Suggested working commit: feat: add PostgreSQL persistence and Prisma foundation.

## Checkpoint 1C: Add identity and permissions

Detailed guide: [Checkpoint C](../foundation/checkpoint-c-add-identity.md).

### 1.9 Establish sign-in

Configure a local OIDC provider and browser client. Verify access-token signatures and claims on the API.

Verify: a valid user signs in; expired, wrongly signed, or wrong-audience tokens fail.

### 1.10 Link identities to organization membership

Find users by verified issuer and subject. Resolve organization access from active database memberships.

Verify: signing in does not automatically create merchant access.

### 1.11 Enforce permissions and isolation

Protect business routes by default. Check role and organization ownership in services.

Verify: viewer writes, inactive memberships, and cross-organization access are rejected without changing records.

Suggested working commit: feat: add sign-in and organization authorization.

## Checkpoint 1D: Make setup repeatable

Detailed guide: [Checkpoint D](../foundation/checkpoint-d-repeatable-setup.md).

### 1.12 Document environment and database setup

Provide placeholder-only environment examples, client-generation commands, migration commands, and disposable test database setup.

Verify: instructions do not rely on terminal history or real credentials.

### 1.13 Automate the checks

Add full test type-checking, database/authorization checks, a browser health smoke test, and baseline CI.

Verify: CI uses synthetic fixtures and a local JWT/JWKS fixture rather than a personal cloud account.

### 1.14 Rehearse a fresh checkout

Use a separate clone and dedicated development volumes. Follow only the README.

Verify: the applications build, the database initializes, sign-in works, and tests pass.

Suggested working commit: ci: automate foundation setup and verification.

## Main files

Existing: apps/server, apps/web, README.md, .gitignore.

Planned: compose.yaml, Prisma schema/config/migrations/seed, environment templates, authentication/organization modules, browser tests, CI workflow.

## Completion gate

- [x] Connected React and NestJS applications.
- [ ] Organization-owned data survives restart.
- [ ] Sign-in and server-side permissions work.
- [ ] Cross-organization and rejected-write tests pass.
- [ ] Fresh-checkout instructions and baseline CI work.
- [ ] No real secrets or generated dependency directories are committed.

Save health evidence, restart evidence, authorization results, and the passing baseline CI link before beginning milestone 2.
