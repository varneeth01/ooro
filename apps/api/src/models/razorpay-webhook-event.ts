import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  processedAt: Date,
  status: { type: String, enum: ['PROCESSED', 'FAILED'], required: true },
  error: String,
}, { collection: 'razorpay_webhook_events' })

export const RazorpayWebhookEventModel = mongoose.models.RazorpayWebhookEvent ?? mongoose.model('RazorpayWebhookEvent', schema)
