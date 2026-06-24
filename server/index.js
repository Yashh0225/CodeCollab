// ============================================
// CodeCollab — Express Server Entry Point
// ============================================

import express from 'express'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import roomRoutes from './routes/rooms.js'
import { findOrCreateOAuthUser, MIGRATION_SQL } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ============================================
// Middleware
// ============================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

app.use(session({
  secret: process.env.SESSION_SECRET || 'codecollab-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' },
}))

app.use(passport.initialize())
app.use(passport.session())

// ============================================
// Passport serialization (minimal — we use JWT, not sessions)
// ============================================
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

// ============================================
// OAuth Strategies — only register if credentials exist
// ============================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const { data: user, error } = await findOrCreateOAuthUser({
        provider: 'google',
        providerId: profile.id,
        username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `google_${profile.id}`,
        avatarUrl: profile.photos?.[0]?.value,
      })
      if (error) return done(error)
      done(null, user)
    } catch (err) {
      done(err)
    }
  }))
  console.log('✅ Google OAuth configured')
} else {
  console.log('ℹ️  Google OAuth not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)')
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
    proxy: true,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const { data: user, error } = await findOrCreateOAuthUser({
        provider: 'github',
        providerId: profile.id,
        username: profile.username || profile.displayName || `github_${profile.id}`,
        avatarUrl: profile.photos?.[0]?.value,
      })
      if (error) return done(error)
      done(null, user)
    } catch (err) {
      done(err)
    }
  }))
  console.log('✅ GitHub OAuth configured')
} else {
  console.log('ℹ️  GitHub OAuth not configured (set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)')
}

// ============================================
// Routes
// ============================================
app.use('/auth', authRoutes)
app.use('/rooms', roomRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'codecollab-api',
    timestamp: new Date().toISOString(),
  })
})

// Migration SQL endpoint (dev only — shows SQL to run in Supabase)
if (process.env.NODE_ENV !== 'production') {
  app.get('/migration', (req, res) => {
    res.type('text/plain').send(MIGRATION_SQL)
  })
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ============================================
// Start
// ============================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║           CodeCollab API Server              ║
╠══════════════════════════════════════════════╣
║  Port:     ${String(PORT).padEnd(33)}║
║  Mode:     ${(process.env.NODE_ENV || 'development').padEnd(33)}║
║  Client:   ${(process.env.CLIENT_URL || 'http://localhost:5173').padEnd(33)}║
╚══════════════════════════════════════════════╝
  `)
  console.log('Routes:')
  console.log('  POST /auth/register    — Create account')
  console.log('  POST /auth/login       — Login')
  console.log('  GET  /auth/me          — Current user')
  console.log('  GET  /auth/google      — Google OAuth')
  console.log('  GET  /auth/github      — GitHub OAuth')
  console.log('  POST /rooms            — Create room')
  console.log('  GET  /rooms            — List rooms')
  console.log('  GET  /rooms/:id        — Room details')
  console.log('  POST /rooms/:id/snapshots — Save snapshot')
  console.log('  GET  /rooms/:id/snapshots — List snapshots')
  console.log('  GET  /health           — Health check')
  if (process.env.NODE_ENV !== 'production') {
    console.log('  GET  /migration        — View SQL migration')
  }
  console.log('')
})
