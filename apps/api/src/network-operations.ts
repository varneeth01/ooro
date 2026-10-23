import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from './prisma.js'
import { requirePermission, requireRoles, response } from './http.js'
const roles=['ADMIN','SUPER_ADMIN','OPERATIONS']
export function registerNetworkOperations(app:FastifyInstance){
 app.get('/api/admin/network',async(request,reply)=>{
  await requireRoles(request,roles)
  const [depots,routes,vehicles,drivers,screens]=await Promise.all([prisma.depot.findMany(),prisma.route.findMany(),prisma.vehicle.findMany({select:{id:true,registrationNumber:true,type:true,city:true,area:true,depotId:true,routeId:true,driverId:true,status:true}}),prisma.driver.findMany({select:{id:true,user:{select:{name:true}}}}),prisma.display.findMany({select:{id:true,name:true,vehicleId:true,state:true,tags:true}})])
  return reply.send(response(request,{depots,routes,vehicles,drivers,screens}))
 })
 app.post('/api/admin/network',async(request,reply)=>{
  const actor=await requirePermission(request,'operations:write')
  const input=z.discriminatedUnion('kind',[
   z.object({kind:z.literal('depot'),id:z.string().uuid().optional(),name:z.string().trim().min(1).max(120),city:z.string().trim().min(1).max(120)}),
   z.object({kind:z.literal('route'),id:z.string().uuid().optional(),name:z.string().trim().min(1).max(120),city:z.string().trim().min(1).max(120),depotId:z.string().uuid().nullable().optional()}),
   z.object({kind:z.literal('vehicle'),id:z.string().uuid().optional(),registrationNumber:z.string().trim().min(1).max(40),driverId:z.string().uuid(),type:z.enum(['AUTO','CAB','BUS']),city:z.string().max(120),area:z.string().max(120).optional(),routeId:z.string().uuid().nullable().optional(),depotId:z.string().uuid().nullable().optional()}),
   z.object({kind:z.literal('screen'),id:z.string().uuid(),vehicleId:z.string().uuid().nullable(),state:z.enum(['READY','MAINTENANCE','BLOCKED','DISABLED']).optional(),tags:z.array(z.string().trim().min(1).max(60)).max(30)})
  ]).parse(request.body)
  const result=await prisma.$transaction(async tx=>{
   let row:unknown
   if(input.kind==='depot'){const data={name:input.name,city:input.city};row=input.id?await tx.depot.update({where:{id:input.id},data}):await tx.depot.create({data})}
   else if(input.kind==='route'){const data={name:input.name,city:input.city,depotId:input.depotId};row=input.id?await tx.route.update({where:{id:input.id},data}):await tx.route.create({data})}
   else if(input.kind==='vehicle'){const data={registrationNumber:input.registrationNumber,driverId:input.driverId,type:input.type,city:input.city,area:input.area,routeId:input.routeId,depotId:input.depotId};row=input.id?await tx.vehicle.update({where:{id:input.id},data}):await tx.vehicle.create({data:{...data,manufacturer:'Unspecified',model:'Unspecified',status:'ACTIVE'}})}
   else {row=await tx.display.update({where:{id:input.id},data:{vehicleId:input.vehicleId,state:input.state,tags:input.tags}});await tx.displayCommand.create({data:{displayId:input.id,commandType:'REFRESH_MANIFEST',expiresAt:null}})}
   const record=row as {id:string};await tx.auditLog.create({data:{actorId:actor.userId,actorRole:actor.role,action:'NETWORK_CONFIGURATION_UPDATED',entityType:input.kind,entityId:record.id,after:input,requestId:request.id}})
   return record
  });return reply.send(response(request,{id:result.id}))
 })
}
