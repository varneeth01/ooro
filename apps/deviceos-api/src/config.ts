import 'dotenv/config'

const list = (value: string | undefined) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.DEVICEOS_API_PORT ?? process.env.PORT ?? 8081),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://ooro:ooro@localhost:5432/ooro',
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
  accessTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000),
  heartbeatOnlineSeconds: Number(process.env.HEARTBEAT_ONLINE_SECONDS ?? 90),
  heartbeatDegradedSeconds: Number(process.env.HEARTBEAT_DEGRADED_SECONDS ?? 300),
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
  corsOrigins: process.env.NODE_ENV === 'production' ? list(process.env.CORS_ORIGINS) : ['http://localhost:3000', 'http://127.0.0.1:3000', ...list(process.env.CORS_ORIGINS)],
}

if (config.nodeEnv === 'production') {
  if (config.jwtSecret === 'development-only-change-me' || config.jwtSecret.length < 32) throw new Error('JWT_SECRET must be configured in production')
  if (config.deviceOsStorageMode !== 's3') throw new Error('DEVICEOS_STORAGE_MODE must be s3 in production')
  if (!config.deviceOsS3Bucket || !config.deviceOsS3Endpoint || !config.deviceOsS3AccessKeyId || !config.deviceOsS3SecretAccessKey) throw new Error('Private DeviceOS S3 storage must be configured in production')
}
