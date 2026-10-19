import { config } from '../config.js'
import { ApiError } from '../errors.js'

// Integrate the operator's SMS gateway without returning production OTPs to browsers.
export async function deliverOtp(phone: string, code: string) {
 if (config.nodeEnv !== 'production' && config.devMockOtpEnabled) return
 const endpoint=process.env.OORO_OTP_DELIVERY_URL
 const token=process.env.OORO_OTP_DELIVERY_TOKEN
 if (!endpoint || !token || !endpoint.startsWith('https://')) throw new ApiError('OTP_DELIVERY_UNAVAILABLE','SMS delivery is not configured',503)
 try {
  const result=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({phone,code,expiresInSeconds:config.otpTtlSeconds}),signal:AbortSignal.timeout(10000),redirect:'error'})
  if(!result.ok) throw new Error('delivery failed')
 }catch{throw new ApiError('OTP_DELIVERY_UNAVAILABLE','Unable to deliver verification code. Retry later.',503)}
}
