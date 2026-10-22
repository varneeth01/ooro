import { normalizeIndianPhone } from './phone.js'
import { connectMongo } from '../lib/mongodb.js'
import { GuestCampaignOrderModel, type GuestCampaignOrder } from '../models/guest-campaign-order.js'

// Historical order access only. No provider creation, capture, verification,
// webhook mutation, or new order persistence is exposed from this module.
const mongoError = (error: unknown) => error instanceof Error && /MONGODB_URI|MongoServerSelectionError|MongooseServerSelectionError|MongooseError|ECONNREFUSED|buffering timed out|timed out/i.test(error.message)
export const isMongoError = mongoError
export async function findGuestOrder(orderNumber: string) { await connectMongo(); return GuestCampaignOrderModel.findOne({ orderNumber }).lean() }
export async function listGuestOrders(query: { status?: string; search?: string; skip: number; take: number }) {
  await connectMongo(); const filter: Record<string, unknown> = {}
  if (query.status) filter.status = query.status
  if (query.search) { const expression = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); const normalizedPhone = normalizeIndianPhone(query.search); filter.$or = [{ orderNumber: expression }, { email: expression }, { phone: expression }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : []), { businessName: expression }, { name: expression }] }
  return GuestCampaignOrderModel.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.take).lean()
}
export type { GuestCampaignOrder }
