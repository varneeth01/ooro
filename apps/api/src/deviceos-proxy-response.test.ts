import assert from 'node:assert/strict'
import test from 'node:test'
import { deviceOsProxyFailure, readDeviceOsJson } from './domain/deviceos-proxy-response.js'

test('DeviceOS proxy preserves a successful empty applications response', async () => {
  const result = await readDeviceOsJson(new Response(JSON.stringify({ data: [], error: null }), { status: 200 }), 'req-empty')
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { data: [], error: null })
})

test('DeviceOS proxy preserves upstream authorization and backend status with correlation ID', async () => {
  for (const status of [401, 403, 500]) {
    const payload = { data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'FORBIDDEN', message: 'Request failed' }, requestId: 'api-req-1' }
    const result = await readDeviceOsJson(new Response(JSON.stringify(payload), { status }), 'web-req-1')
    assert.equal(result.status, status)
    assert.deepEqual(result.body, payload)
  }
})

test('DeviceOS proxy converts invalid upstream bodies and transport failures to correlated 502 responses', async () => {
  const invalid = await readDeviceOsJson(new Response('<html>upstream failure</html>', { status: 500 }), 'web-req-invalid')
  assert.equal(invalid.status, 502)
  assert.deepEqual(invalid.body, {
    data: null,
    error: { code: 'DEVICEOS_INVALID_RESPONSE', message: 'DeviceOS service returned an invalid response' },
    requestId: 'web-req-invalid',
  })

  assert.deepEqual(deviceOsProxyFailure(undefined, 'web-req-network'), {
    status: 502,
    body: { data: null, error: { code: 'DEVICEOS_BACKEND_UNAVAILABLE', message: 'DEVICEOS_BACKEND_UNAVAILABLE' }, requestId: 'web-req-network' },
  })
  assert.equal(deviceOsProxyFailure({ status: 401, code: 'SESSION_EXPIRED' }, 'web-req-auth').status, 401)
  assert.equal(deviceOsProxyFailure({ status: 403, code: 'ADMIN_ACCESS_DENIED' }, 'web-req-forbidden').status, 403)
  assert.equal(deviceOsProxyFailure({ status: 502, code: 'ADMIN_BACKEND_UNAVAILABLE' }, 'web-req-config').body.error.code, 'ADMIN_BACKEND_UNAVAILABLE')
})
