import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../services/api'

/**
 * OAuth callback handler — receives token from URL params,
 * stores it, and redirects to home page.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      // TODO: fetch user profile from /auth/me and store
    }
    navigate('/', { replace: true })
  }, [navigate, searchParams])

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
    }}>
      Signing you in...
    </div>
  )
}
