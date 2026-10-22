export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT'] as const
export type AdminRole = typeof ADMIN_ROLES[number]
export const ADMIN_PERMISSIONS = ['ADMIN_READ', 'ADMIN_WRITE', 'CAMPAIGN_READ', 'CAMPAIGN_CREATE', 'CAMPAIGN_EDIT', 'CAMPAIGN_APPROVE', 'CAMPAIGN_SCHEDULE', 'CAMPAIGN_ACTIVATE', 'CREATIVE_WRITE', 'DEVICE_READ', 'DEVICE_WRITE', 'NETWORK_WRITE', 'FINANCE_READ'] as const
export type AdminPermission = typeof ADMIN_PERMISSIONS[number]
const all = [...ADMIN_PERMISSIONS] as AdminPermission[]
const campaignOperator: AdminPermission[] = ['ADMIN_READ', 'CAMPAIGN_READ', 'CAMPAIGN_CREATE', 'CAMPAIGN_EDIT', 'CAMPAIGN_APPROVE', 'CAMPAIGN_SCHEDULE', 'CAMPAIGN_ACTIVATE', 'CREATIVE_WRITE', 'DEVICE_READ', 'DEVICE_WRITE', 'NETWORK_WRITE', 'FINANCE_READ']
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = { SUPER_ADMIN: all, ADMIN: all, OPERATIONS: campaignOperator, FINANCE: ['ADMIN_READ', 'CAMPAIGN_READ', 'DEVICE_READ', 'FINANCE_READ'], SUPPORT: ['ADMIN_READ', 'CAMPAIGN_READ', 'DEVICE_READ'] }
export function isAdminRole(role: string | null | undefined): role is AdminRole { return Boolean(role && ADMIN_ROLES.includes(role as AdminRole)) }
export function hasAdminPermission(role: string | null | undefined, permission: AdminPermission) { return isAdminRole(role) && ADMIN_ROLE_PERMISSIONS[role].includes(permission) }
export const adminRoles: string[] = [...ADMIN_ROLES]
export const deviceOsWriteRoles: string[] = ADMIN_ROLES.filter((role) => hasAdminPermission(role, 'DEVICE_WRITE'))
export const campaignWriteRoles: string[] = ADMIN_ROLES.filter((role) => hasAdminPermission(role, 'CAMPAIGN_EDIT'))
export const campaignApprovalRoles: string[] = ADMIN_ROLES.filter((role) => hasAdminPermission(role, 'CAMPAIGN_APPROVE'))
export const campaignSchedulingRoles: string[] = ADMIN_ROLES.filter((role) => hasAdminPermission(role, 'CAMPAIGN_SCHEDULE'))
export function canWriteDeviceOs(role: string | null | undefined) {
  return hasAdminPermission(role, 'DEVICE_WRITE')
}
