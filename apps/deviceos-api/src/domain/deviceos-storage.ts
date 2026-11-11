import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHmac, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { GetObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'

export type DeviceOsByteRange = { start: number; end: number }

export function sliceDeviceOsContent(content: Buffer, range: DeviceOsByteRange): Buffer {
  return content.subarray(range.start, range.end + 1)
}

export function parseDeviceOsRange(header: string | undefined, totalBytes: number): DeviceOsByteRange | 'INVALID' | null {
  if (!header) return null
  const match = header.match(/^bytes=(\d+)-(\d*)$/)
  if (!match || !Number.isSafeInteger(totalBytes) || totalBytes <= 0) return 'INVALID'
  const start = Number(match[1])
  const requestedEnd = match[2] ? Number(match[2]) : totalBytes - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= totalBytes || requestedEnd < start) return 'INVALID'
  return { start, end: Math.min(requestedEnd, totalBytes - 1) }
}

export function createLocalDownloadSignature(key: string, expires: number): string {
  return createHmac('sha256', config.jwtSecret).update(`${key}.${expires}`).digest('hex')
}

export function verifyLocalDownloadSignature(key: string, expires: number, signature: string): boolean {
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000) || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = Buffer.from(createLocalDownloadSignature(key, expires), 'hex')
  const received = Buffer.from(signature, 'hex')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function isDeviceOsExistingObjectError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')
}

export interface DeviceOsObjectStorage {
  put(key: string, content: Buffer): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  signedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>
}

class LocalPrivateStorage implements DeviceOsObjectStorage {
  private file(key: string) {
    const clean = key.replace(/^\/+/, '')
    const resolved = path.resolve(config.deviceOsStorageDir, clean)
    const root = path.resolve(config.deviceOsStorageDir)
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error('INVALID_STORAGE_KEY')
    return resolved
  }
  async put(key: string, content: Buffer) {
    const file = this.file(key)
    await mkdir(path.dirname(file), { recursive: true })
    try {
      await writeFile(file, content, { flag: 'wx' })
    } catch (error) {
      // Storage keys include the verified SHA-256, so an existing key is the
      // same immutable object and is safe to reuse during duplicate uploads.
      if (!isDeviceOsExistingObjectError(error)) throw error
    }
  }
  async get(key: string) { return readFile(this.file(key)) }
  async delete(key: string) { await rm(this.file(key), { force: true }) }
  async signedDownloadUrl(key: string, expiresInSeconds: number) {
    const base = config.deviceOsDownloadBaseUrl || `http://127.0.0.1:${config.port}`
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
    return `${base}/api/deviceos/storage?key=${encodeURIComponent(key)}&expires=${expires}&signature=${createLocalDownloadSignature(key, expires)}`
  }
}

class S3PrivateStorage implements DeviceOsObjectStorage {
  private readonly client = new S3Client({ region: config.deviceOsS3Region, endpoint: config.deviceOsS3Endpoint || undefined, forcePathStyle: Boolean(config.deviceOsS3Endpoint), credentials: config.deviceOsS3AccessKeyId && config.deviceOsS3SecretAccessKey ? { accessKeyId: config.deviceOsS3AccessKeyId, secretAccessKey: config.deviceOsS3SecretAccessKey } : undefined })
  async put(key: string, content: Buffer) { await this.client.send(new PutObjectCommand({ Bucket: config.deviceOsS3Bucket, Key: key, Body: content, ContentType: 'application/vnd.android.package-archive', ContentDisposition: 'attachment' })) }
  async get(key: string) { const response = await this.client.send(new GetObjectCommand({ Bucket: config.deviceOsS3Bucket, Key: key })); if (!response.Body) throw new Error('OBJECT_NOT_FOUND'); return Buffer.from(await response.Body.transformToByteArray()) }
  async delete(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: config.deviceOsS3Bucket, Key: key })) }
  async signedDownloadUrl(key: string, expiresInSeconds: number) { return getSignedUrl(this.client, new GetObjectCommand({ Bucket: config.deviceOsS3Bucket, Key: key, ResponseContentType: 'application/vnd.android.package-archive' }), { expiresIn: expiresInSeconds }) }
}

let storage: DeviceOsObjectStorage | undefined
export function deviceOsStorage(): DeviceOsObjectStorage {
  if (!storage) {
    if (config.deviceOsStorageMode === 's3') {
      if (!config.deviceOsS3Bucket) throw new Error('DEVICEOS_S3_NOT_CONFIGURED')
      storage = new S3PrivateStorage()
    } else storage = new LocalPrivateStorage()
  }
  return storage
}
