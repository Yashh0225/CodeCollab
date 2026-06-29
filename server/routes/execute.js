import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ============================================
// Language mapping (our IDs → Judge0 language IDs)
// ============================================
const LANGUAGE_MAP = {
  javascript: 93, // Node.js 18.15.0
  typescript: 94, // TypeScript 5.0.3
  python:     71, // Python 3.8.1
  java:       62, // Java 13.0.1
  cpp:        54, // C++ 17
  csharp:     51, // C#
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

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetTime) rateLimitMap.delete(key)
  }
}, 5 * 60 * 1000)

// ============================================
// POST /execute — Submit code for execution via Judge0
// ============================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { code, language, stdin } = req.body

    if (!code && code !== '') {
      return res.status(400).json({ error: 'Code is required' })
    }

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language: "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        supportedLanguages: SUPPORTED_LANGUAGES
      })
    }

    const rateCheck = checkRateLimit(req.user.id)
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter
      })
    }

    const judge0Id = LANGUAGE_MAP[language]
    const apiKey = process.env.JUDGE0_API_KEY
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: missing JUDGE0_API_KEY environment variable.' })
    }

    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: judge0Id,
        stdin: stdin || ''
      })
    })

    if (response.status === 429) {
      return res.status(429).json({ error: 'Judge0 daily limit exceeded. Please try again tomorrow.' })
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('Judge0 API error:', response.status, errText)
      return res.status(502).json({ error: 'Code execution service temporarily unavailable.' })
    }

    const result = await response.json()
    
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      time: result.time,
      memory: result.memory,
      status: result.status || { id: 0, description: 'Unknown' },
    })

  } catch (err) {
    console.error('Execute error:', err)
    res.status(500).json({ error: 'Internal server error during code execution' })
  }
})

router.get('/languages', (req, res) => {
  res.json({
    languages: Object.entries(LANGUAGE_MAP).map(([key, val]) => ({
      id: key,
      judge0_id: val
    }))
  })
})

export default router
