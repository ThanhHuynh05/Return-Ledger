# Checkpoint D: Make setup repeatable

[Foundation index](./README.md) | [Previous: identity](./checkpoint-c-add-identity.md)

Status: Planned. The workflow, scripts, and browser tests below are examples to implement after B and C.

## Goal

Someone starting with a fresh checkout can configure the environment, start local services, initialize a disposable database, build both apps, and run the checks.

Prerequisites: A, B, and C pass. D records the procedure and automates its verification.

## D1. Record the supported toolchain

Document:

- Node 24.x, with the tested patch recorded during implementation.
- A reviewed npm 11 patch; npm 11.21.1 is the compatible patch used to repair the optional-package metadata issue.
- Docker Desktop/Engine and Docker Compose.
- The database and identity-provider image tags selected in B and C.

If standardizing on npm 11.21.1, update packageManager consistently in both package.json files. A packageManager field documents intent; it does not automatically replace a user's global npm.

Expected: README, package metadata, and CI do not describe conflicting runtime requirements.

## D2. Separate environment examples

Maintain these template files:

| Template | Local file | Responsibility |
| --- | --- | --- |
| Root .env.example | Root .env | Compose database and identity-admin settings |
| apps/server/.env.example | apps/server/.env | Development database and API identity verification |
| apps/server/.env.test.example | apps/server/.env.test | Disposable test database and local JWKS fixture |
| apps/web/.env.example | apps/web/.env | Public API and browser identity-provider settings |

Do not overwrite an existing real environment file when following setup instructions.

Use a separate returnledger_test database. From the repository root, create it once if absent:

```powershell
docker compose exec db createdb -U returnledger returnledger_test
```

If it already exists, inspect/reuse the intended disposable database rather than treating the command as a reset.

Example server test template:

```dotenv
DATABASE_URL=postgresql://returnledger:replace_with_local_dev_password@localhost:5432/returnledger_test?schema=public
AUTH_ISSUER=http://127.0.0.1:8099/realms/returnledger-test
AUTH_AUDIENCE=returnledger-api
AUTH_JWKS_URI=http://127.0.0.1:8099/jwks
```

The C test fixture owns the loopback JWKS service while protected-endpoint tests run. It must use the matching issuer, audience, and port. It is not a production identity service.

Expected: tests never silently use the development database.

## D3. Validate configuration

Implement configuration validation for required server values and public frontend values.

Requirements:

- Fail early for absent or malformed required values.
- Report the variable name without printing its secret value.
- Validate the expected development/test database separation.
- Keep production configuration separate from demo defaults.
- Do not put database credentials, client secrets, or provider signing secrets in VITE variables.

Use a reviewed configuration-validation library or explicit validated configuration service; document the chosen dependency when implementing this step.

Expected: an invalid environment produces a clear error before a protected workflow runs.

## D4. Add repeatable server scripts

Merge these proposed scripts into apps/server/package.json while preserving existing scripts:

```json
{
  "typecheck": "tsc --noEmit --incremental false -p tsconfig.json",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:migrate:deploy": "prisma migrate deploy",
  "db:seed": "prisma db seed"
}
```

Use migrate dev for authoring local migrations. Use migrate deploy to apply committed migrations to a fresh test or release database.

A build must run after client generation. CI may run db:generate explicitly rather than hiding it in an installation hook.

Expected: no undocumented manual database edits are necessary to initialize the foundation.

## D5. Add deterministic local test commands

From apps/server:

```powershell
npm.cmd install --save-dev dotenv-cli --no-audit
```

Use dotenv-cli to load and override with the explicit test environment when running local integration commands:

```powershell
npx.cmd dotenv -e .env.test -o -- npm run db:migrate:deploy
npx.cmd dotenv -e .env.test -o -- npm run db:seed
npx.cmd dotenv -e .env.test -o -- npm run test:e2e -- --runInBand
```

These commands reference scripts added in D4. The -o option prevents an inherited development DATABASE_URL from taking precedence over the test file.

Before executing any database test, check that its target is the disposable test database. Test cleanup must be scoped to that database and its own fixtures.

Keep unit tests independent of PostgreSQL. Integration/HTTP tests cover real constraints, JWT verification, permissions, and organization isolation.

Expected: repeating tests produces the same result and does not modify development records.

## D6. Add a browser smoke test

From apps/web:

```powershell
npm.cmd install --save-dev @playwright/test --no-audit
npx.cmd playwright install chromium
```

Create apps/web/playwright.config.ts:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../server',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
```

Create apps/web/e2e/health.spec.ts:

```typescript
import { expect, test } from '@playwright/test';

