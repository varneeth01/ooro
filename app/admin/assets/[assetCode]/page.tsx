import { getAuthenticatedAdmin } from '@/lib/auth/backend-session'
import { redirect } from 'next/navigation'
import AssetConsole from '../asset-console'
export const dynamic='force-dynamic'
export default async function AssetDetail({params}:{params:Promise<{assetCode:string}>}){
 const admin=await getAuthenticatedAdmin()
 if(admin.role!=='SUPER_ADMIN')redirect('/admin')
 const {assetCode}=await params
 return <AssetConsole initialCode={assetCode}/>
}
