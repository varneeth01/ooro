import assert from 'node:assert/strict'
import test from 'node:test'
import { adminPasswordMinLength, hashPassword, normalizeAdminEmail, validateAdminPassword, verifyPassword } from './admin-password-auth.js'

test('admin passwords use Argon2id and verify only with the original password', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.match(hash, /^\$argon2id\$/)
  assert.equal(await verifyPassword(hash, 'correct horse battery staple'), true)
  assert.equal(await verifyPassword(hash, 'wrong password'), false)
})

test('admin password policy requires a long password', () => {
  assert.throws(() => validateAdminPassword('short'), /12/)
  assert.doesNotThrow(() => validateAdminPassword('a'.repeat(adminPasswordMinLength)))
  assert.throws(() => validateAdminPassword('a'.repeat(129)), /128/)
})

test('admin email normalization is deterministic and case-insensitive', () => {
  assert.equal(normalizeAdminEmail('  ADMIN@Example.COM '), 'admin@example.com')
})
