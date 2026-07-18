import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { ApiClientError, apiRequest, clearAuthTokens } from '../services/apiClient'
import { firebaseAuth, googleProvider } from './firebase'
import type { AuthUser, UserRole } from '../types/auth'
import { isUserRole } from '../types/auth'
import type { RegisterInput } from './AuthContext'

interface AuthResponse {
  user: AuthUser
}

interface CurrentUserResponse {
  user: AuthUser
}

interface GoogleProfileInput {
  role?: UserRole
  organizationName?: string
}

function requireValidRole(user: AuthUser): AuthUser {
  if (!isUserRole(user.role)) {
    clearAuthTokens()
    throw new Error('Your account does not have a valid role.')
  }
  return user
}

export function redirectPathForRole(role: AuthUser['role']) {
  return role === 'owner' ? '/owner/dashboard' : '/collector/dashboard'
}

export function redirectUserByRole(user: AuthUser) {
  return redirectPathForRole(user.role)
}

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/weak-password':
      return 'Use a stronger password with at least 8 characters.'
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.'
  }
}

function splitFirebaseName(firebaseUser: FirebaseUser, fallbackEmail: string) {
  const displayName = firebaseUser.displayName?.trim()
  if (displayName) {
    const parts = displayName.split(/\s+/)
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ') || parts[0],
    }
  }
  const fallbackName = fallbackEmail.split('@')[0] || 'Zytron'
  return { firstName: fallbackName, lastName: 'User' }
}

async function syncLogin(body: Record<string, unknown> = {}) {
  try {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return requireValidRole(response.user)
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new Error(error.message, { cause: error })
    }
    throw error
  }
}

export async function getCurrentUser() {
  return authService.getCurrentUser()
}

export async function requireAuth() {
  const user = await authService.getCurrentUser()
  if (!user) {
    throw new Error('Authentication is required.')
  }
  return user
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error(`A ${role} account is required.`)
  }
  return user
}

export const authService = {
  hasSession: () => Boolean(firebaseAuth.currentUser),

  login: async (email: string, password: string): Promise<AuthUser> => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      return await syncLogin()
    } catch (error) {
      throw new Error(firebaseErrorMessage(error), { cause: error })
    }
  },

  register: async (input: RegisterInput): Promise<AuthUser> => {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, input.email, input.password)
      await updateProfile(credential.user, { displayName: `${input.firstName} ${input.lastName}`.trim() })
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          first_name: input.firstName,
          last_name: input.lastName,
          role: input.role,
          phone: input.phone ?? '',
          organization_name: input.organizationName,
        }),
      })
      return requireValidRole(response.user)
    } catch (error) {
      throw new Error(firebaseErrorMessage(error), { cause: error })
    }
  },

  loginWithGoogle: async (profile: GoogleProfileInput = {}): Promise<AuthUser> => {
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider)
      const email = credential.user.email ?? ''
      const names = splitFirebaseName(credential.user, email)
      const body = profile.role
        ? {
            role: profile.role,
            first_name: names.firstName,
            last_name: names.lastName,
            organization_name: profile.organizationName || credential.user.displayName || names.firstName,
          }
        : {}
      return await syncLogin(body)
    } catch (error) {
      throw new Error(firebaseErrorMessage(error), { cause: error })
    }
  },

  resetPassword: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email)
    } catch (error) {
      throw new Error(firebaseErrorMessage(error), { cause: error })
    }
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiRequest<CurrentUserResponse>('/auth/me')
    return requireValidRole(response.user)
  },

  logout: async () => {
    clearAuthTokens()
    await signOut(firebaseAuth)
  },

  onFirebaseAuthStateChanged: (callback: (user: FirebaseUser | null) => void) =>
    onAuthStateChanged(firebaseAuth, callback),
}
