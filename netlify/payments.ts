import { randomUUID, timingSafeEqual, createHmac } from 'node:crypto'
import { z } from 'zod'
import { publicCampaignPackages, publicCampaignPackageFor } from '../lib/public-campaign-packages'
import { connectPublicMongo, publicMongoError, PublicCampaignOrderModel } from '../lib/public-campaign-orders'
import { createPublicRazorpayOrder, publicRazorpayErrorCode, publicRazorpayKeyId } from '../lib/public-razorpay'

type NetlifyEvent = {
  httpMethod?: string
  path?: string
  headers?: Record<string, string | undefined>
  body?: string | null
  isBase64Encoded?: boolean
}

type NetlifyResponse = { statusCode: number; headers?: Record<string, string>; body: string; isBase64Encoded?: boolean }

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
const response = (statusCode: number, data: unknown, error: unknown = null): NetlifyResponse => ({ statusCode, headers: jsonHeaders, body: JSON.stringify({ data, error }) })
const failure = (statusCode: number, code: string, message: string) => response(statusCode, null, { code, message })

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessName: z.string().trim().min(2).max(160),
  phone: z.string().trim().regex(/^(?:\+91[- ]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email().max(254),
  packageId: z.string().min(1),
  city: z.string().trim().min(2).max(100),
  campaignNotes: z.string().trim().max(2000).optional(),
})

const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

