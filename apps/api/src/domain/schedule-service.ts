import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { ApiError } from '../errors.js'
import { dateKeys } from './inventory.js'
import { distanceKm, priorities, requiredSlots, rulesOverlap, scheduleRules, type ScheduleInput } from './scheduling.js'

export async function saveSchedule(input: ScheduleInput, actor: { userId: string; role: string }, requestId: string, preview = false) {
  return prisma.$transaction(async tx => {
    const campaign = await tx.campaign.findUnique({ where: { id: input.campaignId }, include: { creatives: { include: { asset: true } }, schedule: true, assignments: { where: { active: true } } } })
    if (!campaign) throw new ApiError('NOT_FOUND', 'Campaign not found', 404)
    if ((campaign.schedule?.revision ?? 0) !== input.revision) throw new ApiError('STALE_REVISION','Schedule changed. Reload before publishing.',409)
    const conflicts: Array<{ code: string; screenId?: string; message: string; overridable: boolean }> = []
    const warn = (code: string, message: string, screenId?: string, overridable = false) => conflicts.push({ code,message,screenId,overridable })
    if (!['APPROVED','ACTIVE','SCHEDULED','PAUSED'].includes(campaign.status)) warn('CAMPAIGN_NOT_APPROVED','Approve this campaign before scheduling')
    if ((campaign.startsAt && input.startsAt < campaign.startsAt) || (campaign.endsAt && input.endsAt > campaign.endsAt)) warn('OUTSIDE_BOOKING','Schedule extends outside campaign booked dates')
    const creatives = input.rules.creativeIds.map(id => campaign.creatives.find(c => c.id === id))
    if (creatives.some(c => !c || c.status !== 'APPROVED' || !c.asset?.active || !c.asset.url)) warn('CREATIVE_NOT_APPROVED','Every selected creative must be approved and available')
    if (creatives.some(c => c && (!['IMAGE','VIDEO'].includes(c.type.toUpperCase()) || (c.type.toUpperCase() === 'VIDEO' && !c.asset?.durationSeconds)))) warn('INCOMPATIBLE_MEDIA','Video duration must be known and media must be IMAGE or VIDEO')
    const target = input.target
    const constrained = target.all || target.screenIds.length || target.groupIds.length || target.vehicleIds.length || target.routeId || target.depotId || target.city || target.area || target.vehicleType || target.tags.length || target.geofence
    if (!constrained) throw new ApiError('EMPTY_TARGET','Select a target',422)
    const explicit: Prisma.DisplayWhereInput[] = []
    if (target.screenIds.length) explicit.push({ id: { in: target.screenIds } })
    if (target.groupIds.length) explicit.push({ groups: { some: { groupId: { in: target.groupIds } } } })
    if (target.vehicleIds.length) explicit.push({ vehicleId: { in: target.vehicleIds } })
    const displays = (await tx.display.findMany({ where: {
      ...(explicit.length && !target.all ? { OR: explicit } : {}),
      ...(target.tags.length ? { tags: { hasSome: target.tags } } : {}),
      ...((target.routeId || target.depotId || target.city || target.area || target.vehicleType) ? { vehicle: { is: { routeId: target.routeId, depotId: target.depotId, city: target.city, area: target.area, type: target.vehicleType } } } : {}),
    }, include: { inventoryConfig: true }, take: 1001 })).filter(d => !target.geofence || (d.lastLatitude !== null && d.lastLongitude !== null && distanceKm(target.geofence.latitude,target.geofence.longitude,d.lastLatitude,d.lastLongitude) <= target.geofence.radiusKm))
    if (!displays.length || displays.length > 1000) warn('TARGET_SIZE','Choose between 1 and 1000 screens')
    for (const id of target.screenIds) if (!displays.some(d => d.id === id)) warn('TARGET_MISSING','Selected screen does not match targeting or no longer exists',id)
    const ids = displays.map(d => d.id)
    const others = await tx.adSchedule.findMany({ where: { campaignId: { not: campaign.id }, status: 'PUBLISHED', startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt }, campaign: { assignments: { some: { displayId: { in: ids }, active: true } } } } })
    for (const other of others) if ((input.exclusive || other.exclusive || input.priority === 'EMERGENCY') && rulesOverlap(input.rules,scheduleRules.parse(other.rules))) warn('EXCLUSIVE_CONFLICT',`Overlaps campaign ${other.campaignId}`,undefined,true)
    const dates = dateKeys(input.startsAt,input.endsAt)
    const allocations = await tx.inventoryAllocation.findMany({ where: { screenId: { in: ids }, date: { gte: new Date(dates[0]), lte: new Date(dates[dates.length-1]) }, status: { in: ['HELD','RESERVED','ACTIVE','BLOCKED'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })
    const reservations: Array<{ screenId: string; date: Date; slot: number }> = []
    const byScreenDay = new Map<string, typeof allocations>()
    for (const allocation of allocations) { const key = `${allocation.screenId}:${allocation.date.toISOString().slice(0,10)}`; byScreenDay.set(key,[...(byScreenDay.get(key)??[]),allocation]) }
    let tooLarge = false
    const duration = creatives.reduce((n,c) => n + (c?.type.toUpperCase() === 'VIDEO' ? c.asset?.durationSeconds ?? 0 : input.rules.imageDurationSeconds),0)
    for (const d of displays) {
      if (['DISABLED','BLOCKED','MAINTENANCE'].includes(d.state)) warn('SCREEN_BLOCKED','Screen is blocked or under maintenance',d.id)
      if (!d.inventoryConfig || !d.inventoryConfig.commercialEnabled) warn('INVENTORY_UNAVAILABLE','Configure and enable screen inventory first',d.id)
      const capacity = Math.max(0,Math.min(d.inventoryConfig?.totalSlots ?? 0,d.inventoryConfig?.commercialSlots ?? 0)-(d.inventoryConfig?.blockedSlots ?? 0))
      const slots = input.exclusive ? capacity : requiredSlots(input.rules,duration,capacity)
      for (const date of dates) {
        const rows = (byScreenDay.get(`${d.id}:${date}`) ?? []).filter(a => a.scheduleId !== campaign.schedule?.id)
        const owned = rows.filter(a => a.campaignId === campaign.id && ['RESERVED','ACTIVE'].includes(a.status)).length
        const occupied = new Set(rows.map(a=>a.slot))
        const free = Array.from({length:capacity},(_,i)=>i).filter(slot => !occupied.has(slot))
        if (slots > capacity || free.length + owned < slots) { warn('INVENTORY_CONFLICT',`Insufficient inventory on ${date}`,d.id); break }
        reservations.push(...free.slice(0,Math.max(0,slots-owned)).map(slot=>({screenId:d.id,date:new Date(date),slot})))
        if (reservations.length > 20000) { tooLarge=true; break }
      }
    }
    if (tooLarge) warn('SCHEDULE_TOO_LARGE','This schedule exceeds 20,000 reserved slot-days. Split by screen groups or shorten the dates.')
    const offline = displays.filter(d=>!d.lastHeartbeatAt || Date.now()-d.lastHeartbeatAt.getTime()>90000).length
    const canOverride = actor.role === 'SUPER_ADMIN' && !!input.overrideReason
    const blocking = conflicts.filter(c=>!c.overridable || !canOverride)
    const report = { eligibleScreens: displays.length, offlineScreens: offline, conflicts, canPublish: blocking.length === 0, reservedSlotDays: reservations.length, screenIds: ids }
    if (preview) return report
    if (blocking.length) throw new ApiError('SCHEDULE_CONFLICT', blocking.map(c=>c.message).join('; '),409)
    const data = { startsAt:input.startsAt,endsAt:input.endsAt,timezone:input.timezone,priority:priorities[input.priority],exclusive:input.exclusive,rules:input.rules as Prisma.InputJsonValue,targeting:input.target as Prisma.InputJsonValue,status:'PUBLISHED' }
    const schedule = await tx.adSchedule.upsert({ where:{campaignId:campaign.id},create:{campaignId:campaign.id,...data},update:{...data,revision:{increment:1}} })
    // Reuse the inventory ledger used by self-serve checkout. Preserve paid allocations.
    await tx.inventoryAllocation.updateMany({where:{scheduleId:schedule.id},data:{status:'CANCELLED'}})
    for(let offset=0;offset<reservations.length;offset+=500){
      const batch=reservations.slice(offset,offset+500)
      const values=batch.map(row=>Prisma.sql`(${Prisma.raw("gen_random_uuid()")},${row.screenId}::uuid,${campaign.id}::uuid,${row.date},${row.slot},${schedule.id}::uuid,'RESERVED',NOW(),NOW())`)
      await tx.$executeRaw(Prisma.sql`INSERT INTO "InventoryAllocation" ("id","screenId","campaignId","date","slot","scheduleId","status","createdAt","updatedAt") VALUES ${Prisma.join(values)} ON CONFLICT ("screenId","date","slot") DO UPDATE SET "campaignId"=EXCLUDED."campaignId","scheduleId"=EXCLUDED."scheduleId","status"='RESERVED',"expiresAt"=NULL,"holdId"=NULL,"updatedAt"=NOW() WHERE "InventoryAllocation"."status"='CANCELLED' OR "InventoryAllocation"."scheduleId"=EXCLUDED."scheduleId"` )
    }
    await tx.displayCampaignAssignment.updateMany({where:{campaignId:campaign.id},data:{active:false}})
    for (const displayId of ids) await tx.displayCampaignAssignment.upsert({where:{displayId_campaignId:{displayId,campaignId:campaign.id}},create:{displayId,campaignId:campaign.id},update:{active:true}})
    await tx.campaign.update({where:{id:campaign.id},data:{status:'SCHEDULED'}})
    const affected = [...new Set([...ids,...campaign.assignments.map(a=>a.displayId)])]
    await tx.displayCommand.createMany({data:affected.map(displayId=>({displayId,commandType:'REFRESH_MANIFEST',payload:{scheduleId:schedule.id,revision:schedule.revision},expiresAt:null}))})
    await tx.auditLog.create({data:{actorId:actor.userId,actorRole:actor.role,action:'SCHEDULE_PUBLISHED',entityType:'AdSchedule',entityId:schedule.id,before:campaign.schedule ? JSON.parse(JSON.stringify(campaign.schedule)) : Prisma.JsonNull,after:JSON.parse(JSON.stringify({schedule,report,overrideReason:input.overrideReason})),requestId}})
    return {...report,schedule}
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000})
}
