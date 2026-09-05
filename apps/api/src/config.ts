import 'dotenv/config'

const bool = (value: string | undefined, fallback = false) => value === undefined ? fallback : value === 'true'
const list = (value: string | undefined) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []

const defaultCorsOrigins = ['https://theooro.com', 'https://www.theooro.com']
const developmentCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ooro:ooro@localhost:5432/ooro',
  mongodbUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  devMockOtpEnabled: bool(process.env.DEV_MOCK_OTP_ENABLED, true),
  devMockOtp: process.env.DEV_MOCK_OTP ?? '000000',
  heartbeatOnlineSeconds: Number(process.env.HEARTBEAT_ONLINE_SECONDS ?? 30),
  heartbeatDegradedSeconds: Number(process.env.HEARTBEAT_DEGRADED_SECONDS ?? 90),
  payoutMinimumMinor: BigInt(process.env.PAYOUT_MINIMUM_MINOR ?? '1000'),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  allowLiveRazorpayInDevelopment: bool(process.env.ALLOW_LIVE_RAZORPAY_IN_DEVELOPMENT),
  emailFrom: process.env.EMAIL_FROM ?? 'OORO <hello@ooro.in>',
  emailProviderApiKey: process.env.EMAIL_PROVIDER_API_KEY ?? '',
  corsOrigins: process.env.NODE_ENV === 'production'
    ? [...defaultCorsOrigins, ...list(process.env.CORS_ORIGINS)]
    : [...developmentCorsOrigins, ...list(process.env.CORS_ORIGINS)],
}

if (config.nodeEnv === 'production') {
  if (config.jwtSecret === 'development-only-change-me') throw new Error('JWT_SECRET must be configured in production')
  if (config.devMockOtpEnabled) throw new Error('DEV_MOCK_OTP_ENABLED must be false in production')
}
