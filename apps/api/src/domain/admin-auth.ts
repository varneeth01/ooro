export const adminRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']
export const deviceOsWriteRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']

export function isAdminRole(role: string | null | undefined) {
  return role !== undefined && role !== null && adminRoles.includes(role)
}

export function canWriteDeviceOs(role: string | null | undefined) {
  return role !== undefined && role !== null && deviceOsWriteRoles.includes(role)
}

export type AdminPermission = 'campaign:read' | 'campaign:create' | 'campaign:update' | 'campaign:approve' | 'campaign:schedule' | 'operations:write' | 'finance:read' | 'support:read'

export const adminPermissions: Record<string, readonly AdminPermission[]> = {
  SUPER_ADMIN: ['campaign:read','campaign:create','campaign:update','campaign:approve','campaign:schedule','operations:write','finance:read','support:read'],
  ADMIN: ['campaign:read','campaign:create','campaign:update','campaign:approve','campaign:schedule','operations:write','finance:read','support:read'],
  OPERATIONS: ['campaign:read','campaign:create','campaign:update','campaign:approve','campaign:schedule','operations:write','support:read'],
  FINANCE: ['finance:read'],
  SUPPORT: ['support:read'],
}

export function canAdmin(role: string | null | undefined, permission: AdminPermission): boolean {
  return !!role && (adminPermissions[role]?.includes(permission) ?? false)
}
