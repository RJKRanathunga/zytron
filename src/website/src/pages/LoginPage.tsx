import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { redirectPathForRole, redirectUserByRole } from '../auth/authService'
import { useAuth } from '../auth/AuthContext'
import type { UserRole } from '../types/auth'

interface LoginLocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { user, isLoading, error: restoreError, login, loginWithGoogle, register, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState | null
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [role, setRole] = useState<UserRole>('owner')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate replace to={redirectPathForRole(user.role)} />
  }

  const displayedError = error || restoreError

  const continueToWorkspace = (authenticatedUser: NonNullable<typeof user>) => {
    const fallbackPath = redirectUserByRole(authenticatedUser)
    const requestedPath = state?.from?.pathname
    const nextPath = requestedPath?.startsWith(`/${authenticatedUser.role}/`) ? requestedPath : fallbackPath
    navigate(nextPath, { replace: true })
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'login') {
        continueToWorkspace(await login(email.trim(), password))
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          setError('Enter your first and last name.')
          return
        }
        continueToWorkspace(
          await register({
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            organizationName: organizationName.trim(),
            role,
          }),
        )
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitGoogle = async () => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      continueToWorkspace(await loginWithGoogle(mode === 'register' ? role : undefined))
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Google sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then request a password reset.')
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await resetPassword(email.trim())
      setNotice('Password reset email sent.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset failed.')
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
          <h1 id="login-title">{mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}</h1>
          <p>Use one account login. Your verified server role opens the correct owner or collector dashboard.</p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Sign in
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
            Register
          </button>
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
          {mode === 'register' ? (
            <>
              <div className="form-grid compact full-span">
                <label className="field">
                  <span>First name</span>
                  <input
                    autoComplete="given-name"
                    required
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input
                    autoComplete="family-name"
                    required
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                <span>Organization</span>
                <input
                  autoComplete="organization"
                  type="text"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  <option value="owner">Owner</option>
                  <option value="collector">Collector</option>
                </select>
              </label>
            </>
          ) : null}
          <label className="field">
            <span>Password</span>
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {displayedError ? <p className="form-error">{displayedError}</p> : null}
          {notice ? <p className="form-success">{notice}</p> : null}
          <button className="btn primary full-span" disabled={isSubmitting || isLoading} type="submit">
            {isSubmitting || isLoading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            className="btn secondary full-span"
            disabled={isSubmitting || isLoading}
            type="button"
            onClick={() => void submitGoogle()}
          >
            Continue with Google
          </button>
          <div className="auth-foot-actions full-span">
            <button
              className="text-btn"
              disabled={isSubmitting || isLoading}
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Need an account?' : 'Already registered?'}
            </button>
            <button
              className="text-btn"
              disabled={isSubmitting || isLoading}
              type="button"
              onClick={() => void submitReset()}
            >
              Reset password
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
