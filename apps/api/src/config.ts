import 'dotenv/config'

const bool = (value: string | undefined, fallback = false) => value === undefined ? fallback : value === 'true'
const list = (value: string | undefined) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []

const defaultCorsOrigins = ['https://theooro.com', 'https://www.theooro.com']
const developmentCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 8080),
  trackingBaseUrl: (process.env.TRACKING_BASE_URL ?? 'https://theooro.com').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ooro:ooro@localhost:5432/ooro',
  mongodbUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  devMockOtpEnabled: bool(process.env.DEV_MOCK_OTP_ENABLED, true),
  devMockOtp: process.env.DEV_MOCK_OTP ?? '000000',
  heartbeatOnlineSeconds: Number(process.env.HEARTBEAT_ONLINE_SECONDS ?? 90),
  heartbeatDegradedSeconds: Number(process.env.HEARTBEAT_DEGRADED_SECONDS ?? 300),
  payoutMinimumMinor: BigInt(process.env.PAYOUT_MINIMUM_MINOR ?? '1000'),
  emailFrom: process.env.EMAIL_FROM ?? 'OORO <hello@ooro.in>',
  emailProviderApiKey: process.env.EMAIL_PROVIDER_API_KEY ?? '',
  adminWebBaseUrl: (process.env.ADMIN_WEB_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  adminPasswordResetTtlSeconds: 600, // Hard security limit: reset links expire 10 minutes after issuance.,
  adminPasswordSetupTtlSeconds: Number(process.env.ADMIN_PASSWORD_SETUP_TTL_SECONDS ?? 86400),
  adminLoginWindowSeconds: Number(process.env.ADMIN_LOGIN_WINDOW_SECONDS ?? 900),
  adminLoginMaxAttempts: Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS ?? 10),
  adminLoginLockSeconds: Number(process.env.ADMIN_LOGIN_LOCK_SECONDS ?? 900),
  deviceOsMaxApkBytes: Number(process.env.DEVICEOS_MAX_APK_BYTES ?? 134217728),
  deviceOsAapt2Path: process.env.DEVICEOS_AAPT2_PATH ?? 'aapt2',
  deviceOsApksignerPath: process.env.DEVICEOS_APKSIGNER_PATH ?? 'apksigner',
  deviceOsStorageMode: process.env.DEVICEOS_STORAGE_MODE?.trim().toLowerCase() ?? 'local',
  deviceOsStorageDir: process.env.DEVICEOS_STORAGE_DIR ?? '/var/lib/ooro/deviceos-releases',
  deviceOsS3Bucket: process.env.DEVICEOS_S3_BUCKET ?? '',
  deviceOsS3Region: process.env.DEVICEOS_S3_REGION ?? 'auto',
  deviceOsS3Endpoint: process.env.DEVICEOS_S3_ENDPOINT ?? '',
  deviceOsS3AccessKeyId: process.env.DEVICEOS_S3_ACCESS_KEY_ID ?? '',
  deviceOsS3SecretAccessKey: process.env.DEVICEOS_S3_SECRET_ACCESS_KEY ?? '',
  deviceOsDownloadBaseUrl: (process.env.DEVICEOS_DOWNLOAD_BASE_URL ?? '').replace(/\/$/, ''),
  deviceOsRequestReceiptRetentionDays: Number.isFinite(Number(process.env.DEVICEOS_REQUEST_RECEIPT_RETENTION_DAYS ?? 7)) ? Math.max(1, Math.floor(Number(process.env.DEVICEOS_REQUEST_RECEIPT_RETENTION_DAYS ?? 7))) : 7,
  corsOrigins: process.env.NODE_ENV === 'production'
    ? [...defaultCorsOrigins, ...list(process.env.CORS_ORIGINS)]
    : [...developmentCorsOrigins, ...list(process.env.CORS_ORIGINS)],
}

const productionDatabaseUrl = process.env.DATABASE_URL
if (config.nodeEnv === 'production' && (!productionDatabaseUrl || /(?:^|[@:/])(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(productionDatabaseUrl))) {
  console.warn(JSON.stringify({
    event: 'startupDiagnostics',
    databaseUrlConfigured: Boolean(productionDatabaseUrl),
    databaseUrlLooksLocal: Boolean(productionDatabaseUrl && /(?:^|[@:/])(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(productionDatabaseUrl)),
  }))
}

if (config.nodeEnv === 'production') {
  if (config.jwtSecret === 'development-only-change-me' || config.jwtSecret.length < 32) throw new Error('JWT_SECRET must be configured in production')
  if (config.devMockOtpEnabled) throw new Error('DEV_MOCK_OTP_ENABLED must be false in production')
  if (!config.emailProviderApiKey) throw new Error('EMAIL_PROVIDER_API_KEY must be configured in production')
  if (!config.adminWebBaseUrl.startsWith('https://')) throw new Error('ADMIN_WEB_BASE_URL must use HTTPS in production')
}
