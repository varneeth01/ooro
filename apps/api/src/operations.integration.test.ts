import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { issueTokens,hashSecret } from './http.js'
import { buildDisplayManifest } from './domain/campaign-eligibility.js'
import { writeInventoryAllocation } from './domain/inventory-ledger.js'

// Opt in only against a disposable local audit database. No production cleanup.
const enabled=process.env.OORO_INTEGRATION_TESTS==='true' && /127\.0\.0\.1:55432\/ooro_audit/.test(process.env.DATABASE_URL??'')
test('real PostgreSQL: auth → schedule → inventory → manifest → heartbeat → proof → reporting', {skip:!enabled},async()=>{
 const admin=await prisma.user.create({data:{phone:`audit-${randomUUID()}`,role:'ADMIN',accountStatus:'ACTIVE'}})
 const {accessToken}=await issueTokens(admin.id,admin.role)
 const headers={authorization:`Bearer ${accessToken}`}
 const screen=await prisma.display.create({data:{deviceId:randomUUID(),name:'Audit screen',state:'READY',deviceTokenHash:hashSecret('audit-device-'+admin.id),inventoryConfig:{create:{commercialSlots:28}}}})
 const campaign=await prisma.campaign.create({data:{name:'Audit campaign',status:'APPROVED',commercialFundingStatus:'INTERNAL_TEST',startsAt:new Date('2026-01-01'),endsAt:new Date('2027-01-01'),creatives:{create:{name:'Audit image',status:'APPROVED',type:'IMAGE',asset:{create:{fileName:'test.png',storageKey:'audit/test.png',url:'https://example.com/test.png',mimeType:'image/png'}}}}},include:{creatives:true}})
 const now=new Date(); const start=new Date(now.getTime()-60000),end=new Date(now.getTime()+86400000)
 const input={campaignId:campaign.id,revision:0,startsAt:start.toISOString(),endsAt:end.toISOString(),priority:'PREMIUM',rules:{days:[1,2,3,4,5,6,7],windows:[{start:'07:00',end:'11:00'},{start:'16:00',end:'22:00'}],mode:'PLAYS_PER_HOUR',value:6,creativeIds:[campaign.creatives[0].id]},target:{screenIds:[screen.id]}}
 const call=(method:'GET'|'POST',url:string,payload?:unknown)=>app.inject({method,url,headers,...(payload?{payload:payload as object}:{})})
 try {
  assert.equal((await app.inject({method:'GET',url:'/api/admin/scheduler'})).statusCode,401)
  await prisma.campaign.update({where:{id:campaign.id},data:{status:'DRAFT'}})
  const unapprovedCheck=await call('POST','/api/admin/scheduler/check',input);assert.equal(unapprovedCheck.statusCode,200);assert.equal(unapprovedCheck.json().data.canPublish,false)
  assert.equal((await call('POST','/api/admin/scheduler/publish',input)).statusCode,409)
  await prisma.campaign.update({where:{id:campaign.id},data:{status:'APPROVED'}})
  const preview=await call('POST','/api/admin/scheduler/check',input);assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().data.canPublish,true)
  const saved=await call('POST','/api/admin/scheduler/publish',input);assert.equal(saved.statusCode,200,saved.body)
  assert.ok(await prisma.inventoryAllocation.count({where:{campaignId:campaign.id,status:'RESERVED'}})>0)
  assert.ok(await prisma.displayCommand.count({where:{displayId:screen.id,commandType:'REFRESH_MANIFEST'}})>0)
  const {manifest}=await buildDisplayManifest(screen.id);assert.ok(manifest.items.length>=2);assert.equal(manifest.items[0].priority,300);assert.equal(manifest.items[0].intervalSeconds,600)
  assert.equal((await call('POST','/api/admin/scheduler/publish',input)).statusCode,409)
  const deviceHeaders={authorization:`Bearer audit-device-${admin.id}`}
  const deviceManifest=await app.inject({method:'GET',url:'/api/device/manifest',headers:deviceHeaders});assert.equal(deviceManifest.statusCode,200,deviceManifest.body)
  const heartbeat=await app.inject({method:'POST',url:'/api/device/heartbeat',headers:deviceHeaders,payload:{appVersion:'audit',manifestVersion:manifest.version,playbackState:'PLAYING',currentCampaignId:campaign.id,currentCreativeId:campaign.creatives[0].id}});assert.equal(heartbeat.statusCode,200,heartbeat.body)
  const fleet=await call('GET','/api/admin/displays');assert.equal(fleet.statusCode,200);assert.equal(fleet.json().data.find((d:{id:string})=>d.id===screen.id).connectivity,'ONLINE')
  const proofEventId=randomUUID()
  const proof=await app.inject({method:'POST',url:'/api/device/proof-of-play',headers:deviceHeaders,payload:{events:[{eventId:proofEventId,campaignId:campaign.id,creativeId:campaign.creatives[0].id,scheduleItemId:manifest.items[0].id,startedAt:now.toISOString(),endedAt:new Date(now.getTime()+10000).toISOString(),expectedDuration:10000,actualDuration:10000,success:true}]}});assert.equal(proof.statusCode,200,proof.body);assert.deepEqual(proof.json().data.acceptedEventIds,[proofEventId])
  const report=await call('GET',`/api/admin/proof-of-play?campaignId=${campaign.id}`);assert.equal(report.statusCode,200);assert.equal(report.json().data.total,1);assert.equal(report.json().data.items[0].scheduleItemId,manifest.items[0].id)
  await prisma.display.update({where:{id:screen.id},data:{lastHeartbeatAt:new Date(now.getTime()-600000)}})
  const offline=await call('GET','/api/admin/displays');assert.equal(offline.json().data.find((d:{id:string})=>d.id===screen.id).connectivity,'OFFLINE')
  const revised=await call('POST','/api/admin/scheduler/publish',{...input,revision:1,rules:{...input.rules,windows:[{start:'12:00',end:'14:00'}]}});assert.equal(revised.statusCode,200,revised.body)
  assert.notEqual((await buildDisplayManifest(screen.id)).manifest.version,manifest.version)
  assert.equal(await prisma.auditLog.count({where:{actorId:admin.id,action:'SCHEDULE_PUBLISHED'}}),2)
  const health=await call('GET',`/api/admin/displays/${screen.id}/live-state`);assert.equal(health.statusCode,200);assert.ok(health.json().data.lastHeartbeat)
  await prisma.display.update({where:{id:screen.id},data:{state:'MAINTENANCE'}})
  await app.inject({method:'POST',url:'/api/device/heartbeat',headers:deviceHeaders,payload:{playbackState:'READY',appVersion:'audit'}})
  assert.equal((await prisma.display.findUniqueOrThrow({where:{id:screen.id}})).state,'MAINTENANCE')
  assert.equal((await buildDisplayManifest(screen.id)).manifest.items.length,0)
  const blocked=await call('POST','/api/admin/scheduler/check',{...input,revision:2});assert.equal(blocked.statusCode,200);assert.equal(blocked.json().data.canPublish,false)
  await prisma.display.update({where:{id:screen.id},data:{state:'READY'}})
  const second=await prisma.display.create({data:{deviceId:randomUUID(),name:'Audit second',state:'READY',deviceTokenHash:hashSecret(randomUUID()),inventoryConfig:{create:{commercialSlots:28}}}})
  const group=await prisma.screenGroup.create({data:{name:randomUUID(),members:{create:{displayId:second.id}}}})
  const reassigned=await call('POST','/api/admin/scheduler/publish',{...input,revision:2,target:{groupIds:[group.id]}});assert.equal(reassigned.statusCode,200,reassigned.body)
  assert.equal((await buildDisplayManifest(screen.id)).manifest.items.length,0)
  assert.ok((await buildDisplayManifest(second.id)).manifest.items.length>0)
  assert.equal(await prisma.displayCommand.count({where:{displayId:screen.id,commandType:'REFRESH_MANIFEST'}}),3)
  await prisma.screenInventoryConfig.update({where:{screenId:second.id},data:{blockedSlots:28}})
  const full=await call('POST','/api/admin/scheduler/check',{...input,revision:3,target:{groupIds:[group.id]}});assert.equal(full.json().data.canPublish,false)
  const reserved=await prisma.inventoryAllocation.findFirstOrThrow({where:{scheduleId:reassigned.json().data.schedule.id,status:'RESERVED'}})
  await prisma.inventoryAllocation.update({where:{id:reserved.id},data:{status:'CANCELLED'}})
  await prisma.$transaction(tx=>writeInventoryAllocation(tx,{campaignId:campaign.id,screenId:reserved.screenId,date:reserved.date,slot:reserved.slot,holdId:randomUUID(),expiresAt:new Date(Date.now()+60000),status:'HELD'}))
  assert.equal((await prisma.inventoryAllocation.findUniqueOrThrow({where:{id:reserved.id}})).status,'HELD')

 } finally {
  // Keep test records for manual browser inspection; database is disposable.
  await app.close();await prisma.$disconnect()
 }
})
