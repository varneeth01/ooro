import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { requirePermission, response } from './http.js'
import { adminRoles } from './domain/admin-auth.js'
import { normalizeIndianPhone } from './domain/phone.js'
import { config } from './config.js'
import { ApiError } from './errors.js'
import { createPasswordToken, hashPassword, normalizeAdminEmail, passwordTokenHash, validateAdminPassword } from './domain/admin-password-auth.js'
import { sendAdminInvitationEmail } from './domain/transactional-email.js'

const manageableRoles = ['ADMIN','SUPER_ADMIN','OPERATIONS','FINANCE','SUPPORT'] as const
const roleSchema = z.enum(manageableRoles)
const uuid = z.string().uuid()
const emailSchema = z.email().max(254).transform(normalizeAdminEmail)
const forbiddenAdmin = () => new ApiError('ADMIN_MANAGEMENT_FORBIDDEN', 'Administrator management not allowed', 403)
const conflict = (message: string) => new ApiError('ADMIN_MANAGEMENT_CONFLICT', message, 409)
const invitationExpired = () => new ApiError('INVALID_ADMIN_INVITATION','Invitation is invalid or expired',400)
const userFields = { id:true, name:true, email:true, role:true, accountStatus:true, passwordChangedAt:true, lockedUntil:true, createdAt:true, updatedAt:true } as const

async function audit(tx: Prisma.TransactionClient, actor: {userId:string;role:string}, action: string, targetId: string, details?: Record<string,string>) {
  await tx.auditLog.create({ data: { actorId:actor.userId, actorRole:actor.role, action, entityType:'User', entityId:targetId, after:details ?? {} } })
}

