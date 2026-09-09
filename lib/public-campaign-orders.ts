import mongoose, { type InferSchemaType } from "mongoose";

const schema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  brandName: { type: String, required: true, index: true },
  contactName: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  packageId: { type: String, required: true },
  packageName: { type: String, required: true },
  city: { type: String, required: true },
  campaignNotes: String,
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: "INR" },
  razorpayOrderId: { type: String, index: true, sparse: true },
  paymentLinkId: { type: String, index: true, sparse: true },
  paymentId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], required: true, index: true },
  paidAt: Date,
}, { timestamps: true, collection: "public_campaign_orders" });

export type PublicCampaignOrder = InferSchemaType<typeof schema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const PublicCampaignOrderModel = mongoose.models.PublicCampaignOrder ?? mongoose.model("PublicCampaignOrder", schema);

let connection: Promise<typeof mongoose> | null = null;
export async function connectPublicMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (mongoose.connection.readyState === 1) return mongoose;
  connection ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).catch((error) => { connection = null; throw error; });
  return connection;
}

export const publicMongoError = (error: unknown) => error instanceof Error && /MONGODB_URI|MongoServerSelectionError|MongooseServerSelectionError|MongooseError|ECONNREFUSED|buffering timed out|timed out/i.test(error.message);
