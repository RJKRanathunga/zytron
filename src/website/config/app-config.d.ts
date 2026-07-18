export interface PublicFirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  storageBucket: string
  messagingSenderId: string
}

export interface PublicAppConfig {
  apiBaseUrl: string
  googleMapsBrowserApiKey: string
  firebase: PublicFirebaseConfig
}

export const appConfig: PublicAppConfig
