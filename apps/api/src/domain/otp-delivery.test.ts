/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

process.env.NODE_ENV = 'production'
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test'
process.env.JWT_SECRET = 'x'.repeat(40)
process.env.DEV_MOCK_OTP_ENABLED = 'false'
process.env.EMAIL_PROVIDER_API_KEY = 'test'
process.env.ADMIN_WEB_BASE_URL = 'https://admin.example.test'
process.env.DEVICEOS_STORAGE_MODE = 's3'
process.env.DEVICEOS_S3_BUCKET = 'test'
process.env.DEVICEOS_S3_ACCESS_KEY_ID = 'test'
process.env.DEVICEOS_S3_SECRET_ACCESS_KEY = 'test'
process.env.DOCUMENT_STORAGE_MODE = 's3'
process.env.DOCUMENT_STORAGE_KEY = 'x'.repeat(40)
process.env.DOCUMENT_STORAGE_BUCKET = 'test'
process.env.DOCUMENT_STORAGE_ACCESS_KEY_ID = 'test'
process.env.DOCUMENT_STORAGE_SECRET_ACCESS_KEY = 'test'
process.env.DOCUMENT_SCAN_MODE = 'remote'
process.env.OTP_PROVIDER = 'whatsapp_cloud'
process.env.WHATSAPP_ACCESS_TOKEN = 'server-token'
process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id'
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'business-id'
process.env.WHATSAPP_OTP_TEMPLATE_NAME = 'ooro_driver_login'
process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE = 'en_US'
process.env.WHATSAPP_GRAPH_API_VERSION = 'v25.0'

const { deliverOtp, resetWhatsAppTemplateCache, buildOtpRequest } = await import('./otp-delivery.js')

const approvedTemplate = { data: [{ name: 'ooro_driver_login', language: 'en_US', status: 'APPROVED', category: 'AUTHENTICATION', components: [{ type: 'BUTTONS', buttons: [{ type: 'URL', otp_type: 'COPY_CODE' }] }] }] }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => { resetWhatsAppTemplateCache(); delete (globalThis as any).fetch })

test('WhatsApp OTP uses Meta authentication copy-code payload and records accepted message', async () => {
  const calls: Array<{ url: string; body?: any }> = []
  ;(globalThis as any).fetch = async (url: string, init: RequestInit) => { calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : undefined }); return calls.length === 1 ? response(approvedTemplate) : response({ messages: [{ id: 'wamid.test' }] }) }
  const result = await deliverOtp('9876543210', '123456')
  assert.deepEqual(result, { provider: 'whatsapp_cloud', messageId: 'wamid.test', status: 'ACCEPTED' })
  assert.equal(calls[0].url, 'https://graph.facebook.com/v25.0/business-id/message_templates?name=ooro_driver_login&fields=name,status,category,language,components')
  assert.equal(calls[1].url, 'https://graph.facebook.com/v25.0/phone-id/messages')
  assert.deepEqual(calls[1].body.template.components, [{ type: 'body', parameters: [{ type: 'text', text: '123456' }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] }])
  assert.equal(calls[1].body.to, '919876543210')
  assert.equal(buildOtpRequest('9876543210', '123456').headers.authorization, 'Bearer server-token')
})

test('invalid Meta credentials fail closed', async () => {
  ;(globalThis as any).fetch = async () => response({ error: { code: 190 } }, 401)
  await assert.rejects(deliverOtp('9876543210', '123456'), (error: any) => error.code === 'WHATSAPP_190' && error.statusCode === 503)
})

test('unapproved authentication template is rejected before sending', async () => {
  ;(globalThis as any).fetch = async () => response({ data: [{ name: 'ooro_driver_login', language: 'en_US', status: 'PENDING', category: 'AUTHENTICATION', components: [] }] })
  await assert.rejects(deliverOtp('9876543210', '123456'), (error: any) => error.code === 'WHATSAPP_TEMPLATE_NOT_APPROVED')
})

test('Meta timeout and accepted-message failure are distinct', async () => {
  ;(globalThis as any).fetch = async () => { throw new Error('timeout') }
  await assert.rejects(deliverOtp('9876543210', '123456'), (error: any) => error.code === 'OTP_DELIVERY_UNAVAILABLE')
  resetWhatsAppTemplateCache()
  let calls = 0
  ;(globalThis as any).fetch = async () => { calls += 1; return calls === 1 ? response(approvedTemplate) : response({ error: { code: 131000 } }, 400) }
  await assert.rejects(deliverOtp('9876543210', '123456'), (error: any) => error.code === 'WHATSAPP_131000')
})
