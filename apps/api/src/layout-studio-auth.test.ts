import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { SignJWT } from 'jose'
import { config } from './config.js'

test('Layout Studio draft and publish mutations require authenticated admin roles', async () => {
  const id = randomUUID()
  const draft = await app.inject({ method: 'POST', url: '/api/admin/layout-studio', payload: { name: 'unauthorized', contract: {} } })
  assert.equal(draft.statusCode, 401)
  const save = await app.inject({ method: 'PUT', url: `/api/admin/layout-studio/${id}/draft`, payload: {} })
  assert.equal(save.statusCode, 401)
  const publish = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/publish`, payload: { expectedRowVersion: 1 } })
  assert.equal(publish.statusCode, 401)
  const assign = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/assign`, payload: { displayId: randomUUID() } })
  assert.equal(assign.statusCode, 401)
  const nonAdminToken = await new SignJWT({ role: 'DRIVER' }).setProtectedHeader({ alg: 'HS256' }).setSubject(randomUUID()).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(config.jwtSecret))
  const forbidden = await app.inject({ method: 'POST', url: '/api/admin/layout-studio', headers: { authorization: `Bearer ${nonAdminToken}` }, payload: { name: 'not allowed', contract: {} } })
  assert.equal(forbidden.statusCode, 403)
  const invalidAdminSession = await new SignJWT({ role: 'SUPPORT' }).setProtectedHeader({ alg: 'HS256' }).setSubject(randomUUID()).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(config.jwtSecret))
  const rejectedSession = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/validate`, headers: { authorization: `Bearer ${invalidAdminSession}` }, payload: { expectedRowVersion: 1 } })
  assert.equal(rejectedSession.statusCode, 401)
  await app.close()
})
