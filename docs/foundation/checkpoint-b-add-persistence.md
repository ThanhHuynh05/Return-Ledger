# Checkpoint B: Add persistence

[Foundation index](./README.md) | [Previous: connectivity](./checkpoint-a-connect-applications.md) | [Next: identity](./checkpoint-c-add-identity.md)

Status: Planned. The files and endpoints described below have not been implemented.

## Goal

Run PostgreSQL, integrate Prisma, create an organization-owned sample record, and prove that data survives restarting the API and database.

Prerequisite: checkpoint A passes.

## B1. Check Docker

From the repository root:

```powershell
docker --version
docker compose version
docker info
```

Expected: Docker CLI and Compose are available, and the Docker daemon responds. On Windows, start Docker Desktop with Linux containers before continuing.

## B2. Create local database configuration

Create compose.yaml at the repository root:

```yaml
name: returnledger
services:
  db:
    image: postgres:17.11
    environment:
      POSTGRES_USER: returnledger
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in the root .env}
      POSTGRES_DB: returnledger
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U returnledger -d returnledger"]
      interval: 5s
      timeout: 5s
      retries: 12

volumes:
  postgres-data:
```

Create a root .env.example containing a placeholder:

```dotenv
POSTGRES_PASSWORD=replace_with_local_dev_password
```

Copy it to .env and replace the placeholder locally:

```powershell
Copy-Item .env.example .env
```

Do not overwrite an existing .env. The local image's initialization account is suitable for this development exercise; production uses separate migration and runtime roles.

Expected: compose.yaml and .env.example are trackable; the real .env is ignored.

## B3. Start and verify PostgreSQL

```powershell
docker compose up -d db
docker compose ps
docker compose exec db pg_isready -U returnledger -d returnledger
```

Expected: the service becomes healthy.

Verify a query:

```powershell
docker compose exec db psql -U returnledger -d returnledger -c 'SELECT 1;'
```

Expected: one row containing 1.

The named volume preserves data. Normal stop/start operations must not remove volumes.

## B4. Install the Prisma 7 packages

From the repository root:

```powershell
Set-Location apps/server
npm.cmd install @prisma/client@7 @prisma/adapter-pg@7 pg dotenv --no-audit
npm.cmd install --save-dev prisma@7 tsx @types/pg --no-audit
npm.cmd ls prisma @prisma/client @prisma/adapter-pg --depth=0
```

Expected: the CLI, client, and PostgreSQL adapter are on matching reviewed 7.x releases. Commit the resolved lockfile. If they differ, align them to the same exact 7.x release before generating code.

This guide deliberately uses the supported Prisma 7 branch with the existing NestJS application. Do not scaffold another application or substitute Prisma 8 commands.

## B5. Initialize Prisma and server environment files

From apps/server:

```powershell
npx.cmd prisma init --datasource-provider postgresql
```

Choose a local connection rather than creating a hosted database. Review generated files before replacing their defaults with the examples below.

Create or update apps/server/.env.example:

```dotenv
DATABASE_URL=postgresql://returnledger:replace_with_local_dev_password@localhost:5432/returnledger?schema=public
PORT=3000
```

Copy it to apps/server/.env, unless a real file already exists. Match the password from root .env. Percent-encode reserved characters if using them in a connection URL.

Compose reads the root .env. Prisma and the API will read apps/server/.env. They are separate files.

## B6. Define the initial schema

Create apps/server/prisma/schema.prisma:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  VIEWER
  ANALYST
  SUPERVISOR
  ADMINISTRATOR
}

model Organization {
  id          String       @id @default(uuid()) @db.Uuid
  name        String
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  memberships Membership[]
  orders      Order[]

  @@map("organizations")
}

model User {
  id             String       @id @default(uuid()) @db.Uuid
  identityIssuer String       @map("identity_issuer")
  identitySubject String      @map("identity_subject")
  displayName    String       @map("display_name")
  memberships    Membership[]

  @@unique([identityIssuer, identitySubject])
  @@map("users")
}

