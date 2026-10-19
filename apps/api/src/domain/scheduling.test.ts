import test from 'node:test'
import assert from 'node:assert/strict'
import { activeAt, scheduleRules, rulesOverlap, requiredSlots } from './scheduling.js'
const rules=scheduleRules.parse({days:[1],windows:[{start:'09:00',end:'10:00'}],mode:'WEIGHTED',value:2,creativeIds:['00000000-0000-4000-8000-000000000001']})
test('09:00 IST is 03:30 UTC independently of server timezone; end exclusive',()=>{
 const start=new Date('2026-09-01T00:00:00Z'),end=new Date('2026-10-01T00:00:00Z')
 assert.equal(activeAt(start,end,rules,new Date('2026-09-28T03:29:59Z')),false)
 assert.equal(activeAt(start,end,rules,new Date('2026-09-28T03:30:00Z')),true)
 assert.equal(activeAt(start,end,rules,new Date('2026-09-28T04:30:00Z')),false)
 assert.equal(activeAt(start,end,rules,new Date('2026-09-29T03:30:00Z')),false)
})
test('overlap ignores different weekdays and adjacent windows',()=>{
 assert.equal(rulesOverlap(rules,{...rules,days:[2]}),false)
 assert.equal(rulesOverlap(rules,{...rules,windows:[{start:'10:00',end:'11:00'}]}),false)
 assert.equal(rulesOverlap(rules,{...rules,windows:[]}),true)
 assert.equal(scheduleRules.safeParse({...rules,windows:[{start:'25:00',end:'26:00'}]}).success,false)
})
test('frequency consumes capacity according to creative duration',()=>{
 assert.equal(requiredSlots({...rules,mode:'PLAYS_PER_HOUR',value:6},15,28),1)
 assert.equal(requiredSlots({...rules,mode:'SHARE',value:50},15,28),14)
 assert.equal(requiredSlots({...rules,mode:'EVERY_MINUTES',value:1},120,28),56)
})
