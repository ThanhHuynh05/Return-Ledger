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
