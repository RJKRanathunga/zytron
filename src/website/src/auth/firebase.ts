import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type User as FirebaseUser,
} from 'firebase/auth'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

const requiredFirebaseKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const
const missingKeys = requiredFirebaseKeys.filter((key) => !firebaseConfig[key])

if (missingKeys.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`)
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({ prompt: 'select_account' })

void setPersistence(firebaseAuth, browserLocalPersistence)

export async function currentFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user: FirebaseUser | null = firebaseAuth.currentUser
  return user ? user.getIdToken(forceRefresh) : null
}