const readJson = (event: NetlifyEvent) => {
  if (!event.body) return null
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const normalizedPath = (path = '') => {
  const withoutQuery = path.split('?')[0]
  return withoutQuery
    .replace(/^\/.netlify\/functions\/payments/, '')
    .replace(/^\/api\/(?:public\/)?/, '/')
    .replace(/^\/$/, '') || '/'
}

const header = (event: NetlifyEvent, name: string) => Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? ''

const signatureMatches = (secret: string, value: string, signature: string) => {
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(value).digest('hex')
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

const orderId = () => `OORO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`

async function campaignPackages() {
  return response(200, publicCampaignPackages.filter((item) => item.active))
}

async function createCampaignOrder(event: NetlifyEvent) {
  const raw = readJson(event) as Record<string, unknown> | null
  const parsed = inputSchema.safeParse({
    ...raw,
    name: raw?.name ?? raw?.contactName,
    businessName: raw?.businessName ?? raw?.brandName,
  })
  if (!parsed.success) return failure(400, 'VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '))
  const input = parsed.data
  const selected = publicCampaignPackageFor(input.packageId)
  if (!selected || input.city.toLowerCase() !== selected.city.toLowerCase()) return failure(400, 'INVALID_PACKAGE', 'This campaign package is unavailable for the selected city')
  const normalizedPhone = input.phone.replace(/[ -]/g, '')
  const id = orderId()
  try {
    await connectPublicMongo()
    const saved = await PublicCampaignOrderModel.create({ orderId: id, brandName: input.businessName, contactName: input.name, phone: normalizedPhone, email: input.email.toLowerCase(), packageId: selected.id, packageName: selected.name, city: input.city, campaignNotes: input.campaignNotes, amount: selected.amount, currency: selected.currency, paymentStatus: 'PENDING' })
    try {
      const razorpay = await createPublicRazorpayOrder(id, selected.amount, { publicOrderId: id, packageId: selected.id })
      await PublicCampaignOrderModel.updateOne({ _id: saved._id }, { $set: { razorpayOrderId: razorpay.id } })
      return response(200, { orderId: id, razorpayOrderId: razorpay.id, keyId: publicRazorpayKeyId(), amount: razorpay.amount, currency: razorpay.currency, name: input.name, email: input.email.toLowerCase(), phone: normalizedPhone })
    } catch (error) {
      await PublicCampaignOrderModel.updateOne({ _id: saved._id }, { $set: { paymentStatus: 'FAILED' } })
      const code = publicRazorpayErrorCode(error)
      const message = code === 'RAZORPAY_MODE_NOT_CONFIGURED' ? 'Razorpay mode is not configured' : code === 'RAZORPAY_KEY_MODE_MISMATCH' ? 'Razorpay key does not match configured mode' : code === 'PAYMENT_PROVIDER_NOT_CONFIGURED' ? 'Payment setup is temporarily unavailable' : 'Payment provider is temporarily unavailable'
      return failure(503, code, message)
    }
  } catch (error) {
    console.error(JSON.stringify({ event: 'paymentOrderFailure', errorType: error instanceof Error ? error.name : 'unknown', mongo: publicMongoError(error) }))
    return failure(503, 'ORDER_STORAGE_UNAVAILABLE', 'Checkout storage is temporarily unavailable')
  }
}

async function verifyCampaignOrder(event: NetlifyEvent) {
  const raw = readJson(event) as Record<string, unknown> | null
  const parsed = verifySchema.safeParse({
    orderId: raw?.orderId ?? raw?.order_id,
    razorpayOrderId: raw?.razorpayOrderId ?? raw?.razorpay_order_id,
    razorpayPaymentId: raw?.razorpayPaymentId ?? raw?.razorpay_payment_id,
    razorpaySignature: raw?.razorpaySignature ?? raw?.razorpay_signature,
  })
  if (!parsed.success || !signatureMatches(process.env.RAZORPAY_KEY_SECRET ?? '', parsed.success ? `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}` : '', parsed.success ? parsed.data.razorpaySignature : '')) return failure(400, 'INVALID_PAYMENT_SIGNATURE', 'Payment could not be verified')
  try {
    await connectPublicMongo()
    const input = parsed.data
    const order = await PublicCampaignOrderModel.findOne({ orderId: input.orderId, razorpayOrderId: input.razorpayOrderId })
    if (!order) return failure(404, 'NOT_FOUND', 'Order not found')
    if (order.paymentStatus !== 'PAID') await PublicCampaignOrderModel.updateOne({ _id: order._id, paymentStatus: { $ne: 'PAID' } }, { $set: { paymentStatus: 'PAID', paymentId: input.razorpayPaymentId, razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() } })
    return response(200, { orderId: input.orderId, status: 'PAID' })
  } catch {
    return failure(503, 'ORDER_STORAGE_UNAVAILABLE', 'Checkout storage is temporarily unavailable')
  }
}

async function razorpayWebhook(event: NetlifyEvent) {
  const raw = event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64').toString('utf8') : event.body ?? ''
  if (!signatureMatches(process.env.RAZORPAY_WEBHOOK_SECRET ?? '', raw, header(event, 'x-razorpay-signature'))) return failure(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature could not be verified')
  let payload: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } } }
  try { payload = JSON.parse(raw) } catch { return failure(400, 'INVALID_WEBHOOK_PAYLOAD', 'Webhook payload is invalid') }
  const payment = payload.payload?.payment?.entity
  const razorpayOrderId = payment?.order_id ?? payload.payload?.order?.entity?.id
  if (razorpayOrderId && (payload.event === 'payment.captured' || payload.event === 'order.paid')) {
    await connectPublicMongo()
    await PublicCampaignOrderModel.findOneAndUpdate({ razorpayOrderId }, { $set: { paymentStatus: 'PAID', paymentId: payment?.id, razorpayPaymentId: payment?.id, paidAt: new Date() } })
  } else if (razorpayOrderId && payload.event === 'payment.failed') {
    await connectPublicMongo()
    await PublicCampaignOrderModel.findOneAndUpdate({ razorpayOrderId, paymentStatus: { $ne: 'PAID' } }, { $set: { paymentStatus: 'FAILED' } })
  }
  return response(200, { received: true })
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const path = normalizedPath(event.path)
  try {
    if (event.httpMethod === 'GET' && path === '/campaign-packages') return campaignPackages()
    if (event.httpMethod === 'POST' && path === '/campaign-orders') return createCampaignOrder(event)
    if (event.httpMethod === 'POST' && path === '/campaign-orders/verify') return verifyCampaignOrder(event)
    if (event.httpMethod === 'POST' && path === '/webhooks/razorpay') return razorpayWebhook(event)
    return failure(404, 'NOT_FOUND', 'Payment route not found')
  } catch (error) {
    console.error(JSON.stringify({ event: 'paymentFunctionFailure', path, errorType: error instanceof Error ? error.name : 'unknown' }))
    return failure(503, 'PAYMENT_SERVICE_UNAVAILABLE', 'Payment service is temporarily unavailable')
  }
}
