import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type User as FirebaseUser,
} from 'firebase/auth'
import { firebaseApp, firebaseConfigError } from '../../config/firebase-config.js'

export { firebaseConfigError }
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const googleProvider = new GoogleAuthProvider()

export function requireFirebaseAuth() {
  if (!firebaseAuth) {
    throw new Error(firebaseConfigError || 'Firebase authentication is not configured.')
  }
  return firebaseAuth
}

googleProvider.setCustomParameters({ prompt: 'select_account' })

if (firebaseAuth) {
  void setPersistence(firebaseAuth, browserLocalPersistence)
}

export async function currentFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user: FirebaseUser | null = firebaseAuth?.currentUser ?? null
  return user ? user.getIdToken(forceRefresh) : null
}
