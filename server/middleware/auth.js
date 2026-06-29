// ============================================
// CodeCollab — JWT Auth Middleware
// ============================================

import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { console.error('FATAL: JWT_SECRET is required in production'); process.exit(1); })()
    : 'codecollab-dev-secret-UNSAFE'
)

/**
 * Generate a JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      color: user.color,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

/**
 * Express middleware — requires valid JWT in Authorization header
 * Sets req.user with decoded token payload
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = decoded
  next()
}

/**
 * Optional auth — sets req.user if token is present, but doesn't block
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (decoded) req.user = decoded
  }

  next()
}
