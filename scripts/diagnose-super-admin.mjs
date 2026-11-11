#!/usr/bin/env node
/**
 * Read-only Super Admin incident diagnostic.
 *
 * Run inside the existing OORO web or API Coolify application terminal:
 *   node scripts/diagnose-super-admin.mjs
 *
 * Does not run migrations, print environment variable values, enumerate rows,
 * modify database content, or use Docker/sudo.
 */
import { Prisma, PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const output = { service: 'OORO Super Admin read-only diagnostics', checks: [] };
const diagnostics = [
  ['database_connection', () => db.$queryRaw`SELECT 1`],
  ['campaign_list_query', () => db.campaign.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { updatedAt: 'desc' },
    include: {
      creatives: { where: { status: 'APPROVED' }, include: { asset: true }, orderBy: { displayOrder: 'asc' }, take: 1 },
      assignments: { where: { active: true }, select: { displayId: true } },
    },
    take: 1,
  })],
  ['proof_of_play_list_query', () => db.proofOfPlay.findMany({
    where: {
      playbackStartedAt: {},
      display: {},
    },
    orderBy: { playbackStartedAt: 'desc' },
    take: 1,
    include: { display: { select: { name: true, vehicleId: true } } },
  })],
  ['proof_of_play_count', () => db.proofOfPlay.count({ where: { playbackStartedAt: {}, display: {} } })],
  ['layout_studio_query', () => db.layoutTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      revisions: {
        orderBy: { revision: 'desc' },
        take: 1,
        select: { id: true, revision: true, contractHash: true, publishedAt: true },
      },
    },
    take: 1,
  })],
  ['migrations_read_only', () => db.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS incomplete FROM public."_prisma_migrations"`],
];

function category(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P1001' || error.code === 'P1002') return 'database_unreachable';
    if (error.code === 'P2021') return 'missing_table_or_unapplied_migration';
    if (error.code === 'P2022') return 'missing_column_or_schema_drift';
    if (error.code === 'P2010') return 'sql_query_failed';
    return 'prisma_known_request_error';
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return 'prisma_initialization_failed';
  if (error instanceof Prisma.PrismaClientValidationError) return 'generated_prisma_client_mismatch';
  return 'unexpected_database_error';
}

function errorCode(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  // Never print arbitrary error.message, database URLs, query text or stack traces.
  return error instanceof Prisma.PrismaClientInitializationError ? error.errorCode || 'INITIALIZATION_ERROR' : undefined;
}

async function main() {
  output.environment = {
    databaseUrlPresent: Boolean(process.env.DATABASE_URL?.trim()),
    backendUrlPresent: Boolean(process.env.OORO_BACKEND_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()),
    sessionSecretPresent: Boolean(process.env.OORO_SESSION_SECRET?.trim()),
  };
  for (const [name, query] of diagnostics) {
    try {
      const result = await query();
      const check = { name, status: 'PASS' };
      if (name === 'migrations_read_only' && Array.isArray(result)) {
        check.migrationTotals = { total: Number(result[0]?.total ?? 0), incomplete: Number(result[0]?.incomplete ?? 0) };
      }
      output.checks.push(check);
    } catch (error) {
      output.checks.push({ name, status: 'FAIL', category: category(error), ...(errorCode(error) ? { code: errorCode(error) } : {}) });
    }
  }
  console.log(JSON.stringify(output, null, 2));
  if (output.checks.some(check => check.status === 'FAIL')) process.exitCode = 1;
}
try {
  await main();
} finally {
  await db.$disconnect();
}
