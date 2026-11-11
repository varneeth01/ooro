import { config } from '../config.js'
import { ApiError } from '../errors.js'

type OtpRequest = { url: string; headers: Record<string, string>; body: Record<string, unknown> }
type JsonObject = Record<string, unknown>
export type OtpDeliveryResult = { provider: string; messageId?: string; status: 'ACCEPTED' | 'SKIPPED_TEST' }
class ProviderFailure extends Error { constructor(public readonly code: string, message: string) { super(message) } }
let templateCache: { expiresAt: number; valid: boolean } | undefined

const whatsappRecipient = (phone: string) => { const digits = phone.replace(/^\+/, ''); return /^\d{10}$/.test(digits) ? `91${digits}` : digits }

export function buildOtpRequest(phone: string, code: string): OtpRequest {
  if (config.otpProvider === 'whatsapp_cloud') return {
    url: `https://graph.facebook.com/${config.whatsappGraphApiVersion}/${config.whatsappPhoneNumberId}/messages`,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.whatsappAccessToken}` },
    body: { messaging_product: 'whatsapp', recipient_type: 'individual', to: whatsappRecipient(phone), type: 'template', template: { name: config.whatsappOtpTemplateName, language: { code: config.whatsappOtpTemplateLanguage }, components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }] } },
  }
  if (config.otpProvider === 'msg91') return { url: config.msg91DeliveryUrl, headers: { 'content-type': 'application/json', authkey: config.msg91AuthKey }, body: { template_id: config.msg91TemplateId, mobile: phone.replace(/^\+/, ''), otp: code, ...(config.msg91SenderId ? { sender: config.msg91SenderId } : {}), otp_expiry: Math.ceil(config.otpTtlSeconds / 60) } }
  return { url: config.otpDeliveryUrl, headers: { 'content-type': 'application/json', authorization: `Bearer ${config.otpDeliveryToken}` }, body: { phone, code, expiresInSeconds: config.otpTtlSeconds } }
}

async function jsonFetch(url: string, init: RequestInit) {
  if (!url.startsWith('https://')) throw new ProviderFailure('OTP_PROVIDER_INVALID', 'OTP provider endpoint must use HTTPS')
  try { const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), redirect: 'error' }); const payload = await response.json().catch(() => null) as JsonObject | null; const providerError = payload?.error as JsonObject | undefined; if (!response.ok) throw new ProviderFailure(typeof providerError?.code === 'string' || typeof providerError?.code === 'number' ? `WHATSAPP_${providerError.code}` : 'OTP_DELIVERY_FAILED', 'OTP provider rejected the request'); return payload } catch (error) { if (error instanceof ProviderFailure) throw error; throw new ProviderFailure('OTP_DELIVERY_UNAVAILABLE', 'OTP provider did not respond') }
}

async function verifyWhatsAppTemplate() {
  if (templateCache && templateCache.expiresAt > Date.now()) { if (!templateCache.valid) throw new ProviderFailure('WHATSAPP_TEMPLATE_NOT_APPROVED', 'WhatsApp OTP template is not approved'); return }
  const url = `https://graph.facebook.com/${config.whatsappGraphApiVersion}/${config.whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(config.whatsappOtpTemplateName)}&fields=name,status,category,language,components`
  const payload = await jsonFetch(url, { method: 'GET', headers: { authorization: `Bearer ${config.whatsappAccessToken}` } })
  const templates = Array.isArray(payload?.data) ? payload.data.filter((item): item is JsonObject => Boolean(item && typeof item === 'object')) : []
  const template = templates.find((item) => item.name === config.whatsappOtpTemplateName && item.language === config.whatsappOtpTemplateLanguage)
  const components = Array.isArray(template?.components) ? template.components.filter((item): item is JsonObject => Boolean(item && typeof item === 'object')) : []
  const buttonComponent = components.find((component) => component.type === 'BUTTONS')
  const buttons = Array.isArray(buttonComponent?.buttons) ? buttonComponent.buttons.filter((item): item is JsonObject => Boolean(item && typeof item === 'object')) : []
  const copyCode = buttons.some((button) => button.otp_type === 'COPY_CODE' || (button.type === 'OTP' && button.otp_type === 'COPY_CODE'))
  const valid = template?.status === 'APPROVED' && template?.category === 'AUTHENTICATION' && copyCode
  templateCache = { expiresAt: Date.now() + 5 * 60_000, valid }
  if (!valid) throw new ProviderFailure('WHATSAPP_TEMPLATE_NOT_APPROVED', 'WhatsApp OTP template is not approved')
}

export function resetWhatsAppTemplateCache() { templateCache = undefined }

async function send(request: OtpRequest) { const payload = await jsonFetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) }); const messages = Array.isArray(payload?.messages) ? payload.messages.filter((item): item is JsonObject => Boolean(item && typeof item === 'object')) : []; const messageId = messages[0]?.id; if (typeof messageId !== 'string' || !messageId) throw new ProviderFailure('OTP_DELIVERY_FAILED', 'OTP provider did not accept a message identifier'); return messageId }

// Provider responses and errors intentionally omit the OTP, access token, and phone number.
export async function deliverOtp(phone: string, code: string): Promise<OtpDeliveryResult> {
  if (config.nodeEnv !== 'production' && config.devMockOtpEnabled) return { provider: 'development_mock', status: 'SKIPPED_TEST' }
  if (config.stagingOtpTestMode && phone === config.stagingOtpTestPhone) return { provider: 'staging_test', status: 'SKIPPED_TEST' }
  try { if (config.otpProvider === 'whatsapp_cloud') await verifyWhatsAppTemplate(); const messageId = await send(buildOtpRequest(phone, code)); return { provider: config.otpProvider, messageId, status: 'ACCEPTED' } } catch (error) { if (error instanceof ProviderFailure) throw new ApiError(error.code, error.message, 503); throw new ApiError('OTP_DELIVERY_UNAVAILABLE', 'Unable to deliver verification code. Retry later.', 503) }
}
