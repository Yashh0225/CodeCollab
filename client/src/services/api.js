// ============================================
// CodeCollab — API Service
// ============================================
// Centralized API calls to the backend server

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ============================================
// Token management
// ============================================
export function getToken() {
  return localStorage.getItem('codecollab_token')
}

export function setToken(token) {
  localStorage.setItem('codecollab_token', token)
}

export function removeToken() {
  localStorage.removeItem('codecollab_token')
}

export function getUser() {
  const userStr = localStorage.getItem('codecollab_user')
  return userStr ? JSON.parse(userStr) : null
}

export function setUser(user) {
  localStorage.setItem('codecollab_user', JSON.stringify(user))
}

export function removeUser() {
  localStorage.removeItem('codecollab_user')
}

export function logout() {
  removeToken()
  removeUser()
}

export function isAuthenticated() {
  return !!getToken()
}

// ============================================
// HTTP helpers
// ============================================
async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

// ============================================
// Auth API
// ============================================
export async function register(username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  setUser(data.user)
  return data
}

export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  setUser(data.user)
  return data
}

export async function getMe() {
  return request('/auth/me')
}

export function getGoogleOAuthUrl() {
  return `${API_URL}/auth/google`
}

export function getGitHubOAuthUrl() {
  return `${API_URL}/auth/github`
}

// ============================================
// Room API
// ============================================
export async function createRoom(name, language) {
  return request('/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, language }),
  })
}

export async function getRoom(id) {
  return request(`/rooms/${id}`)
}

export async function listRooms() {
  return request('/rooms')
}

// ============================================
// Snapshot API
// ============================================
export async function saveSnapshot(roomId, content) {
  return request(`/rooms/${roomId}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function listSnapshots(roomId) {
  return request(`/rooms/${roomId}/snapshots`)
}

export const updateRoomLanguage = async (roomId, language) => {
  return request(`/rooms/${roomId}/language`, {
    method: 'PUT',
    body: JSON.stringify({ language }),
  })
}

// ============================================
// Roles & Invites API
// ============================================
export async function generateInvite(roomId, role) {
  return request(`/rooms/${roomId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ role })
  })
}

export async function joinRoom(roomId, token) {
  return request(`/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify({ token })
  })
}

export async function updateMemberRole(roomId, userId, role) {
  return request(`/rooms/${roomId}/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  })
}

export async function fetchRoomRole(roomId) {
  return request(`/rooms/${roomId}/role`)
}

// ============================================
// Code Execution API
// ============================================
const EXECUTE_SUPPORTED = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp']

export function isExecutionSupported(language) {
  return EXECUTE_SUPPORTED.includes(language)
}

export async function executeCode(code, language, stdin) {
  const token = getToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s client-side timeout

  try {
    const response = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code, language, stdin }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await response.json()

    if (response.status === 429) {
      return { error: data.error || 'Rate limit exceeded. Try again in 60 seconds.' }
    }

    if (!response.ok) {
      return { error: data.error || 'Execution failed' }
    }

    return data
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      return { error: 'Execution timed out (15s). Your code may contain an infinite loop.' }
    }
    return { error: 'Execution service unavailable. Please try again later.' }
  }
}
