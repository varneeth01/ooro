import { NextResponse } from 'next/server'
import { AdminAuthError,requireAdminPermission,proxyAdminRequest } from '@/lib/auth/backend-session'
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminPermission('admin-users:manage');const {id}=await params;const r=await proxyAdminRequest('/api/admin/users/'+encodeURIComponent(id),{method:'PATCH',headers:{'content-type':'application/json'},body:await req.text()});return new NextResponse(await r.text(),{status:r.status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
 catch(e){const status=e instanceof AdminAuthError?e.status:500;return NextResponse.json({data:null,error:{message:'Unable to update administrator'}},{status})}
}
