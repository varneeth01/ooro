import { getAuthenticatedAdmin } from '@/lib/auth/backend-session'
import { redirect } from 'next/navigation'
import AssetConsole from './asset-console'
export const dynamic='force-dynamic'
export default async function AssetsPage(){
 const admin=await getAuthenticatedAdmin()
 if(admin.role!=='SUPER_ADMIN') redirect('/admin')
 return <AssetConsole/>
}
