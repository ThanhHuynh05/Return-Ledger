# ReturnLedger: complete milestone roadmap

Updated: 28 October 2026

This is the implementation breakdown for the whole project. Each milestone has smaller checkpoints, numbered tasks, expected results, tests, and a completion gate.

## Milestones

| Number | Milestone | Smaller checkpoints | Current status |
| --- | --- | --- | --- |
| 1 | [Foundation](./01-foundation.md) | Connect apps; persistence; identity; repeatable setup | In progress: application connectivity is implemented |
| 2 | [Reconciliation](./02-reconciliation.md) | Financial schema; ledger; matching; saved runs and tests | Not started |
| 3 | [Investigation](./03-investigation.md) | Workflow API; screens; notes/audit; concurrent changes | Not started |
| 4 | [CSV imports](./04-csv-imports.md) | Formats; validation preview; atomic commit; duplicate recovery | Not started |
| 5 | [Stripe processing](./05-stripe-processing.md) | Verified intake; durable worker; state/ledger effects; recovery | Not started |
| 6 | [Hosted demonstration](./06-hosted-demonstration.md) | Package; deploy; configure identity/integration; review workflow | Not started |
| 7 | [Production hardening](./07-production-hardening.md) | Reliability targets; access/data protection; recovery; operational acceptance | Not started |

The original product guide separates local setup, database modeling, and reconciliation into different milestones. This enterprise roadmap groups setup, persistence, and identity under Foundation, then adds Production hardening as a distinct milestone. Product requirements remain the same; the numbering is organized around the implementation discussion.

## How to work through a milestone

1. Read its goal and prerequisites.
2. Complete one numbered task at a time.
3. Run the task's verification.
4. Save evidence and update its checklist.
5. Review the changes and commit a working checkpoint.
6. Start the next milestone after the completion gate passes.

A document, migration file, test placeholder, or screenshot alone is not proof that a milestone works. Record the actual result.

All guides describe implementation work. Writing these guides does not implement the planned features.

## Current implementation

- apps/server and apps/web exist.
- React calls GET /health.
- Loading, error, and retry behavior exists.
- Backend/frontend build and lint checks passed.
- Backend unit and health HTTP tests passed.
- Server test types and a transitive Webpack conflict were addressed.

PostgreSQL integration, sign-in, reconciliation, investigation, imports, Stripe processing, deployment, and production operations are still planned.

## Working conventions

- Repository: D:\COS\CVProject\ReturnLedger\Return-Ledger.
- Local commands use PowerShell and npm.cmd/npx.cmd.
- The two apps retain their own package.json and lockfile.
- New scripts and endpoints mentioned in later guides must be created before invoking them.
- Use the existing foundation guide's Prisma 7 examples; do not mix major-version APIs.
- Keep real credentials out of source control.
- Use synthetic records and Stripe test mode for the demonstration.
- User identity, organization ownership, permissions, and financial correctness apply to every later milestone.

## Shared verification commands

These commands already exist:

```powershell
npm.cmd --prefix apps/server run build
npm.cmd --prefix apps/server run lint
npm.cmd --prefix apps/server test -- --runInBand
npm.cmd --prefix apps/server run test:e2e -- --runInBand
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/web run lint
```

When a milestone adds database/integration requirements, supply its explicit disposable test environment before running those tests. Do not point integration tests at a merchant's working database.

## Keep these product boundaries

The first release supports one visible merchant organization, USD, and one approved return per order. A second organization may be used as a synthetic access-isolation fixture.

The product detects and investigates refund differences. It does not issue refunds, transfer money, convert currencies, reconcile payouts, or provide full accounting.

The ledger is an immutable history of refund movements. It is not a full double-entry accounting system.

## Overall completion checklist

- [ ] 1. Foundation: A-D complete, including persistence and identity.
- [ ] 2. Reconciliation: four guide cases and financial edge cases pass.
- [ ] 3. Investigation: decisions and history survive reload and concurrent use.
- [ ] 4. CSV imports: validated preview and safe repeatable commit work.
- [ ] 5. Stripe processing: duplicates, crashes, and unordered delivery preserve totals.
- [ ] 6. Hosted demo: a reviewer completes the workflow from a fresh browser.
- [ ] 7. Production hardening: operational gates pass with recorded evidence.

The hosted-demo gate and production gate are different. Do not advertise a successful demonstration as a production-readiness result.
