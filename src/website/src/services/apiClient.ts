export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1'
const TOKEN_STORAGE_KEY = 'polyloop-auth'
const OWNER_TOKEN_STORAGE_KEY = 'polyloop-owner-auth'
const COLLECTOR_TOKEN_STORAGE_KEY = 'polyloop-collector-auth'
export const AUTH_CLEARED_EVENT = 'polyloop-auth-cleared'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

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

export function getAuthTokens(): AuthTokens | null {
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthTokens
  } catch {
    clearAuthTokens()
    return null
  }
}

export function setAuthTokens(tokens: AuthTokens) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
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

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getAuthTokens()
  if (!tokens?.refreshToken) return null
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.refreshToken}`,
    },
  })
  if (!response.ok) {
    clearAuthTokens()
    return null
  }
  const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }>
  const nextTokens = { ...tokens, accessToken: envelope.data.accessToken }
  setAuthTokens(nextTokens)
  return nextTokens.accessToken
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const tokens = getAuthTokens()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && allowRefresh && tokens?.refreshToken && !path.startsWith('/auth/refresh')) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      return apiRequest<T>(path, options, false)
    }
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  const envelope = (await response.json()) as ApiEnvelope<T>
  return envelope.data
}
