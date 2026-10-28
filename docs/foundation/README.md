# Foundation checkpoints

For every project milestone, start with the [complete project roadmap](../milestones/README.md). This section contains the detailed A-D guides for milestone 1.

Updated: 28 October 2026

This is the step-by-step foundation guide for ReturnLedger. It covers the four checkpoints discussed before the financial reconciliation work begins.

## Start here

| Checkpoint | Guide | Current status | Completion evidence |
| --- | --- | --- | --- |
| A | [Connect the applications](./checkpoint-a-connect-applications.md) | Implemented; previously verified | Browser displays the API response; builds and checks pass |
| B | [Add persistence](./checkpoint-b-add-persistence.md) | Planned | Migration and repeatable seed work; records survive restart |
| C | [Add identity and permissions](./checkpoint-c-add-identity.md) | Planned | Sign-in works; unauthorized and cross-organization requests fail |
| D | [Make setup repeatable](./checkpoint-d-repeatable-setup.md) | Planned | A fresh checkout installs, migrates, builds, and passes CI |

Each guide contains small steps, files to create or edit, commands, expected results, troubleshooting, and an acceptance checklist.

**Documentation is not implementation.** Only checkpoint A exists in application code today. Examples for B, C, and D are proposed changes to make later. Do not run commands referencing future files before creating those files.

## How to use the guides

1. Finish A before B, B before C, and C before the full D acceptance check.
2. Apply one numbered step at a time.
3. Read its verification before moving on.
4. Keep the application runnable between steps.
5. Review and commit each completed checkpoint separately.
6. Record actual results; do not check a box merely because a file was created.

The guides use PowerShell for local commands. Commands inside GitHub Actions YAML use the runner's shell and normal npm/npx spelling.

Unless a step says otherwise, start from:

```powershell
Set-Location 'D:\COS\CVProject\ReturnLedger\Return-Ledger'
```

A path such as apps/server/prisma/schema.prisma is relative to this repository. File links in these documents are relative so they remain usable on GitHub.

## Design decisions used by the planned steps

- Keep the existing NestJS 11 and React applications.
- Use PostgreSQL 17 for local development, with a named Docker volume.
- Use the supported Prisma 7 branch for the existing backend. Do not mix its client/config examples with Prisma 8 examples.
- Use one organization in the visible demo. A second synthetic organization exists only for isolation tests.
- Use a local Keycloak development realm as the concrete sign-in example for C. Production identity hosting remains a later decision.
- Keep application membership and permissions in PostgreSQL.
- Keep GET /health public and retain the checkpoint A connection page.
- Add tests for protected operations using local fixtures; CI must not depend on a personal identity-provider account.

These are implementation choices for this walkthrough, not features already delivered.

## Expected files as the foundation grows

| Checkpoint | Main additions |
| --- | --- |
| A | apps/server, apps/web, separate package lockfiles |
| B | compose.yaml, environment examples, Prisma schema/config/service, migrations, seed, readiness route |
| C | Authentication strategy/guard, membership checks, protected organization endpoints, sign-in UI |
| D | Browser smoke tests, repeatable scripts, CI workflow, complete fresh-checkout instructions |

## Evidence record

| Checkpoint | Evidence to save | Recorded status |
| --- | --- | --- |
| A | Health response, browser success/retry, build/lint/test output | Previously verified; one unit test and three HTTP tests passed |
| B | Migration, seed output, before/after restart query, readiness failure/recovery | Not started |
| C | Sign-in demonstration and authorization matrix results | Not started |
| D | Fresh-checkout walkthrough and passing CI run | Not started |

A demonstration is not a production release. Production requirements such as operational ownership, restore targets, retention, and provider completeness checks remain in the enterprise implementation plan.

## After the foundation

Proceed to the financial core: approved returns, refunds, immutable movements, reconciliation results, and the four sample discrepancy cases. CSV imports, Stripe processing, and the hosted review workflow follow those business rules.
