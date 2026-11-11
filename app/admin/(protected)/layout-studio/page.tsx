import { canAdmin } from '@/apps/api/src/domain/admin-auth'
import { LayoutStudio } from '@/components/admin/layout-studio'
import { getAuthenticatedAdmin } from '@/lib/auth/backend-session'

export default async function Page() {
  const admin = await getAuthenticatedAdmin({ refreshSession: false })
  return <LayoutStudio canEdit={canAdmin(admin.role, 'device:write')} canPublish={admin.role === 'SUPER_ADMIN'} />
}
