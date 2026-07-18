import { currentFirebaseIdToken } from '../auth/firebase'
import { appConfig } from '../../config/app-config.js'

export const API_BASE_URL = appConfig.apiBaseUrl
const TOKEN_STORAGE_KEY = 'polyloop-auth'
const OWNER_TOKEN_STORAGE_KEY = 'polyloop-owner-auth'
const COLLECTOR_TOKEN_STORAGE_KEY = 'polyloop-collector-auth'
export const AUTH_CLEARED_EVENT = 'polyloop-auth-cleared'

interface ApiEnvelope<T> {
  data: T
  meta?: Record<string, unknown>
}

interface ApiErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
}

export class ApiClientError extends Error {
  code: string
  status: number
  details: Record<string, unknown>

  constructor(message: string, status: number, code = 'api_error', details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function clearAuthTokens() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(COLLECTOR_TOKEN_STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}

async function parseError(response: Response): Promise<ApiClientError> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope
  return new ApiClientError(
    body.error?.message ?? `Request failed with status ${response.status}`,
    response.status,
    body.error?.code,
    body.error?.details,
  )
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  void allowRefresh
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const idToken = await currentFirebaseIdToken()
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  const envelope = (await response.json()) as ApiEnvelope<T>
  return envelope.data
}
