export const adminRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']
export const deviceOsWriteRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']

export function isAdminRole(role: string | null | undefined) {
  return role !== undefined && role !== null && adminRoles.includes(role)
}

export function canWriteDeviceOs(role: string | null | undefined) {
  return role !== undefined && role !== null && deviceOsWriteRoles.includes(role)
}
