export const adminRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']

export function isAdminRole(role: string | null | undefined) {
  return role !== undefined && role !== null && adminRoles.includes(role)
}
