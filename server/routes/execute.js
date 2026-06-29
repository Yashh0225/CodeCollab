// ============================================
// CodeCollab — Code Execution Route (Wandbox API Proxy)
// ============================================
// POST /execute — Run code via Wandbox (100% free, no API key)
// Security: Routed through server — never called from browser
// Rate-limited: 10 requests/min per user

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ============================================
// Language mapping (our IDs → Wandbox compiler IDs)
// ============================================
const LANGUAGE_MAP = {
  javascript: 'nodejs-20.17.0',
  typescript: 'typescript-5.6.2',
  python:     'cpython-3.14.0',
  java:       'openjdk-jdk-22+36',
  cpp:        'gcc-13.2.0',
  csharp:     'mono-6.12.0.199',
}

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP)

// ============================================
// In-memory rate limiter (per user, 10 req/min)
// ============================================
const rateLimitMap = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000

function checkRateLimit(userId) {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetTime) rateLimitMap.delete(key)
  }
}, 5 * 60 * 1000)

// ============================================
// POST /execute — Submit code for execution
// ============================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { code, language, stdin } = req.body

    // Validate input
    if (!code && code !== '') {
      return res.status(400).json({ error: 'Code is required' })
    }

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language: "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        supportedLanguages: SUPPORTED_LANGUAGES
      })
    }

    // Check rate limit
    const rateCheck = checkRateLimit(req.user.id)
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter
      })
    }

    const compiler = LANGUAGE_MAP[language]

    // Call Wandbox API
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        compiler,
        stdin: stdin || ''
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Wandbox API error:', response.status, errText)
      return res.status(502).json({ error: 'Code execution service temporarily unavailable.' })
    }

    const result = await response.json()
    
    // Wandbox returns: { program_output, program_error, compiler_error, status }
    // status is '0' for success, '1' for failure
    
    // Some compilers put stderr in compiler_error if it fails to compile
    const isSuccess = result.status === '0'

    res.json({
      stdout: result.program_output || null,
      stderr: result.program_error || null,
      compile_output: result.compiler_error || null,
      time: null, 
      memory: null, 
      status: {
        id: isSuccess ? 3 : 11, // 3 = Accepted, 11 = Runtime/Compile Error
        description: isSuccess ? 'Accepted' : 'Error'
      },
    })

  } catch (err) {
    console.error('Execute error:', err)
    res.status(500).json({ error: 'Internal server error during code execution' })
  }
})

// GET /execute/languages — List supported languages
router.get('/languages', (req, res) => {
  res.json({
    languages: Object.entries(LANGUAGE_MAP).map(([key, val]) => ({
      id: key,
      compiler: val
    }))
  })
})

export default router
