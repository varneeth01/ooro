import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from './prisma.js'
import { requireRoles, response } from './http.js'
import { ApiError } from './errors.js'

const assetCode = z.string().regex(/^[A-Z0-9-]{3,80}$/)
const params = z.object({ code: assetCode })
const docParams = z.object({ code: assetCode, id: z.string().uuid() })
const superAdmin = async (request: Parameters<typeof requireRoles>[0]) => requireRoles(request, ['SUPER_ADMIN'])
const bucket = process.env.ASSET_S3_BUCKET || ''
function storage() {
  if (!bucket || !process.env.ASSET_S3_ACCESS_KEY_ID || !process.env.ASSET_S3_SECRET_ACCESS_KEY) {
    throw new ApiError('ASSET_STORAGE_UNAVAILABLE', 'Private asset document storage is not configured', 503)
  }
  return new S3Client({
    region: process.env.ASSET_S3_REGION || 'auto',
    endpoint: process.env.ASSET_S3_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.ASSET_S3_ACCESS_KEY_ID, secretAccessKey: process.env.ASSET_S3_SECRET_ACCESS_KEY },
  })
}
const missing = () => new ApiError('ASSET_NOT_FOUND', 'Asset not found', 404)
const find = async (code: string) => {
  const asset = await prisma.companyAsset.findUnique({ where: { assetCode: code } })
  if (!asset) throw missing()
  return asset
}
const event = (assetId: string, actorId: string, action: string) => prisma.assetEvent.create({ data: { assetId, actorId, action } })
const input = z.object({
  assetCode: assetCode.optional(), title: z.string().trim().min(1).max(150).optional(),
  kind: z.string().trim().min(1).max(50).optional(),
  status: z.enum(['DOCUMENTS_PENDING','ACTIVE','IN_REPAIR','RETIRED']).optional(),
  ownershipStatus: z.enum(['UNVERIFIED','TRANSFER_PENDING','COMPANY_OWNED','THIRD_PARTY']).optional(),
  legalEntityName: z.string().min(2).max(150).optional(),
  serialNumber: z.string().max(150).nullable().optional(),
  deviceId: z.string().max(100).nullable().optional(),
  acquisitionCostPaise: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
}).strict()
export function registerAssetRoutes(app: FastifyInstance) {
  app.get('/api/public/assets/:code', async (request, reply) => {
    const { code } = params.parse(request.params)
    const asset = await find(code)
    return reply.header('Cache-Control','no-store').send(response(request, {
      assetCode: asset.assetCode, title: asset.title, kind: asset.kind,
      status: asset.status, ownershipDocumentation: asset.ownershipStatus === 'COMPANY_OWNED' ? 'RECORDED' : 'PENDING',
      legalEntityName: asset.legalEntityName,
    }))
  })
  app.get('/api/admin/assets', async (request, reply) => {
    await superAdmin(request)
    const assets = await prisma.companyAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return reply.send(response(request, assets))
  })
  app.post('/api/admin/assets', async (request, reply) => {
    const actor = await superAdmin(request)
    const data = input.extend({assetCode: assetCode, title: z.string().trim().min(1).max(150)}).parse(request.body)
    const asset = await prisma.companyAsset.create({ data })
    await event(asset.id, actor.userId, 'ASSET_CREATED')
    return reply.code(201).send(response(request, asset))
  })
  app.get('/api/admin/assets/:code', async (request, reply) => {
    await superAdmin(request)
    const { code } = params.parse(request.params)
    return reply.send(response(request, await find(code)))
  })
  app.patch('/api/admin/assets/:code', async (request, reply) => {
    const actor = await superAdmin(request)
    const { code } = params.parse(request.params)
    const { assetCode: _ignored, ...data } = input.omit({assetCode: true}).parse(request.body)
    const asset = await prisma.companyAsset.update({where: {assetCode: code}, data})
    await event(asset.id, actor.userId, 'ASSET_UPDATED')
    return reply.send(response(request, asset))
  })
  app.get('/api/admin/assets/:code/events', async (request, reply) => {
    await superAdmin(request)
    const asset = await find(params.parse(request.params).code)
    return reply.send(response(request, await prisma.assetEvent.findMany({where: {assetId: asset.id}, orderBy:{createdAt:'desc'},take:100})))
  })
  app.get('/api/admin/assets/:code/documents', async (request, reply) => {
    await superAdmin(request)
    const asset = await find(params.parse(request.params).code)
    return reply.send(response(request, await prisma.assetDocument.findMany({
      where: {assetId: asset.id}, select: {id:true,type:true,filename:true,contentType:true,sizeBytes:true,createdAt:true},
      orderBy: {createdAt:'desc'}
    })))
  })
  app.post('/api/admin/assets/:code/documents/upload-intent', async (request, reply) => {
    await superAdmin(request)
    const asset = await find(params.parse(request.params).code)
    const doc = z.object({
      filename: z.string().min(1).max(160).regex(/^[a-zA-Z0-9._ -]+$/),
      type: z.enum(['OWNERSHIP_DECLARATION','TRANSFER_DEED','INVOICE','HANDOVER','PAYMENT_PROOF','SERVICE','OTHER']),
      contentType: z.enum(['application/pdf','image/png','image/jpeg']),
      sizeBytes: z.number().int().min(1).max(10_000_000)
    }).strict().parse(request.body)
    const key = `asset-documents/${asset.id}/${randomUUID()}`
    const client = storage()
    const uploadUrl = await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:doc.contentType}),{expiresIn:300})
    // Persist only after upload is confirmed with HEAD; client supplies the pending key.
    return reply.send(response(request,{key,uploadUrl,expiresInSeconds:300}))
  })
  app.post('/api/admin/assets/:code/documents/complete', async (request, reply) => {
    const actor = await superAdmin(request)
    const asset = await find(params.parse(request.params).code)
    const doc = z.object({
      key: z.string().regex(/^asset-documents\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/),
      filename: z.string().min(1).max(160).regex(/^[a-zA-Z0-9._ -]+$/),
      type: z.enum(['OWNERSHIP_DECLARATION','TRANSFER_DEED','INVOICE','HANDOVER','PAYMENT_PROOF','SERVICE','OTHER']),
      contentType: z.enum(['application/pdf','image/png','image/jpeg'])
    }).strict().parse(request.body)
    if (!doc.key.startsWith(`asset-documents/${asset.id}/`)) throw new ApiError('DOCUMENT_KEY_INVALID','Invalid document key',403)
    const file = await storage().send(new HeadObjectCommand({Bucket:bucket,Key:doc.key}))
    if (!file.ContentLength || file.ContentLength > 10_000_000 || file.ContentType !== doc.contentType) throw new ApiError('DOCUMENT_INVALID','Uploaded document is invalid',422)
    const record = await prisma.assetDocument.create({
      data:{assetId:asset.id,type:doc.type,filename:doc.filename,objectKey:doc.key,contentType:doc.contentType,sizeBytes:file.ContentLength,uploadedById:actor.userId},
      select:{id:true,type:true,filename:true,createdAt:true}
    })
    await event(asset.id,actor.userId,'DOCUMENT_ADDED')
    return reply.code(201).send(response(request,record))
  })
  app.get('/api/admin/assets/:code/documents/:id/download', async(request,reply)=>{
    const actor=await superAdmin(request)
    const {code,id}=docParams.parse(request.params)
    const asset=await find(code)
    const doc=await prisma.assetDocument.findFirst({where:{id,assetId:asset.id}})
    if(!doc) throw new ApiError('DOCUMENT_NOT_FOUND','Document not found',404)
    const downloadUrl=await getSignedUrl(storage(),new GetObjectCommand({Bucket:bucket,Key:doc.objectKey,ResponseContentDisposition:'attachment'}),{expiresIn:60})
    await event(asset.id,actor.userId,'DOCUMENT_DOWNLOAD_REQUESTED')
    return reply.header('Cache-Control','no-store').send(response(request,{downloadUrl,expiresInSeconds:60}))
  })
}
