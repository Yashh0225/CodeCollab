// ============================================
// CodeCollab — Code Execution Route (Judge0 CE Proxy)
// ============================================
// POST /execute — Run code via Judge0 CE (RapidAPI)
// Security: Never exposes API key to the browser
// Rate-limited: 10 requests/min per user

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ============================================
// Language ID mapping (our IDs → Judge0 numeric IDs)
// ============================================
const LANGUAGE_MAP = {
  javascript: { id: 63, name: 'JavaScript (Node.js 12.14.0)' },
  typescript: { id: 74, name: 'TypeScript (3.7.4)' },
  python:     { id: 71, name: 'Python (3.8.1)' },
  java:       { id: 62, name: 'Java (OpenJDK 13.0.1)' },
  cpp:        { id: 54, name: 'C++ (GCC 9.2.0)' },
  csharp:     { id: 51, name: 'C# (Mono 6.6.0.161)' },
}

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP)

// ============================================
// In-memory rate limiter (per user, 10 req/min)
// ============================================
const rateLimitMap = new Map() // userId → { count, resetTime }
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

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

// Clean up stale entries every 5 minutes
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

    // Check API key
    const apiKey = process.env.JUDGE0_API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'Code execution service is not configured' })
    }

    const languageId = LANGUAGE_MAP[language].id

    // Step 1: Submit code to Judge0
    const submitResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString('base64') : null,
        cpu_time_limit: 5,    // 5 second max
        memory_limit: 128000, // 128 MB
      })
    })

    if (!submitResponse.ok) {
      const errText = await submitResponse.text()
      console.error('Judge0 submit error:', submitResponse.status, errText)
      return res.status(502).json({ error: 'Failed to submit code for execution' })
    }

    const { token } = await submitResponse.json()

    // Step 2: Poll for result (max 10 attempts, 1s apart)
    let result = null
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const pollResponse = await fetch(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          }
        }
      )

      if (!pollResponse.ok) {
        console.error('Judge0 poll error:', pollResponse.status)
        continue
      }

      result = await pollResponse.json()

      // Status IDs: 1=In Queue, 2=Processing, 3+=Done
      if (result.status && result.status.id > 2) {
        break
      }
    }

    if (!result || (result.status && result.status.id <= 2)) {
      return res.status(504).json({ error: 'Code execution timed out. Your code may contain an infinite loop.' })
    }

    // Decode base64 results
    const decode = (b64) => b64 ? Buffer.from(b64, 'base64').toString('utf-8') : null

    res.json({
      stdout: decode(result.stdout),
      stderr: decode(result.stderr),
      compile_output: decode(result.compile_output),
      time: result.time,
      memory: result.memory,
      status: result.status,
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
      name: val.name,
      judgeId: val.id
    }))
  })
})

export default router
