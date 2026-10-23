import { NextResponse } from 'next/server'
import { AdminAuthError,requireAdminPermission,proxyAdminRequest } from '@/lib/auth/backend-session'
export const dynamic='force-dynamic'
function error(err:unknown){const status=err instanceof AdminAuthError?err.status:500;return NextResponse.json({data:null,error:{message:status===500?'Invitation operation unavailable':'Access denied'}},{status})}
export async function GET(){
 try{await requireAdminPermission('admin-users:manage');const r=await proxyAdminRequest('/api/admin/users/invitations');return new NextResponse(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}})}catch(e){return error(e)}
}
export async function POST(req:Request){
 try{await requireAdminPermission('admin-users:manage');const body=await req.text();const r=await proxyAdminRequest('/api/admin/users/invitations',{method:'POST',headers:{'content-type':'application/json'},body});return new NextResponse(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}})}catch(e){return error(e)}
}
