// ============================================
// CodeCollab — Room Routes
// ============================================
// POST /rooms         — create a new room
// GET  /rooms/:id     — get room details
// GET  /rooms         — list user's rooms
// POST /rooms/:id/snapshots  — save snapshot
// GET  /rooms/:id/snapshots  — list snapshots

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { createRoom, findRoomById, getUserRooms, createSnapshot, getRoomSnapshots, updateRoomLanguage } from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const router = Router()

// ============================================
// POST /rooms — create a new room
// ============================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, language } = req.body
    const roomId = nanoid(10) // Short, URL-friendly ID

    const { data: room, error } = await createRoom({
      id: roomId,
      name: name || `Room ${roomId}`,
      language: language || 'javascript',
      ownerId: req.user.id,
    })

    if (error) {
      console.error('Create room error:', error)
      return res.status(500).json({ error: 'Failed to create room' })
    }

    res.status(201).json({ room })
  } catch (err) {
    console.error('Create room error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /rooms — list user's rooms
// ============================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: rooms, error } = await getUserRooms(req.user.id)

    if (error) {
      console.error('List rooms error:', error)
      return res.status(500).json({ error: 'Failed to list rooms' })
    }

    res.json({ rooms })
  } catch (err) {
    console.error('List rooms error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /rooms/:id — get room details
// ============================================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data: room, error } = await findRoomById(req.params.id)

    if (error) {
      console.error('Get room error:', error)
      return res.status(500).json({ error: 'Failed to get room' })
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    res.json({ room })
  } catch (err) {
    console.error('Get room error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /rooms/:id/snapshots — save a snapshot
// ============================================
router.post('/:id/snapshots', requireAuth, async (req, res) => {
  try {
    const { content } = req.body

    if (!content && content !== '') {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify room exists
    const { data: room } = await findRoomById(req.params.id)
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const { data: snapshot, error } = await createSnapshot({
      roomId: req.params.id,
      content,
      savedBy: req.user.id,
    })

    if (error) {
      console.error('Save snapshot error:', error)
      return res.status(500).json({ error: 'Failed to save snapshot' })
    }

    res.status(201).json({ snapshot })
  } catch (err) {
    console.error('Save snapshot error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /rooms/:id/snapshots — list snapshots
// ============================================
router.get('/:id/snapshots', optionalAuth, async (req, res) => {
  try {
    const { data: snapshots, error } = await getRoomSnapshots(req.params.id)

    if (error) {
      console.error('List snapshots error:', error)
      return res.status(500).json({ error: 'Failed to list snapshots' })
    }

    res.json({ snapshots })
  } catch (err) {
    console.error('List snapshots error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// PUT /rooms/:id/language — update room language
// ============================================
router.put('/:id/language', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { language } = req.body

    const { data: room, error } = await updateRoomLanguage(id, language)

    if (error) {
      console.error('Update room language error:', error)
      return res.status(500).json({ error: 'Failed to update room language' })
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    res.json({ room })
  } catch (err) {
    console.error('Update room language error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
