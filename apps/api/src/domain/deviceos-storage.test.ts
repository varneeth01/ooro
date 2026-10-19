import assert from 'node:assert/strict'
import test from 'node:test'
import { createLocalDownloadSignature, isDeviceOsExistingObjectError, parseDeviceOsRange, sliceDeviceOsContent, verifyLocalDownloadSignature } from './deviceos-storage.js'

test('local DeviceOS download signatures expire and are key-bound', () => {
  const key = 'deviceos/app/release.apk'
  const expires = Math.floor(Date.now() / 1000) + 300
  const signature = createLocalDownloadSignature(key, expires)
  assert.equal(verifyLocalDownloadSignature(key, expires, signature), true)
  assert.equal(verifyLocalDownloadSignature('deviceos/other.apk', expires, signature), false)
  assert.equal(verifyLocalDownloadSignature(key, expires - 301, signature), false)
})

test('DeviceOS APK downloads support resumable byte ranges', () => {
  assert.deepEqual(parseDeviceOsRange('bytes=100-', 1000), { start: 100, end: 999 })
  assert.deepEqual(parseDeviceOsRange('bytes=100-199', 1000), { start: 100, end: 199 })
  assert.equal(parseDeviceOsRange(undefined, 1000), null)
  assert.equal(parseDeviceOsRange('bytes=1000-', 1000), 'INVALID')
  assert.equal(parseDeviceOsRange('bytes=200-100', 1000), 'INVALID')
  assert.deepEqual(sliceDeviceOsContent(Buffer.from('0123456789'), { start: 2, end: 5 }), Buffer.from('2345'))
})

test('content-addressed local storage treats only an existing object as an idempotent put', () => {
  assert.equal(isDeviceOsExistingObjectError({ code: 'EEXIST' }), true)
  assert.equal(isDeviceOsExistingObjectError({ code: 'EACCES' }), false)
  assert.equal(isDeviceOsExistingObjectError(new Error('existing')), false)
})
