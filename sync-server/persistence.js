const Redis = require('ioredis')
const Y = require('yjs')

// Initialize Redis connection
// We use process.env.REDIS_URI which we will tell the user to set
const redis = process.env.REDIS_URI 
  ? new Redis(process.env.REDIS_URI)
  : null

if (redis) {
  redis.on('connect', () => console.log('✅ Connected to Redis persistence'))
  redis.on('error', (err) => console.error('❌ Redis connection error:', err))
} else {
  console.log('⚠️ No REDIS_URI provided. Running without persistence (in-memory only).')
}

/**
 * Saves a Y.Doc to Redis by encoding its state as a binary update
 */
async function saveDoc(docName, ydoc) {
  if (!redis) return

  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(ydoc))
    // Store in redis with key prefix "room:"
    await redis.set(`room:${docName}`, state)
  } catch (err) {
    console.error(`Failed to save doc ${docName} to Redis:`, err)
  }
}

/**
 * Loads a Y.Doc from Redis by retrieving the binary update and applying it
 */
async function loadDoc(docName, ydoc) {
  if (!redis) return

  try {
    const state = await redis.getBuffer(`room:${docName}`)
    if (state) {
      Y.applyUpdate(ydoc, state)
    }
  } catch (err) {
    console.error(`Failed to load doc ${docName} from Redis:`, err)
  }
}

module.exports = {
  saveDoc,
  loadDoc,
}
