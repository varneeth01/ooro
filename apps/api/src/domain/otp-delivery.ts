import { config } from '../config.js'
import { ApiError } from '../errors.js'

type OtpRequest = { url: string; headers: Record<string, string>; body: Record<string, unknown> }

export function buildOtpRequest(phone: string, code: string): OtpRequest {
  if (config.otpProvider === 'msg91') return {
    url: config.msg91DeliveryUrl,
    headers: { 'content-type': 'application/json', authkey: config.msg91AuthKey },
    body: { template_id: config.msg91TemplateId, mobile: phone.replace(/^\+/, ''), otp: code, ...(config.msg91SenderId ? { sender: config.msg91SenderId } : {}), otp_expiry: Math.ceil(config.otpTtlSeconds / 60) },
  }
  return { url: config.otpDeliveryUrl, headers: { 'content-type': 'application/json', authorization: `Bearer ${config.otpDeliveryToken}` }, body: { phone, code, expiresInSeconds: config.otpTtlSeconds } }
}

async function send(request: OtpRequest) {
  if (!request.url.startsWith('https://')) throw new Error('OTP provider endpoint must use HTTPS')
  const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body), signal: AbortSignal.timeout(10_000), redirect: 'error' })
  if (!response.ok) throw new Error(`OTP provider returned HTTP ${response.status}`)
}

// Provider responses and errors intentionally omit the OTP and phone number.
export async function deliverOtp(phone: string, code: string) {
  if (config.nodeEnv !== 'production' && config.devMockOtpEnabled) return
  if (config.stagingOtpTestMode && phone === config.stagingOtpTestPhone) return
  try { await send(buildOtpRequest(phone, code)) } catch { throw new ApiError('OTP_DELIVERY_UNAVAILABLE', 'Unable to deliver verification code. Retry later.', 503) }
}