// Serializes last-Super-Admin changes across all API instances and concurrent requests.
async function preserveLastSuperAdmin(tx: Prisma.TransactionClient, targetId: string, nextRole?: string, nextStatus?: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(847293051)`
  const target = await tx.user.findUnique({where:{id:targetId},select:{id:true,role:true,accountStatus:true}})
  if (!target || !adminRoles.includes(target.role)) throw new ApiError('ADMIN_USER_NOT_FOUND','Administrator not found',404)
  if (target.role === 'SUPER_ADMIN' && target.accountStatus === 'ACTIVE' && ((nextRole !== undefined && nextRole !== 'SUPER_ADMIN') || (nextStatus !== undefined && nextStatus !== 'ACTIVE'))) {
    const remaining = await tx.user.count({where:{role:'SUPER_ADMIN',accountStatus:'ACTIVE'}})
    if (remaining <= 1) throw conflict('Cannot disable or demote the last active Super Admin')
  }
  return target
}

export function registerAdminManagement(app: FastifyInstance) {
  app.get('/api/admin/users', async (request, reply) => {
    await requirePermission(request,'admin-users:manage')
    const q=z.object({skip:z.coerce.number().int().min(0).max(100000).default(0),take:z.coerce.number().int().min(1).max(100).default(25)}).parse(request.query)
    const where={role:{in:adminRoles}}
    const [users,total]=await Promise.all([
      prisma.user.findMany({where,select:userFields,orderBy:{createdAt:'desc'},skip:q.skip,take:q.take}),
      prisma.user.count({where}),
    ])
    return reply.send(response(request,{users,total,skip:q.skip,take:q.take}))
  })

  app.get('/api/admin/users/invitations',async(request,reply)=>{
    await requirePermission(request,'admin-users:manage')
    const rows=await prisma.adminInvitation.findMany({
      orderBy:{createdAt:'desc'},take:100,
      select:{id:true,email:true,name:true,role:true,expiresAt:true,acceptedAt:true,revokedAt:true,createdAt:true,createdById:true},
    })
    return reply.send(response(request,rows))
  })

  app.post('/api/admin/users/invitations',async(request,reply)=>{
    const actor=await requirePermission(request,'admin-users:manage')
    const input=z.object({name:z.string().trim().min(1).max(120),email:emailSchema,role:roleSchema}).strict().parse(request.body)
    const existing=await prisma.user.findUnique({where:{email:input.email},select:{id:true}})
    if(existing) throw conflict('A user already exists for this email')
    const recent=await prisma.adminInvitation.count({where:{email:input.email,createdAt:{gte:new Date(Date.now()-3600000)}}})
    if(recent>=3) throw new ApiError('ADMIN_INVITE_RATE_LIMIT','Too many invitations for this address',429)
    const token=createPasswordToken()
    const expiresAt=new Date(Date.now()+48*60*60*1000)
    const invite=await prisma.$transaction(async tx=>{
      await tx.adminInvitation.updateMany({where:{email:input.email,acceptedAt:null,revokedAt:null},data:{revokedAt:new Date()}})
      const result=await tx.adminInvitation.create({data:{email:input.email,name:input.name,role:input.role,tokenHash:passwordTokenHash(token),expiresAt,createdById:actor.userId}})
      await audit(tx,actor,'ADMIN_INVITED',result.id,{role:input.role})
      return result
    })
    // Persisted invitation remains pending if provider fails; may be revoked/resubmitted.
    await sendAdminInvitationEmail(input.email,input.name,`${config.adminWebBaseUrl}/admin/accept-invite?token=${encodeURIComponent(token)}`)
    return reply.code(201).send(response(request,{id:invite.id,email:input.email,role:input.role,expiresAt}))
  })

  app.post('/api/admin/users/invitations/:id/revoke',async(request,reply)=>{
    const actor=await requirePermission(request,'admin-users:manage')
    const id=uuid.parse((request.params as {id:string}).id)
    const count=await prisma.$transaction(async tx=>{
      const result=await tx.adminInvitation.updateMany({where:{id,acceptedAt:null,revokedAt:null},data:{revokedAt:new Date()}})
      if(result.count===1) await audit(tx,actor,'ADMIN_INVITATION_REVOKED',id)
      return result.count
    })
    if(count!==1) throw conflict('Invitation is no longer active')
    return reply.send(response(request,{revoked:true}))
  })

  app.post('/api/auth/admin/accept-invitation',async(request,reply)=>{
    const input=z.object({token:z.string().min(32).max(256),phone:z.string().min(7).max(20),password:z.string()}).strict().parse(request.body)
    validateAdminPassword(input.password)
    const phone=normalizeIndianPhone(input.phone)
    if(!phone) throw new ApiError('VALIDATION_ERROR','A valid Indian mobile number is required',422)
    const passwordHash=await hashPassword(input.password)
    const now=new Date()
    const user=await prisma.$transaction(async tx=>{
      // One winning transaction may consume the token; the second must not create a user.
      const invite=await tx.adminInvitation.findUnique({where:{tokenHash:passwordTokenHash(input.token)}})
      if(!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt<=now || !adminRoles.includes(invite.role)) throw invitationExpired()
      const claimed=await tx.adminInvitation.updateMany({where:{id:invite.id,acceptedAt:null,revokedAt:null,expiresAt:{gt:now}},data:{acceptedAt:now}})
      if(claimed.count!==1) throw invitationExpired()
      const created=await tx.user.create({data:{phone,email:invite.email,name:invite.name,role:invite.role,accountStatus:'ACTIVE',passwordHash,passwordChangedAt:now},select:userFields})
      await tx.auditLog.create({data:{actorId:invite.createdById,actorRole:'SUPER_ADMIN',action:'ADMIN_INVITATION_ACCEPTED',entityType:'User',entityId:created.id,after:{inviteId:invite.id,role:invite.role}}})
      return created
    }).catch(error=>{
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002') throw conflict('Email or phone already belongs to an account')
      throw error
    })
    return reply.send(response(request,{user}))
  })

  app.patch('/api/admin/users/:id',async(request,reply)=>{
    const actor=await requirePermission(request,'admin-users:manage')
    const id=uuid.parse((request.params as {id:string}).id)
    const input=z.object({role:roleSchema.optional(),accountStatus:z.enum(['ACTIVE','SUSPENDED']).optional()}).strict().refine(v=>v.role!==undefined||v.accountStatus!==undefined).parse(request.body)
    const user=await prisma.$transaction(async tx=>{
      // Lock also protects against concurrent disable/demotion of two Super Admins.
      const current=await preserveLastSuperAdmin(tx,id,input.role,input.accountStatus)
      if(id===actor.userId && (input.accountStatus==='SUSPENDED'||(input.role&&input.role!=='SUPER_ADMIN'))) throw forbiddenAdmin()
      const effectiveRole=input.role ?? current.role
      const effectiveStatus=input.accountStatus ?? current.accountStatus
      const changed=await tx.user.update({where:{id},data:{role:effectiveRole,accountStatus:effectiveStatus},select:userFields})
      if(current.role!==effectiveRole || current.accountStatus!==effectiveStatus) {
        await tx.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}})
      }
      await audit(tx,actor,'ADMIN_ACCOUNT_UPDATED',id,{role:effectiveRole,status:effectiveStatus})
      return changed
    })
    return reply.send(response(request,{user}))
  })

  app.post('/api/admin/users/:id/revoke-sessions',async(request,reply)=>{
    const actor=await requirePermission(request,'admin-users:manage')
    const id=uuid.parse((request.params as {id:string}).id)
    const result=await prisma.$transaction(async tx=>{
      const target=await tx.user.findUnique({where:{id},select:{role:true}})
      if(!target || !adminRoles.includes(target.role)) throw new ApiError('ADMIN_USER_NOT_FOUND','Administrator not found',404)
      const count=await tx.session.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}})
      await audit(tx,actor,'ADMIN_SESSIONS_REVOKED',id)
      return count.count
    })
    return reply.send(response(request,{revokedSessions:result}))
  })
}
