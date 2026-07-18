import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { redirectPathForRole, redirectUserByRole } from '../auth/authService'
import { useAuth } from '../auth/AuthContext'

interface LoginLocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { user, isLoading, error: restoreError, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate replace to={redirectPathForRole(user.role)} />
  }

  const displayedError = error || restoreError

  const submit = async (nextEmail = email, nextPassword = password) => {
    if (!nextEmail.trim() || !nextPassword) {
      setError('Enter your email and password.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const authenticatedUser = await login(nextEmail.trim(), nextPassword)
      const fallbackPath = redirectUserByRole(authenticatedUser)
      const requestedPath = state?.from?.pathname
      const nextPath = requestedPath?.startsWith(`/${authenticatedUser.role}/`) ? requestedPath : fallbackPath
      navigate(nextPath, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <span className="brand-mark">PL</span>
        <div>
          <p className="eyebrow">PolyLoop access</p>
          <h1 id="login-title">Sign in to your workspace</h1>
          <p>Use one account login. Your verified server role opens the correct owner or collector dashboard.</p>
        </div>
        <form
          className="form-grid single"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {displayedError ? <p className="form-error">{displayedError}</p> : null}
          <button className="btn primary full-span" disabled={isSubmitting || isLoading} type="submit">
            {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="demo-actions full-span">
            <button
              className="btn secondary"
              disabled={isSubmitting || isLoading}
              type="button"
              onClick={() => void submit('owner@polyloop.demo', 'PolyLoop123!')}
            >
              Owner demo
            </button>
            <button
              className="btn secondary"
              disabled={isSubmitting || isLoading}
              type="button"
              onClick={() => void submit('collector@polyloop.demo', 'PolyLoop123!')}
            >
              Collector demo
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
