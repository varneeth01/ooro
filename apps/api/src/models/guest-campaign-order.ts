import mongoose, { type InferSchemaType } from 'mongoose'

const guestCampaignOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, index: true },
  phone: { type: String, required: true, match: /^\+91[6-9]\d{9}$/, index: true },
  businessName: { type: String, required: true, index: true },
  gstin: String,
  campaignNotes: String,
  websiteOrInstagram: String,
  packageId: { type: String, required: true },
  city: { type: String, required: true },
  autos: { type: Number, required: true },
  hoursPerDay: { type: Number, required: true },
  campaignDurationDays: { type: Number, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'INR' },
  status: { type: String, enum: ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'FULFILLED'], required: true, index: true },
  razorpayOrderId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  paymentCapturedAt: Date,
  receiptNumber: String,
  emailDeliveryStatus: { type: String, default: 'PENDING' },
  emailLastError: String,
  receiptAccessTokenHash: String,
  campaignId: String,
}, { timestamps: true, collection: 'guest_campaign_orders' })

guestCampaignOrderSchema.index({ status: 1, createdAt: -1 })

export type GuestCampaignOrder = InferSchemaType<typeof guestCampaignOrderSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date }
export const GuestCampaignOrderModel = mongoose.models.GuestCampaignOrder ?? mongoose.model('GuestCampaignOrder', guestCampaignOrderSchema)
