import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const requiredProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://test:test@db.example.test:5432/test',
  JWT_SECRET: 'x'.repeat(40),
  DEV_MOCK_OTP_ENABLED: 'false',
  EMAIL_PROVIDER_API_KEY: 'test',
  ADMIN_WEB_BASE_URL: 'https://admin.example.test',
  DEVICEOS_STORAGE_MODE: 's3',
  DEVICEOS_S3_BUCKET: 'test',
  DEVICEOS_S3_ACCESS_KEY_ID: 'test',
  DEVICEOS_S3_SECRET_ACCESS_KEY: 'test',
  DOCUMENT_STORAGE_MODE: 's3',
  DOCUMENT_STORAGE_KEY: 'x'.repeat(40),
  DOCUMENT_STORAGE_BUCKET: 'test',
  DOCUMENT_STORAGE_ACCESS_KEY_ID: 'test',
  DOCUMENT_STORAGE_SECRET_ACCESS_KEY: 'test',
  DOCUMENT_SCAN_MODE: 'remote',
} as const

const whatsappVariables = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_OTP_TEMPLATE_NAME',
  'WHATSAPP_OTP_TEMPLATE_LANGUAGE',
  'WHATSAPP_GRAPH_API_VERSION',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
]

function loadConfig(overrides: Record<string, string | undefined>) {
  const env: Record<string, string> = { ...process.env as Record<string, string>, ...requiredProductionEnv }
  for (const name of whatsappVariables) delete env[name]
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[name]
    else env[name] = value
  }
  return spawnSync(process.execPath, ['--import', 'tsx', '--eval', "import('./src/config.ts')"], {
    cwd: new URL('..', import.meta.url).pathname,
    env,
    encoding: 'utf8',
  })
}

test('production starts with the existing webhook OTP provider when WhatsApp variables are absent', () => {
  const result = loadConfig({
    OTP_PROVIDER: 'webhook',
    OORO_OTP_DELIVERY_URL: 'https://otp-gateway.example.test/send',
    OORO_OTP_DELIVERY_TOKEN: 'existing-webhook-token',
  })
  assert.equal(result.status, 0, result.stderr)
})

test('production starts with Email and Google driver auth configured and no WhatsApp variables', () => {
  const result = loadConfig({
    OTP_PROVIDER: 'webhook',
    OORO_OTP_DELIVERY_URL: 'https://otp-gateway.example.test/send',
    OORO_OTP_DELIVERY_TOKEN: 'existing-webhook-token',
    DRIVER_AUTH_EMAIL_ENABLED: 'true',
    DRIVER_AUTH_GOOGLE_ENABLED: 'true',
    GOOGLE_WEB_CLIENT_ID: '123456789.apps.googleusercontent.com',
  })
  assert.equal(result.status, 0, result.stderr)
})

test('production starts with phone auth disabled and no legacy OTP provider variables', () => {
  const result = loadConfig({
    OTP_PROVIDER: undefined,
    OORO_OTP_DELIVERY_URL: undefined,
    OORO_OTP_DELIVERY_TOKEN: undefined,
    DRIVER_AUTH_PHONE_ENABLED: 'false',
    DRIVER_AUTH_EMAIL_ENABLED: 'true',
    DRIVER_AUTH_GOOGLE_ENABLED: 'true',
    GOOGLE_WEB_CLIENT_ID: '123456789.apps.googleusercontent.com',
  })
  assert.equal(result.status, 0, result.stderr)
})

test('production fails closed when WhatsApp is selected without required delivery credentials', () => {
  const result = loadConfig({ OTP_PROVIDER: 'whatsapp_cloud' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /WhatsApp Cloud OTP configuration is incomplete/)
})