model Membership {
  organizationId String       @map("organization_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  role           Role
  active         Boolean      @default(true)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  user           User         @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@id([organizationId, userId])
  @@index([userId])
  @@map("memberships")
}

model Order {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  orderRef       String       @map("order_ref")
  currency       String       @db.VarChar(3)
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@unique([organizationId, orderRef])
  @@unique([organizationId, id])
  @@map("orders")
}
```

This is a foundation schema. Provider payment references and return/refund records will be added in the financial-core milestone. Do not describe it as the complete reconciliation model.

The issuer/subject pair will identify verified identities in C. Seed identities in B are fixtures, not working sign-in accounts.

## B7. Configure migrations and seeding

Create or update apps/server/prisma.config.ts:

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

The Prisma 7 connection URL belongs in this configuration. The runtime client receives its PostgreSQL adapter separately.

Add this generated directory to the root .gitignore:

```gitignore
/apps/server/src/generated/prisma/
```

Add src/generated/** to the server ESLint ignore list. Keep schema.prisma, prisma.config.ts, seed source, and migrations tracked.

Expected: generated client files are reproducible and do not become a large source commit.

## B8. Preserve the backend build layout

Adding TypeScript files outside src can change TypeScript's inferred output layout.

Update apps/server/tsconfig.json with:

```json
"include": ["src/**/*.ts", "test/**/*.ts"]
```

Merge the following into apps/server/tsconfig.build.json, preserving its existing exclusions:

```json
{
  "compilerOptions": {
    "types": ["node"],
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

Expected after building: the server entry point remains apps/server/dist/main.js. Do not accidentally change it to dist/src/main.js.

Prisma CLI/seed files run through their tools, not through the Nest application build.

## B9. Format, generate, and migrate

From apps/server:

```powershell
npx.cmd prisma format
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate dev --name foundation
```

Expected:

- A generated client appears under src/generated/prisma.
- A migration appears under prisma/migrations.
- PostgreSQL contains the four foundation tables.

Use migrate dev only on the development database. If Prisma requests a reset, investigate the schema history before choosing an action; a reset is not part of this normal guide.

A USD-only check constraint may be added to the reviewed migration for orders.currency. Later financial tables must enforce their own amount and currency rules too.

## B10. Add the Prisma service

Create apps/server/src/prisma/prisma.service.ts:

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required.');
    }

    super({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: 3000,
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Create a PrismaModule that provides and exports PrismaService, then import that module wherever database access is needed.

In main.ts:

- Load dotenv/config before bootstrapping.
- Enable shutdown hooks.
- Preserve checkpoint A's CORS origin and loopback listener.

Do not eagerly connect in a lifecycle hook if the process-health endpoint must remain available while the database is down.

Expected: the API builds and shuts down without leaving its connection pool open.

## B11. Write an idempotent seed

Create apps/server/prisma/seed.ts. Use this structure:

```typescript
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const organizationId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const identityIssuer =
    process.env.SEED_IDENTITY_ISSUER ?? 'urn:returnledger:seed';
  const identitySubject =
    process.env.SEED_IDENTITY_SUBJECT ?? 'analyst-demo';

  try {
    await prisma.$transaction(async (tx) => {
      await tx.organization.upsert({
        where: { id: organizationId },
        create: { id: organizationId, name: 'Demo merchant' },
        update: { name: 'Demo merchant' },
      });

      await tx.user.upsert({
        where: { id: userId },
        create: {
          id: userId, identityIssuer, identitySubject,
          displayName: 'Demo analyst',
        },
        update: { identityIssuer, identitySubject },
      });

      await tx.membership.upsert({
        where: {
          organizationId_userId: { organizationId, userId },
        },
        create: { organizationId, userId, role: 'ANALYST' },
        update: {},
      });

      await tx.order.upsert({
        where: {
          organizationId_orderRef: {
            organizationId, orderRef: 'ORD-FOUNDATION-001',
          },
        },
        create: {
          organizationId,
          orderRef: 'ORD-FOUNDATION-001',
          currency: 'USD',
        },
        update: {},
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

This seed is for synthetic local/test databases. It deliberately maps a fixed demo user and must not run against a live merchant database.

From apps/server, run twice:

```powershell
npx.cmd prisma db seed
npx.cmd prisma db seed
```

From the repository root, verify:

```powershell
docker compose exec db psql -U returnledger -d returnledger -c 'SELECT order_ref, currency FROM orders;'
docker compose exec db psql -U returnledger -d returnledger -c 'SELECT COUNT(*) FROM orders;'
```

Expected: the sample order appears and its count stays one.

## B12. Add database readiness

Keep GET /health as process health.

Implement GET /health/ready with these requirements:

1. Query SELECT 1 through Prisma.
2. Return 200 and a small readiness response if the database responds.
3. Return 503 with no connection string or raw database error if unavailable.
4. Bound the query/connection wait; do not let readiness hang indefinitely.

Do not expose an unauthenticated order-list endpoint for this checkpoint. Query sample rows through the local database until C adds protected endpoints.

Expected: stopping the database changes readiness, not the meaning of process health.

## B13. Prove persistence and recovery

1. Record the sample order/count.
2. Stop and restart the API.
3. Confirm the order still exists.
4. Run docker compose stop db.
5. Confirm readiness becomes unavailable.
6. Run docker compose start db.
7. Wait for healthy status.
8. Confirm readiness and the same sample order return.

Do not run docker compose down with volume-removal flags. That deletes the very data this checkpoint is proving can persist.

## B14. Run checks and save evidence

- Run prisma validate and the API build.
- Run the full server/test TypeScript check.
- Add database integration checks for relationships and repeatable seeding.
- Update HTTP tests to provide a test database or mock Prisma where appropriate.
- Keep unit tests independent of a real database.
- Ensure migrations apply to an empty disposable test database.

Save the migration, seed output, record/count before and after restart, and readiness failure/recovery evidence.

Suggested commit:

```text
feat: add PostgreSQL persistence and Prisma foundation
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Docker daemon unavailable | Start Docker Desktop and select Linux containers |
| Port 5432 occupied | Change only the published host port and the matching DATABASE_URL |
| Password authentication fails | Match both environment files; changing .env does not rewrite credentials in an existing volume |
| Prisma client import missing | Run generate and verify its output/moduleFormat |
| Built entry point moved | Check include and rootDir settings in B8 |
| Prisma CLI cannot read the URL | Run inside apps/server and load dotenv in prisma.config.ts |
| Seed creates duplicates | Use stable unique keys and upserts, not unconditional inserts |

## Acceptance checklist

- [ ] PostgreSQL is healthy on a loopback-only development port.
- [ ] Schema and reviewed migration are committed.
- [ ] Prisma client can query the database.
- [ ] Seed runs twice without duplicate sample records.
- [ ] Sample data survives API and database restart.
- [ ] Process health and database readiness have distinct behavior.
- [ ] No unprotected business-data route was introduced.
- [ ] Actual secrets and generated client files stay untracked.
- [ ] Build and database checks pass.

## References

- [PostgreSQL official Docker image](https://hub.docker.com/_/postgres)
- [Prisma 7 documentation](https://www.prisma.io/docs/orm/v7)
- [Prisma 7 generator and CommonJS configuration](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)
- [Prisma 7 CLI configuration and seeding](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
