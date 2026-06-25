import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  register, login, createRoom, listRooms,
  isAuthenticated, getUser, logout,
  getGoogleOAuthUrl, getGitHubOAuthUrl,
} from '../services/api'
import './Home.css'

// ============================================
// SVG Icons
// ============================================
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
)

// ============================================
// Auth Modal Component
// ============================================
function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register(username, password)
      } else {
        await login(username, password)
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to start collaborating'
            : 'Join CodeCollab and code together'
          }
        </p>

        {/* OAuth buttons */}
        <div className="auth-oauth-btns">
          <a href={getGoogleOAuthUrl()} className="oauth-btn">
            <GoogleIcon /> Google
          </a>
          <a href={getGitHubOAuthUrl()} className="oauth-btn">
            <GitHubIcon /> GitHub
          </a>
        </div>

        <div className="auth-divider">or</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Home Page
// ============================================
export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(getUser())
  const [roomIdInput, setRoomIdInput] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomLang, setRoomLang] = useState('javascript')
  const [myRooms, setMyRooms] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      loadRooms()
    }
  }, [user])

  // Handle OAuth callback & Redirect params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('codecollab_token', token)
      
      const redirect = params.get('redirect')
      if (redirect) {
        navigate(redirect, { replace: true })
      } else {
        window.history.replaceState({}, '', '/')
      }
      
      setUser(getUser())
    } else if (params.get('login') === 'true' && !isAuthenticated()) {
      setShowAuth(true)
    }
  }, [navigate])

  const loadRooms = async () => {
    try {
      const data = await listRooms()
      setMyRooms(data.rooms || [])
    } catch {
      // silent
    }
  }

  const handleCreateRoom = async () => {
    if (!isAuthenticated()) {
      setShowAuth(true)
      return
    }

    setCreating(true)
    try {
      const data = await createRoom(roomName || undefined, roomLang)
      navigate(`/room/${data.room.id}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleJoinRoom = () => {
    const id = roomIdInput.trim()
    if (!id) return

    // Handle full URL or just the ID
    const match = id.match(/room\/([a-zA-Z0-9_-]+)/)
    const roomId = match ? match[1] : id

    navigate(`/room/${roomId}`)
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    setUser(getUser())

    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      navigate(redirect, { replace: true })
    }
  }

  const handleLogout = () => {
    logout()
    setUser(null)
    setMyRooms([])
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDay}d ago`
  }

  return (
    <div className="home-page">
      {/* Nav */}
      <nav className="home-nav">
        <div className="home-nav-brand">
          <div className="toolbar-logo">{'</>'}</div>
          <span className="toolbar-name">CodeCollab</span>
        </div>

        <div className="home-nav-actions">
          {user ? (
            <div className="user-menu">
              <div className="user-menu-avatar" style={{ background: user.color || '#7c6aef' }}>
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <span className="user-menu-name">{user.username}</span>
              <button className="btn btn-ghost" onClick={handleLogout} style={{ marginLeft: '4px' }}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-badge">
          ⚡ Real-time collaboration powered by CRDTs
        </div>

        <h1>
          Code together,<br />
          <span className="gradient-text">in real-time.</span>
        </h1>

        <p>
          A collaborative code editor that syncs instantly across all users.
          No conflicts, no locking — just code.
        </p>
      </div>

      {/* Action Cards */}
      <div className="home-actions">
        {/* Create Room */}
        <div className="action-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div className="action-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', marginBottom: 0 }}>
              ✦
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
              onClick={handleCreateRoom}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
          <h3>Create a Room</h3>
          <p>Start a new coding session. Share the link with others to collaborate in real-time.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="room-name-input">Room name (optional)</label>
            <input
              id="room-name-input"
              className="form-input"
              type="text"
              placeholder="My awesome project"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="room-lang-select">Language</label>
            <select
              id="room-lang-select"
              className="select"
              style={{ width: '100%' }}
              value={roomLang}
              onChange={(e) => setRoomLang(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>
        </div>

        {/* Join Room */}
        <div className="action-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div className="action-card-icon" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--color-success)', marginBottom: 0 }}>
              🔗
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '8px 16px' }}
              onClick={handleJoinRoom}
              disabled={!roomIdInput.trim()}
            >
              Join Room
            </button>
          </div>
          <h3>Join a Room</h3>
          <p>Enter a room ID or paste a share link to join an existing coding session.</p>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="join-room-input">Room ID or link</label>
            <input
              id="join-room-input"
              className="form-input"
              type="text"
              placeholder="Paste room ID or URL..."
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>
        </div>
      </div>

      {/* My Rooms (if logged in) */}
      {user && myRooms.length > 0 && (
        <div className="my-rooms">
          <div className="my-rooms-header">
            <span className="my-rooms-title">Your Rooms</span>
          </div>
          <div className="room-list">
            {myRooms.map((room) => (
              <a
                key={room.id}
                className="room-list-item"
                onClick={() => navigate(`/room/${room.id}`)}
              >
                <div className="room-list-icon">{'</>'}</div>
                <div className="room-list-info">
                  <div className="room-list-name">{room.name || room.id}</div>
                  <div className="room-list-meta">
                    {room.language} · {formatDate(room.created_at)}
                  </div>
                </div>
                <span className="room-list-arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="home-features">
        <div className="feature-item">
          <span className="feature-icon">⚡</span>
          <div className="feature-text">
            <h4>Real-time Sync</h4>
            <p>Edits appear in &lt;50ms via CRDT-powered synchronization</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🎯</span>
          <div className="feature-text">
            <h4>Live Cursors</h4>
            <p>See collaborators' cursors with coloured carets and names</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <div className="feature-text">
            <h4>No Conflicts</h4>
            <p>CRDTs guarantee convergence — no locking, no data loss</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🌐</span>
          <div className="feature-text">
            <h4>50+ Languages</h4>
            <p>Monaco Editor with VS Code-level syntax highlighting</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">📸</span>
          <div className="feature-text">
            <h4>Session History</h4>
            <p>Save snapshots and browse previous versions</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">☁️</span>
          <div className="feature-text">
            <h4>Works Offline</h4>
            <p>IndexedDB persistence — edits sync when reconnected</p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}
