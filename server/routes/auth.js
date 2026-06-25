// ============================================
// CodeCollab — Auth Routes
// ============================================
// POST /auth/register  — create account
// POST /auth/login     — login with credentials
// GET  /auth/me        — get current user (requires JWT)
// GET  /auth/google    — start Google OAuth
// GET  /auth/google/callback
// GET  /auth/github    — start GitHub OAuth
// GET  /auth/github/callback

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import passport from 'passport'
import { createUser, findUserByUsername, findUserById } from '../db.js'
import { generateToken, requireAuth } from '../middleware/auth.js'

const router = Router()

// Random cursor colours for new users
const CURSOR_COLORS = [
  '#F08040', '#40A0F0', '#F04080', '#40F0A0',
  '#A040F0', '#F0A040', '#40F0F0', '#F04040',
  '#80F040', '#4080F0', '#F080A0', '#A0F040',
]

function randomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
}

// ============================================
// POST /auth/register
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3–30 characters' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if username exists
    const { data: existing } = await findUserByUsername(username)
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)
    const color = randomColor()
    const { data: user, error } = await createUser({ username, passwordHash, color })

    if (error) {
      console.error('Register error:', error)
      return res.status(500).json({ error: 'Failed to create account' })
    }

    // Generate JWT
    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        color: user.color,
      },
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /auth/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const { data: user } = await findUserByUsername(username)
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Generate JWT
    const token = generateToken(user)

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        color: user.color,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /auth/me — current user profile
// ============================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await findUserById(req.user.id)
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// OAuth — Google
// ============================================
// OAuth — Google
// ============================================
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/?error=Google_OAuth_Not_Configured')
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/?error=Google_OAuth_Not_Configured')
  passport.authenticate('google', { session: false, failureRedirect: '/auth/oauth-error' })(req, res, next)
}, (req, res) => {
  const token = generateToken(req.user)
  // Redirect to frontend with token
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`)
})

// ============================================
// OAuth — GitHub
// ============================================
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) return res.redirect('/?error=GitHub_OAuth_Not_Configured')
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next)
})

router.get('/github/callback', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) return res.redirect('/?error=GitHub_OAuth_Not_Configured')
  passport.authenticate('github', { session: false, failureRedirect: '/auth/oauth-error' })(req, res, next)
}, (req, res) => {
  const token = generateToken(req.user)
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`)
})

// ============================================
// OAuth error fallback
// ============================================
router.get('/oauth-error', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`)
})

export default router
