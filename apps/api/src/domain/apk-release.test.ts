import assert from 'node:assert/strict'
import test from 'node:test'
import { assertApkMetadataCompatibility, assertSigningCertificateContinuity, decodeApkBase64, inspectApk } from './apk-release.js'

const hasCode = (code: string) => (error: unknown): boolean => error !== null && typeof error === 'object' && 'code' in error && error.code === code

test('APK inspection rejects an empty upload before invoking external tooling', async () => {
  await assert.rejects(inspectApk(Buffer.alloc(0)), hasCode('APK_SIZE_INVALID'))
})

test('APK inspection rejects non-ZIP content', async () => {
  await assert.rejects(inspectApk(Buffer.from('this is not an apk')), hasCode('INVALID_APK'))
})

test('APK inspection reports unavailable metadata tooling for a ZIP-shaped invalid APK', async () => {
  await assert.rejects(inspectApk(Buffer.from('PK\x03\x04not-a-real-apk')), hasCode('APK_METADATA_UNAVAILABLE'))
})

test('APK release lineage rejects signing certificate changes', () => {
  assert.doesNotThrow(() => assertSigningCertificateContinuity('ab'.repeat(32), 'AB'.repeat(32)))
  assert.throws(() => assertSigningCertificateContinuity('ab'.repeat(32), 'cd'.repeat(32)), hasCode('APK_SIGNING_CERTIFICATE_CHANGED'))
  assert.doesNotThrow(() => assertSigningCertificateContinuity(undefined, 'cd'.repeat(32)))
})

test('APK metadata rejects non-positive versions and inconsistent SDK levels', () => {
  assert.throws(() => assertApkMetadataCompatibility({ versionCode: 0n, minSdk: 26, targetSdk: 35 }), hasCode('INVALID_APK_METADATA'))
  assert.throws(() => assertApkMetadataCompatibility({ versionCode: 1n, minSdk: 35, targetSdk: 34 }), hasCode('INVALID_APK_METADATA'))
  assert.doesNotThrow(() => assertApkMetadataCompatibility({ versionCode: 1n, minSdk: 26, targetSdk: 35 }))
})

test('APK base64 decoding rejects malformed input instead of silently truncating it', () => {
  assert.deepEqual(decodeApkBase64(Buffer.from('PK').toString('base64')), Buffer.from('PK'))
  assert.throws(() => decodeApkBase64('not-base64!'), hasCode('APK_ENCODING_INVALID'))
  assert.throws(() => decodeApkBase64('AAAA==='), hasCode('APK_ENCODING_INVALID'))
})
