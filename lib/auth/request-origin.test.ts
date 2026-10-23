import assert from 'node:assert/strict'
import test from 'node:test'
import { isAcceptedAdminRequestOrigin } from './request-origin.js'

const base = {
  origin: 'https://staging.theooro.com',
  referer: 'https://staging.theooro.com/admin/login',
  host: 'staging.theooro.com',
  forwardedHost: null,
  requestOrigin: 'http://localhost:3000',
}

test('admin CSRF: public origin behind Coolify proxy is accepted', () => {
  assert.equal(isAcceptedAdminRequestOrigin(base), true)
  assert.equal(isAcceptedAdminRequestOrigin({ ...base, host: 'localhost:3000', forwardedHost: 'staging.theooro.com' }), true)
})

test('admin CSRF: unexpected origins and spoofed near-match domains are rejected', () => {
  for (const origin of ['https://evil.example', 'https://staging.theooro.com.evil.example', 'https://staging.theooro.com@evil.example', 'http://staging.theooro.com', 'null']) {
    assert.equal(isAcceptedAdminRequestOrigin({ ...base, origin }), false, origin)
  }
})

test('admin CSRF: mismatched Origin cannot be overridden by valid Referer', () => {
  assert.equal(isAcceptedAdminRequestOrigin({ ...base, origin: 'https://evil.example' }), false)
})

test('admin CSRF: strict referer fallback, missing metadata and malformed forwarded hosts', () => {
  assert.equal(isAcceptedAdminRequestOrigin({ ...base, origin: null }), true)
  assert.equal(isAcceptedAdminRequestOrigin({ ...base, origin: null, referer: null }), false)
  assert.equal(isAcceptedAdminRequestOrigin({ ...base, host: null, forwardedHost: 'evil.example, staging.theooro.com', requestOrigin: 'http://localhost:3000' }), false)
})

test('admin CSRF: local development may use HTTP localhost but not remote insecure origins', () => {
  assert.equal(isAcceptedAdminRequestOrigin({ origin: 'http://localhost:3000', referer: null, host: 'localhost:3000', forwardedHost: null, requestOrigin: 'http://localhost:3000' }), true)
})
