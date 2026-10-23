import { NextResponse } from 'next/server'
import { AdminAuthError,requireAdminPermission,proxyAdminRequest } from '@/lib/auth/backend-session'
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminPermission('admin-users:manage');const {id}=await params;const r=await proxyAdminRequest('/api/admin/users/invitations/'+encodeURIComponent(id)+'/revoke',{method:'POST'});return new NextResponse(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
 catch(e){const status=e instanceof AdminAuthError?e.status:500;return NextResponse.json({data:null,error:{message:'Unable to revoke invitation'}},{status})}
}
