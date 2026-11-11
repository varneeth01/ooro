import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { app } from './server.js'

test('privileged DeviceOS mutations reject unauthenticated HTTP callers', async () => {
  const paths = [
    ['/api/admin/deviceos/applications', { packageName: 'com.example.test', displayName: 'Test' }],
    [`/api/admin/deviceos/applications/${randomUUID()}/allowlist`, { allowed: true }],
    [`/api/admin/deviceos/applications/${randomUUID()}/releases`, { apkBase64: 'not-used' }],
    [`/api/admin/deviceos/releases/${randomUUID()}/approve`, {}],
    ['/api/admin/deviceos/deployments', {}],
    [`/api/admin/deviceos/deployments/${randomUUID()}/pause`, { reason: 'test' }],
    [`/api/admin/deviceos/deployments/${randomUUID()}/resume`, {}],
  ] as const

  for (const [url, payload] of paths) {
    const response = await app.inject({ method: 'POST', url, payload })
    assert.equal(response.statusCode, 401, `${url} must reject missing credentials`)
  }
  await app.close()
})
