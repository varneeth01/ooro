import test from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'
import { app } from './server.js'
import { config } from './config.js'

test('device and ad-push endpoints reject unauthenticated callers', async () => {
  const manifest = await app.inject({ method: 'GET', url: '/api/device/manifest' })
  assert.equal(manifest.statusCode, 401)
  const push = await app.inject({ method: 'POST', url: '/api/admin/displays/00000000-0000-4000-8000-000000000001/commands', payload: { commandType: 'REFRESH_MANIFEST' } })
  assert.equal(push.statusCode, 401)
})

test('non-admin role cannot create screen commands', async () => {
  const token = await new SignJWT({ role: 'DRIVER' }).setProtectedHeader({ alg: 'HS256' }).setSubject('driver-test').setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(config.jwtSecret))
  const response = await app.inject({ method: 'POST', url: '/api/admin/displays/00000000-0000-4000-8000-000000000001/commands', headers: { authorization: `Bearer ${token}` }, payload: { commandType: 'REFRESH_MANIFEST' } })
  assert.equal(response.statusCode, 403)
})

for (const role of ['BUSINESS','BRAND','AGENCY','NETWORK','EXPLORER']) test(`${role} cannot access direct admin APIs`,async()=>{
 const token=await new SignJWT({role}).setProtectedHeader({alg:'HS256'}).setSubject('customer-test').setExpirationTime('5m').sign(new TextEncoder().encode(config.jwtSecret))
 for(const url of ['/api/admin/displays','/api/admin/scheduler','/api/admin/proof-of-play','/api/admin/overview']) {
  const result=await app.inject({method:'GET',url,headers:{authorization:`Bearer ${token}`}})
  assert.equal(result.statusCode,403,`${role} ${url}`)
 }
})
