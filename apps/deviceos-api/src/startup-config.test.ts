import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import path from 'node:path'

describe('DeviceOS API startup configuration', () => {
  it('starts without Main API email credentials', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', "import('./src/config.ts')"], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://test:test@db.example.test:5432/test', JWT_SECRET: 'x'.repeat(48), DEVICEOS_STORAGE_MODE: 's3', DEVICEOS_S3_BUCKET: 'deviceos-test', DEVICEOS_S3_ENDPOINT: 'https://r2.example.test', DEVICEOS_S3_ACCESS_KEY_ID: 'test-only', DEVICEOS_S3_SECRET_ACCESS_KEY: 'test-only', EMAIL_PROVIDER_API_KEY: '' },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
  })
})
