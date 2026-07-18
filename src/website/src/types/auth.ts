export type UserRole = 'owner' | 'collector'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
  firstName: string
  lastName: string
  organization: string
}

export function isUserRole(role: string): role is UserRole {
  return role === 'owner' || role === 'collector'
}