test('the browser can reach the local API', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'ReturnLedger', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('returnledger-api: ok', { exact: true }),
  ).toBeVisible();
});
```

Add a frontend script:

```json
"test:e2e": "playwright test"
```

Preserve the public health page from A. Identity initialization must not force a redirect or an external provider request just to render this diagnostic page.

Before running the browser test:

1. Stop existing local development servers occupying ports 3000 and 5173.
2. Generate the client and build the API.
3. Provide valid server configuration and the disposable database.
4. Run the frontend test script.

Playwright starts and stops its own application processes. It must not silently reuse a server connected to a different database.

This smoke test verifies connectivity. Authenticated browser flows require their own local provider/realm fixtures; do not claim they are covered by this one test.

## D7. Define the full local check sequence

Run from the repository root with local services ready:

```powershell
npm.cmd --prefix apps/server ci --include=dev --no-audit
npm.cmd --prefix apps/web ci --include=dev --no-audit
npm.cmd --prefix apps/server run db:generate
npm.cmd --prefix apps/server run build
npm.cmd --prefix apps/server run typecheck
npm.cmd --prefix apps/server run lint
npm.cmd --prefix apps/server test -- --runInBand
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/web run lint
```

Then run the explicit test-environment database/HTTP commands in D5. With the API already built and development servers stopped, run the browser smoke test using the same test configuration:

```powershell
Set-Location apps/server
npx.cmd dotenv -e .env.test -o -- npm --prefix ../web run test:e2e
```

The command above starts from the repository root before entering apps/server. The server's dotenv-cli supplies test variables to Playwright and the API process it launches.

Expected: all checks pass without a personal cloud account.

## D8. Add GitHub Actions

Create .github/workflows/ci.yml after the scripts, tests, fixtures, and migrations above exist.

This example is for the completed foundation, not today's checkpoint A-only code:

```yaml
name: Foundation CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:17.11
        env:
          POSTGRES_USER: returnledger
          POSTGRES_PASSWORD: ci_only_password
          POSTGRES_DB: returnledger_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U returnledger -d returnledger_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 12

    env:
      CI: "true"
      DATABASE_URL: postgresql://returnledger:ci_only_password@127.0.0.1:5432/returnledger_test?schema=public
      AUTH_ISSUER: http://127.0.0.1:8099/realms/returnledger-test
      AUTH_AUDIENCE: returnledger-api
      AUTH_JWKS_URI: http://127.0.0.1:8099/jwks
      VITE_API_BASE_URL: http://localhost:3000
      VITE_KEYCLOAK_URL: http://127.0.0.1:8099
      VITE_KEYCLOAK_REALM: returnledger-test
      VITE_KEYCLOAK_CLIENT_ID: returnledger-web

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24.x"
          cache: npm
          cache-dependency-path: |
            apps/server/package-lock.json
            apps/web/package-lock.json
      - name: Select npm
        run: npm install --global npm@11.21.1 --no-audit
      - name: Install API
        run: npm ci --include=dev --no-audit
        working-directory: apps/server
      - name: Install web
        run: npm ci --include=dev --no-audit
        working-directory: apps/web
      - name: Prepare database
        working-directory: apps/server
        run: |
          npm run db:generate
          npm run db:migrate:deploy
          npm run db:seed
      - name: Verify API
        working-directory: apps/server
        run: |
          npm run build
          npm run typecheck
          npm run lint
          npm test -- --runInBand
          npm run test:e2e -- --runInBand
      - name: Verify web
        working-directory: apps/web
        run: |
          npm run build
          npm run lint
          npx playwright install --with-deps chromium
          npm run test:e2e
```

The password here is a disposable CI-service credential, not a production secret. CI uses the local JWT/JWKS fixture for server authorization tests and the public page for browser connectivity. It does not log into a real merchant/provider account.

The example selects a Node major. For stricter runtime reproducibility, replace it with the exact reviewed patch or a committed version file when implementing D.

Expected: a new push or pull request runs the foundation checks and reports failures.

## D9. Document a fresh checkout

Update the root README with this order:

1. Clone and enter the repository.
2. Check the documented tool versions.
3. Copy missing environment templates and fill local values.
4. Start PostgreSQL and local Keycloak.
5. Install application dependencies.
6. Generate Prisma Client and apply committed development-database migrations.
7. Seed synthetic data.
8. Configure/link the local identity fixtures.
9. Start the API and frontend in separate terminals.
10. Verify connectivity, sign-in, and organization access.
11. Prepare a separate test database and run the checks.

Show exact working directories. Keep development, integration-test, and production instructions distinct.

Expected: the README works without undocumented terminal history.

## D10. Review files and secrets

From the repository root:

```powershell
git status --short
git diff --check
git diff --stat
```

Confirm:

- Real environment files are ignored.
- Example files contain placeholders.
- Lockfiles, schema, migrations, seed source, and tests are tracked.
- Generated client code, node_modules, builds, reports, and real credentials are absent.
- No production credential is required for CI.

An external security audit is a separate operation; it is not required to prove that dependencies are installed. Do not silently add metadata uploads to the basic offline verification procedure.

## D11. Perform the final acceptance exercise

Use a clean clone in a separate directory and a dedicated Compose project/volume. Stop the original application's development processes and Compose services first so the documented ports are free; keep its volumes.

In the fresh clone, use a separate project name for every Compose command, for example:

```powershell
docker compose -p returnledger-fresh-check up -d
```

The -p option overrides the sample Compose project name and gives this exercise its own named volumes. Configure the fresh realm/users and local identity links using C rather than assuming IDs from the original identity database.

Follow only the README. Record any missing instruction and fix it before marking D complete.

Save:

- Tool versions.
- Successful initial migration/seed.
- Local connectivity and sign-in evidence.
- Authorization test output.
- Passing browser smoke test.
- Passing CI run URL.

Suggested commit:

```text
ci: automate foundation setup and verification
```

## Acceptance checklist

- [ ] Environment examples are complete and contain no real secrets.
- [ ] A fresh checkout installs from committed lockfiles.
- [ ] Database/client setup is deterministic and documented.
- [ ] Tests use an isolated disposable database.
- [ ] Type checks include server test files.
- [ ] Authentication and organization rejection cases pass.
- [ ] The browser smoke test passes.
- [ ] CI runs without a personal identity-provider account.
- [ ] A fresh-checkout walkthrough succeeds.
- [ ] The README reflects the actual commands and limitations.

## References

- [GitHub Actions: build and test Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [Playwright: managed web servers](https://playwright.dev/docs/test-webserver)
- [Prisma 7 configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
