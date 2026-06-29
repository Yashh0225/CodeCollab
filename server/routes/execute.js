// ============================================
// CodeCollab — Code Execution Route (Piston API Proxy)
// ============================================
// POST /execute — Run code via Piston (free, no API key)
// Security: Routed through server — never called from browser
// Rate-limited: 10 requests/min per user
// https://github.com/engineer-man/piston

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ============================================
// Language mapping (our IDs → Piston language + version)
// ============================================
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python:     { language: 'python',     version: '3.10.0' },
  java:       { language: 'java',       version: '15.0.2' },
  cpp:        { language: 'c++',        version: '10.2.0' },
  csharp:     { language: 'csharp',     version: '6.12.0' },
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

    const pistonLang = LANGUAGE_MAP[language]

    // Call Piston API
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang.language,
        version: pistonLang.version,
        files: [{ content: code }],
        stdin: stdin || '',
        run_timeout: 5000, // 5 second max execution
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Piston API error:', response.status, errText)
      return res.status(502).json({ error: 'Code execution service temporarily unavailable' })
    }

    const result = await response.json()

    // Piston returns { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
    const run = result.run || {}
    const compile = result.compile || {}

    res.json({
      stdout: run.stdout || null,
      stderr: run.stderr || null,
      compile_output: compile.stderr || null,
      time: null, // Piston doesn't return execution time
      memory: null, // Piston doesn't return memory usage
      status: {
        id: run.code === 0 ? 3 : 11, // 3 = Accepted, 11 = Runtime Error (matches Judge0 convention)
        description: run.code === 0 ? 'Accepted' : (run.signal ? `Signal: ${run.signal}` : `Exit Code: ${run.code}`)
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
      name: val.language,
      version: val.version
    }))
  })
})

export default router
