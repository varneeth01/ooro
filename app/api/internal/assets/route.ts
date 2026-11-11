import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin, proxyAdminRequest } from '@/lib/auth/backend-session'
async function run(req:NextRequest){
 const admin=await getAuthenticatedAdmin()
 if(admin.role!=='SUPER_ADMIN')return NextResponse.json({error:'Forbidden'},{status:403})
 if(req.method==='POST'){
  const origin=req.headers.get('origin')
  if(!origin||origin!==req.nextUrl.origin)return NextResponse.json({error:'Origin mismatch'},{status:403})
 }
 const r=await proxyAdminRequest('/api/admin/assets',{method:req.method,headers:{'content-type':'application/json'},...(req.method==='POST'?{body:await req.text()}:{})})
 return new NextResponse(await r.text(),{status:r.status,headers:{'content-type':'application/json','Cache-Control':'no-store'}})
}
export {run as GET,run as POST}
