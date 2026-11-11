import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'
import { ApiError } from '../errors.js'

export type PrivateDocumentStorage = {
  put(objectKey: string, content: Buffer, contentType?: string): Promise<{ sha256: string }>
  get(objectKey: string): Promise<Buffer>
  delete?(objectKey: string): Promise<void>
  signedReadUrl(objectKey: string, expiresAt: Date): Promise<string>
  signedUploadUrl?(objectKey: string, contentType: string, expiresAt: Date, sha256: string): Promise<string>
  verifyUploadedObject?(objectKey: string, expectedSize: number, expectedSha256: string): Promise<void>
}

const key = () => createHash('sha256').update(config.documentStorageKey).digest()

class LocalEncryptedDocumentStorage implements PrivateDocumentStorage {
  async put(objectKey: string, content: Buffer) {
    if (config.nodeEnv === 'production' || config.documentStorageMode !== 'local') throw new ApiError('DOCUMENT_STORAGE_NOT_CONFIGURED', 'Private document storage is not configured', 503)
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv); const encrypted = Buffer.concat([cipher.update(content), cipher.final()]); const tag = cipher.getAuthTag()
    const file = path.join(config.documentStorageDir, objectKey.replaceAll('/', path.sep)); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, Buffer.concat([iv, tag, encrypted]), { flag: 'wx' })
    return { sha256: createHash('sha256').update(content).digest('hex') }
  }
  async signedReadUrl(_objectKey: string, _expiresAt: Date): Promise<string> { throw new ApiError('DOCUMENT_READ_NOT_AVAILABLE', 'Local private documents are not externally readable', 501) }
  async get(objectKey: string) {
    const { readFile } = await import('node:fs/promises')
    const encrypted = await readFile(path.join(config.documentStorageDir, objectKey.replaceAll('/', path.sep)))
    const iv = encrypted.subarray(0, 12); const tag = encrypted.subarray(12, 28); const body = encrypted.subarray(28)
    const decipher = (await import('node:crypto')).createDecipheriv('aes-256-gcm', key(), iv); decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(body), decipher.final()])
  }
  async delete(objectKey: string) { const { rm } = await import('node:fs/promises'); await rm(path.join(config.documentStorageDir, objectKey.replaceAll('/', path.sep)), { force: true }) }
}

class S3PrivateDocumentStorage implements PrivateDocumentStorage {
  private readonly client = new S3Client({
    region: config.documentStorageRegion,
    endpoint: config.documentStorageEndpoint || undefined,
    forcePathStyle: Boolean(config.documentStorageEndpoint),
    credentials: { accessKeyId: config.documentStorageAccessKeyId, secretAccessKey: config.documentStorageSecretAccessKey },
  })

  async put(objectKey: string, content: Buffer, contentType = 'application/octet-stream') {
    const sha256 = createHash('sha256').update(content).digest('hex')
    await this.client.send(new PutObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey, Body: content, ContentType: contentType, Metadata: { sha256 } }))
    return { sha256 }
  }

  async signedUploadUrl(objectKey: string, contentType: string, expiresAt: Date, sha256: string) {
    const seconds = Math.max(1, Math.min(config.documentStorageUploadTtlSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey, ContentType: contentType, Metadata: { sha256: sha256.toLowerCase() } }), { expiresIn: seconds })
  }

  async verifyUploadedObject(objectKey: string, expectedSize: number, expectedSha256: string) {
    const head = await this.client.send(new HeadObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey }))
    const actualSha256 = head.Metadata?.sha256?.toLowerCase()
    if (head.ContentLength !== expectedSize || (actualSha256 && actualSha256 !== expectedSha256.toLowerCase())) throw new ApiError('DOCUMENT_CHECKSUM_MISMATCH', 'Uploaded document metadata did not match the upload session', 422)
    if (!actualSha256) throw new ApiError('DOCUMENT_CHECKSUM_UNAVAILABLE', 'Storage provider did not return a document checksum', 422)
  }

  async get(objectKey: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey }))
    if (!result.Body) throw new ApiError('DOCUMENT_OBJECT_UNAVAILABLE', 'Uploaded document could not be read', 422)
    return Buffer.from(await result.Body.transformToByteArray())
  }

  async signedReadUrl(objectKey: string, expiresAt: Date) {
    const seconds = Math.max(1, Math.min(config.documentStorageReadTtlSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1000)))
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey }), { expiresIn: seconds })
  }
  async delete(objectKey: string) { const { DeleteObjectCommand } = await import('@aws-sdk/client-s3'); await this.client.send(new DeleteObjectCommand({ Bucket: config.documentStorageBucket, Key: objectKey })) }
}

export const privateDocumentStorage: PrivateDocumentStorage = config.documentStorageMode === 's3'
  ? new S3PrivateDocumentStorage()
  : new LocalEncryptedDocumentStorage()
