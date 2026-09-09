import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { normalizeIndianPhone } from './phone.js'
import { config } from '../config.js'
import { ApiError } from '../errors.js'
import { connectMongo } from '../lib/mongodb.js'
import { GuestCampaignOrderModel, type GuestCampaignOrder } from '../models/guest-campaign-order.js'
import { packageFor } from './campaign-packages.js'
import { hashSecret, randomSecret } from '../http.js'

export const guestOrderInput = z.object({ packageId: z.string().min(1), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), phone: z.string().trim().min(1).max(30), businessName: z.string().trim().min(2).max(160), gstin: z.string().trim().max(20).optional(), campaignNotes: z.string().trim().max(2000).optional(), websiteOrInstagram: z.string().trim().max(300).optional() })
export const normalizePhone = (value: string) => { const normalized = normalizeIndianPhone(value); if (!normalized) throw new ApiError('INVALID_PHONE', 'Enter a valid 10-digit Indian mobile number', 400); return normalized }

export const createRazorpayOrder = async (receipt: string, amount: number, notes: Record<string, string>) => {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) throw new ApiError('PAYMENT_PROVIDER_NOT_CONFIGURED', 'Payment setup is temporarily unavailable', 503)
  const productionRuntime = process.env.CONTEXT === 'production' || process.env.DEPLOY_CONTEXT === 'production' || process.env.NODE_ENV === 'production'
  if (config.razorpayKeyId.startsWith('rzp_live_') && !productionRuntime && !config.allowLiveRazorpayInDevelopment) throw new ApiError('LIVE_PAYMENT_KEYS_NOT_ALLOWED_IN_DEVELOPMENT', 'Live payment keys are not allowed in development', 503)
  console.info(JSON.stringify({ mode: config.razorpayKeyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST', packageId: notes.packageId, amountRupees: amount, amountPaise: amount * 100, orderNumber: receipt }))
  const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt, notes }) })
  if (!response.ok) throw new ApiError('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is temporarily unavailable', 503)
  return await response.json() as { id: string; amount: number; currency: string }
}
export const verifyCheckoutSignature = (orderId: string, paymentId: string, signature: string) => Boolean(config.razorpayKeySecret && createHmac('sha256', config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex') === signature)
export const verifyWebhookSignature = (raw: string, signature: string) => Boolean(config.razorpayWebhookSecret && createHmac('sha256', config.razorpayWebhookSecret).update(raw).digest('hex') === signature)

const mongoError = (error: unknown) => error instanceof Error && /MONGODB_URI|MongoServerSelectionError|MongooseServerSelectionError|MongooseError|ECONNREFUSED|buffering timed out|timed out/i.test(error.message)
export const isMongoError = mongoError
export async function createGuestOrder(data: { orderNumber: string; name: string; email: string; phone: string; businessName: string; gstin?: string; campaignNotes?: string; websiteOrInstagram?: string; packageId: string; city: string; autos: number; hoursPerDay: number; campaignDurationDays: number; amount: number; currency: string }) {
  await connectMongo()
  return GuestCampaignOrderModel.create({ ...data, status: 'CREATED' })
}
export async function attachRazorpayOrder(orderNumber: string, razorpayOrderId: string) { await connectMongo(); return GuestCampaignOrderModel.findOneAndUpdate({ orderNumber }, { razorpayOrderId, status: 'PAYMENT_PENDING' }, { new: true }) }
export async function findGuestOrder(orderNumber: string) { await connectMongo(); return GuestCampaignOrderModel.findOne({ orderNumber }) }
export async function findGuestOrderByRazorpayOrder(razorpayOrderId: string) { await connectMongo(); return GuestCampaignOrderModel.findOne({ razorpayOrderId }) }
export async function listGuestOrders(query: { status?: string; search?: string; skip: number; take: number }) {
  await connectMongo(); const filter: Record<string, unknown> = {}
  if (query.status) filter.status = query.status
  if (query.search) { const expression = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); const normalizedPhone = normalizeIndianPhone(query.search); filter.$or = [{ orderNumber: expression }, { email: expression }, { phone: expression }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : []), { businessName: expression }, { name: expression }] }
  return GuestCampaignOrderModel.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.take).lean()
}
export async function markOrderPaid(razorpayOrderId: string, paymentId: string) {
  await connectMongo(); const accessToken = randomSecret(32)
  const updated = await GuestCampaignOrderModel.findOneAndUpdate({ razorpayOrderId, status: { $nin: ['PAID', 'FULFILLED'] } }, { status: 'PAID', razorpayPaymentId: paymentId, paymentCapturedAt: new Date(), receiptNumber: `OR-${new Date().getFullYear()}-${randomSecret(5).toUpperCase()}`, receiptAccessTokenHash: hashSecret(accessToken) }, { new: true }).lean()
  if (updated) return { order: updated, accessToken }
  const existing = await GuestCampaignOrderModel.findOne({ razorpayOrderId }).lean()
  return existing ? { order: existing, accessToken: null } : null
}
export async function markOrderFailed(razorpayOrderId: string) { await connectMongo(); return GuestCampaignOrderModel.findOneAndUpdate({ razorpayOrderId, status: { $nin: ['PAID', 'FULFILLED'] } }, { status: 'PAYMENT_FAILED' }, { new: true }).lean() }
export async function updateGuestOrder(id: string, data: Record<string, unknown>) { await connectMongo(); return GuestCampaignOrderModel.findByIdAndUpdate(id, data, { new: true }).lean() }
export { packageFor }
export type { GuestCampaignOrder }
