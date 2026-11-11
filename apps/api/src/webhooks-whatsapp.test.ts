import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('WhatsApp webhook endpoints reject requests when webhook credentials are absent', () => {
  const script = `
    import { app } from './src/server.ts'
    const verification = await app.inject({ method: 'GET', url: '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=missing&hub.challenge=test' })
    const callback = await app.inject({ method: 'POST', url: '/api/webhooks/whatsapp', headers: { 'content-type': 'application/json' }, payload: {} })
    console.log(JSON.stringify({ verification: verification.statusCode, callback: callback.statusCode }))
    await app.close()
  `
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', script], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, NODE_ENV: 'development', OTP_PROVIDER: 'webhook', DEV_MOCK_OTP_ENABLED: 'true', WHATSAPP_APP_SECRET: '', WHATSAPP_WEBHOOK_VERIFY_TOKEN: '' },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /"verification":401/)
  assert.match(result.stdout, /"callback":401/)
})
