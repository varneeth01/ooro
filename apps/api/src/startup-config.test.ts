import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import path from 'node:path'

describe('Main API startup configuration', () => {
  it('starts in production without DeviceOS storage credentials', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', "import('./src/config.ts')"], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://test:test@db.example.test:5432/test', JWT_SECRET: 'x'.repeat(48), DEV_MOCK_OTP_ENABLED: 'false', OTP_PROVIDER: 'webhook', OORO_OTP_DELIVERY_URL: 'https://otp-gateway.example.test/send', OORO_OTP_DELIVERY_TOKEN: 'test-only', EMAIL_PROVIDER_API_KEY: 'test-only', ADMIN_WEB_BASE_URL: 'https://admin.example.test', DOCUMENT_STORAGE_MODE: 's3', DOCUMENT_STORAGE_KEY: 'd'.repeat(48), DOCUMENT_STORAGE_BUCKET: 'test-private-documents', DOCUMENT_STORAGE_ACCESS_KEY_ID: 'test-access-key', DOCUMENT_STORAGE_SECRET_ACCESS_KEY: 'test-secret-key', DOCUMENT_SCAN_MODE: 'remote', DEVICEOS_STORAGE_MODE: '', DEVICEOS_S3_BUCKET: '', DEVICEOS_S3_ENDPOINT: '', DEVICEOS_S3_ACCESS_KEY_ID: '', DEVICEOS_S3_SECRET_ACCESS_KEY: '' },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
  })
})
