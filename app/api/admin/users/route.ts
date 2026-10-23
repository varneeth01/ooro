import { NextResponse } from 'next/server'
import { AdminAuthError, requireAdminPermission, proxyAdminRequest } from '@/lib/auth/backend-session'
export const dynamic='force-dynamic'
function error(err:unknown){const status=err instanceof AdminAuthError?err.status:500;return NextResponse.json({data:null,error:{message:status===500?'Admin directory unavailable':'Access denied'}},{status})}
export async function GET(req:Request){
 try{await requireAdminPermission('admin-users:manage');const search=new URL(req.url).search;const res=await proxyAdminRequest('/api/admin/users'+search);return new NextResponse(await res.text(),{status:res.status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
 catch(e){return error(e)}
}
