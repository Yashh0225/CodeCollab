import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken, setUser, getMe } from '../services/api'

/**
 * OAuth callback handler — receives token from URL params,
 * stores it, fetches user profile, and redirects to home page.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      getMe()
        .then(data => {
          if (data && data.user) {
            setUser(data.user)
          }
        })
        .catch(err => console.error('Failed to fetch user:', err))
        .finally(() => navigate('/', { replace: true }))
    } else {
      navigate('/', { replace: true })
    }
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
