import { getApps, initializeApp } from "firebase/app"
import { appConfig } from "./app-config.js"

export const firebaseConfig = appConfig.firebase

const requiredFirebaseKeys = ["apiKey", "authDomain", "projectId", "appId"]
const missingKeys = requiredFirebaseKeys.filter((key) => !firebaseConfig[key])

export const firebaseConfigError =
  missingKeys.length > 0 ? `Missing Firebase configuration: ${missingKeys.join(", ")}` : ""

if (firebaseConfigError) {
  console.error(firebaseConfigError)
}

const defaultFirebaseApp = getApps().find((app) => app.name === "[DEFAULT]")

export const firebaseApp = firebaseConfigError ? null : defaultFirebaseApp ?? initializeApp(firebaseConfig)
