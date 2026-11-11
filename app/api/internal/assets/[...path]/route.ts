import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin, proxyAdminRequest } from '@/lib/auth/backend-session'
const allowed = ['GET','POST','PATCH']
async function run(req:NextRequest,context:{params:Promise<{path:string[]}>}) {
 const admin=await getAuthenticatedAdmin()
 if(admin.role!=='SUPER_ADMIN')return NextResponse.json({error:'Forbidden'}, {status:403})
 if(!allowed.includes(req.method))return NextResponse.json({error:'Method not allowed'},{status:405})
 if(req.method!=='GET'){
  const origin=req.headers.get('origin')
  if(!origin || origin!==req.nextUrl.origin)return NextResponse.json({error:'Origin mismatch'},{status:403})
 }
 const {path}=await context.params
 if(!path.length || path.some(v=>! /^[A-Za-z0-9_-]+$/.test(v)))return NextResponse.json({error:'Invalid path'},{status:400})
 const upstream=await proxyAdminRequest('/api/admin/assets/'+path.map(encodeURIComponent).join('/'),{
   method:req.method,headers:{'content-type':'application/json'},
   ...(req.method!=='GET'?{body:await req.text()}:{})
 })
 return new NextResponse(await upstream.text(),{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
}
export {run as GET,run as POST,run as PATCH}
