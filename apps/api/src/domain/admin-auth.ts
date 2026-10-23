export const adminRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']
export const deviceOsWriteRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']

export function isAdminRole(role: string | null | undefined) {
  return role !== undefined && role !== null && adminRoles.includes(role)
}

export function canWriteDeviceOs(role: string | null | undefined) {
  return role !== undefined && role !== null && deviceOsWriteRoles.includes(role)
}

export type AdminPermission = 'admin:read' | 'admin:write' | 'campaign:read' | 'campaign:create' | 'campaign:update' | 'campaign:approve' | 'campaign:schedule' | 'creative:write' | 'device:read' | 'device:write' | 'driver:read' | 'ride:read' | 'verification:read' | 'fraud:read' | 'operations:write' | 'finance:read' | 'support:read'

export const adminPermissions: Record<string, readonly AdminPermission[]> = {
  SUPER_ADMIN: ['admin:read','admin:write','campaign:read','campaign:create','campaign:update','campaign:approve','campaign:schedule','creative:write','device:read','device:write','driver:read','ride:read','verification:read','fraud:read','operations:write','finance:read','support:read'],
  ADMIN: ['admin:read','admin:write','campaign:read','campaign:create','campaign:update','campaign:approve','campaign:schedule','creative:write','device:read','device:write','driver:read','ride:read','verification:read','fraud:read','operations:write','finance:read','support:read'],
  OPERATIONS: ['admin:read','campaign:read','campaign:create','campaign:update','campaign:schedule','device:read','device:write','driver:read','ride:read','verification:read','fraud:read','operations:write','support:read'],
  FINANCE: ['admin:read','finance:read'],
  SUPPORT: ['admin:read','support:read','campaign:read'],
}

export function canAdmin(role: string | null | undefined, permission: AdminPermission): boolean {
  return !!role && (adminPermissions[role]?.includes(permission) ?? false)
}
