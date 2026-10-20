import { prisma } from './prisma.js'
import { issuePasswordSetup, normalizeAdminEmail } from './domain/admin-password-auth.js'

const fail = (code: string, message: string): never => {
  console.error(JSON.stringify({ code, message }))
  process.exitCode = 1
  throw new Error(code)
}

async function main() {
  if (process.env.NODE_ENV !== 'production') fail('PRODUCTION_ONLY', 'Admin password setup requires NODE_ENV=production')
  if (process.env.ADMIN_PASSWORD_SETUP_CONFIRM !== 'I_UNDERSTAND') fail('CONFIRMATION_REQUIRED', 'Set ADMIN_PASSWORD_SETUP_CONFIRM=I_UNDERSTAND to continue')
  const requestedEmail = normalizeAdminEmail(process.env.ADMIN_PASSWORD_SETUP_EMAIL ?? '')
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE'] }, accountStatus: 'ACTIVE', passwordHash: null }, select: { id: true, email: true, name: true } })
  const targets = requestedEmail ? admins.filter((admin) => admin.email === requestedEmail) : admins
  if (requestedEmail && targets.length === 0) fail('ADMIN_NOT_FOUND', 'No active admin without a password matched ADMIN_PASSWORD_SETUP_EMAIL')
  if (targets.some((admin) => !admin.email)) fail('EMAIL_REQUIRED', 'Every active admin must have an email before password setup')
  for (const admin of targets) await issuePasswordSetup(admin.id, admin.email as string, admin.name)
  console.log(JSON.stringify({ passwordSetupEmailsSent: targets.length }))
}

try { await main() } catch (error) {
  if (process.exitCode !== 1) { console.error(JSON.stringify({ code: 'PASSWORD_SETUP_FAILED', message: 'Admin password setup failed' })); process.exitCode = 1 }
} finally { await prisma.$disconnect() }
