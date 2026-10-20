import { prisma } from './prisma.js'
import { normalizeIndianPhone } from './domain/phone.js'
import { issuePasswordSetup, normalizeAdminEmail } from './domain/admin-password-auth.js'

const fail = (code: string, message: string): never => {
  console.error(JSON.stringify({ code, message }))
  process.exitCode = 1
  throw new Error(code)
}

async function main() {
  if (process.env.NODE_ENV !== 'production') fail('PRODUCTION_ONLY', 'Admin bootstrap requires NODE_ENV=production')
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'I_UNDERSTAND') fail('CONFIRMATION_REQUIRED', 'Set ADMIN_BOOTSTRAP_CONFIRM=I_UNDERSTAND to continue')

  const rawPhone = process.env.ADMIN_BOOTSTRAP_PHONE?.trim() ?? ''
  const normalizedPhone = normalizeIndianPhone(rawPhone)
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() ?? ''
  const email = normalizeAdminEmail(process.env.ADMIN_BOOTSTRAP_EMAIL ?? '')
  if (!normalizedPhone) fail('INVALID_PHONE', 'ADMIN_BOOTSTRAP_PHONE must be a valid Indian mobile number')
  const phone = normalizedPhone as string
  if (!name) fail('NAME_REQUIRED', 'ADMIN_BOOTSTRAP_NAME is required')
  if (!/^\S+@\S+\.\S+$/.test(email)) fail('INVALID_EMAIL', 'ADMIN_BOOTSTRAP_EMAIL must be a valid email')

  const existingAdmin = await prisma.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } })
  if (existingAdmin) fail('BOOTSTRAP_ALREADY_COMPLETED', 'An admin account already exists; bootstrap refused')

  const existingPhone = await prisma.user.findUnique({ where: { phone }, select: { id: true } })
  if (existingPhone) fail('PHONE_ALREADY_EXISTS', 'The bootstrap phone already belongs to an account; bootstrap refused')
  const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingEmail) fail('EMAIL_ALREADY_EXISTS', 'The bootstrap email already belongs to an account; bootstrap refused')

  const user = await prisma.user.create({ data: { phone, email, name, role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' }, select: { id: true, phone: true, role: true, accountStatus: true } })
  await issuePasswordSetup(user.id, email, name)
  console.log(JSON.stringify({ bootstrapped: true, userId: user.id, phone: user.phone, email, role: user.role, accountStatus: user.accountStatus, passwordSetupEmailSent: true }))
}

try {
  await main()
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(JSON.stringify({ code: 'BOOTSTRAP_FAILED', message: 'Admin bootstrap failed' }))
    process.exitCode = 1
  }
} finally {
  await prisma.$disconnect()
}
