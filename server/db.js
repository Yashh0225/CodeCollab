// ============================================
// CodeCollab — Supabase Database Client
// ============================================
// Connects to Supabase PostgreSQL. If credentials are not set,
// falls back to an in-memory store for local development.

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

let supabase = null
let isDemo = false

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey)
  console.log('✅ Connected to Supabase')
} else {
  isDemo = true
  console.log('⚠️  Supabase not configured — running in demo mode (in-memory store)')
  console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env to enable persistence')
}

// ============================================
// In-memory fallback for demo mode
// ============================================
const memStore = {
  users: [],
  rooms: [],
  snapshots: [],
}

// ============================================
// Database API — abstracts Supabase vs in-memory
// ============================================

export async function createUser({ username, passwordHash, color }) {
  if (isDemo) {
    const id = crypto.randomUUID()
    const user = { id, username, password_hash: passwordHash, color: color || '#F08040', created_at: new Date().toISOString() }
    memStore.users.push(user)
    return { data: user, error: null }
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ username, password_hash: passwordHash, color: color || '#F08040' })
    .select()
    .single()

  return { data, error }
}

export async function findUserByUsername(username) {
  if (isDemo) {
    const user = memStore.users.find(u => u.username === username)
    return { data: user || null, error: null }
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  return { data, error: error?.code === 'PGRST116' ? null : error }
}

export async function findUserById(id) {
  if (isDemo) {
    const user = memStore.users.find(u => u.id === id)
    return { data: user || null, error: null }
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, color, created_at')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function findOrCreateOAuthUser({ provider, providerId, username, avatarUrl, color }) {
  const providerField = provider === 'google' ? 'google_id' : 'github_id'

  if (isDemo) {
    let user = memStore.users.find(u => u[providerField] === providerId)
    if (!user) {
      const id = crypto.randomUUID()
      user = {
        id,
        username,
        password_hash: '',
        color: color || '#F08040',
        [providerField]: providerId,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
      }
      memStore.users.push(user)
    }
    return { data: user, error: null }
  }

  // Check if user exists by provider ID
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq(providerField, providerId)
    .single()

  if (existing) return { data: existing, error: null }

  // Create new user
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash: '',
      color: color || '#F08040',
      [providerField]: providerId,
      avatar_url: avatarUrl,
    })
    .select()
    .single()

  return { data, error }
}

export async function createRoom({ id, name, language, ownerId }) {
  if (isDemo) {
    const room = { id, name, language: language || 'javascript', owner_id: ownerId, created_at: new Date().toISOString() }
    memStore.rooms.push(room)
    return { data: room, error: null }
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({ id, name, language: language || 'javascript', owner_id: ownerId })
    .select()
    .single()

  return { data, error }
}

export async function findRoomById(id) {
  if (isDemo) {
    const room = memStore.rooms.find(r => r.id === id)
    return { data: room || null, error: null }
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error: error?.code === 'PGRST116' ? null : error }
}

export async function getUserRooms(userId) {
  if (isDemo) {
    const rooms = memStore.rooms.filter(r => r.owner_id === userId)
    return { data: rooms, error: null }
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function createSnapshot({ roomId, content, savedBy }) {
  if (isDemo) {
    const id = crypto.randomUUID()
    const snapshot = { id, room_id: roomId, content, saved_at: new Date().toISOString(), saved_by: savedBy }
    memStore.snapshots.push(snapshot)
    return { data: snapshot, error: null }
  }

  const { data, error } = await supabase
    .from('snapshots')
    .insert({ room_id: roomId, content, saved_by: savedBy })
    .select()
    .single()

  return { data, error }
}

export async function getRoomSnapshots(roomId) {
  if (isDemo) {
    const snapshots = memStore.snapshots.filter(s => s.room_id === roomId)
    return { data: snapshots, error: null }
  }

  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .eq('room_id', roomId)
    .order('saved_at', { ascending: false })

  return { data, error }
}

// Export for direct Supabase access if needed
export { supabase, isDemo }

// ============================================
// SQL Migration — run this in Supabase SQL Editor
// ============================================
export const MIGRATION_SQL = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  color TEXT DEFAULT '#F08040',
  google_id TEXT,
  github_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  language TEXT DEFAULT 'javascript',
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES rooms(id),
  content TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  saved_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_room ON snapshots(room_id);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github ON users(github_id);
`
