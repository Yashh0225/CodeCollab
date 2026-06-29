require('dotenv').config()
const WebSocket = require('ws')
const http = require('http')
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils')
const { saveDoc, loadDoc } = require('./persistence')

// Hook up Yjs persistence to Redis
setPersistence({
  bindState: async (docName, ydoc) => {
    // Called when a new room is created/loaded
    await loadDoc(docName, ydoc)
  },
  writeState: async (docName, ydoc) => {
    // Called whenever a document changes
    await saveDoc(docName, ydoc)
  }
})

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Sync Server is running')
})

const wss = new WebSocket.Server({ noServer: true })

wss.on('connection', (ws, req) => {
  // PHASE 4: Block Writes from Viewers
  if (ws.role === 'viewer') {
    const originalOn = ws.on.bind(ws)
    ws.on = (event, handler) => {
      if (event === 'message') {
        return originalOn('message', (message) => {
          // Yjs Sync Protocol: message[0] === 0 (Sync), message[1] === 2 (Update)
          if (message.length > 1 && message[0] === 0 && message[1] === 2) {
            // Send violation event
            ws.send(JSON.stringify({ type: 'violation', message: 'Viewer write blocked' }))
            return // silently drop the write
          }
          handler(message)
        })
      }
      return originalOn(event, handler)
    }
  }

  setupWSConnection(ws, req)
})

server.on('upgrade', async (request, socket, head) => {
  try {
    // PHASE 3: Authenticate WebSocket Connections
    const url = new URL(request.url, `http://${request.headers.host}`)
    const token = url.searchParams.get('token')
    const roomId = url.pathname.slice(1) // e.g. /my-room -> my-room

    let role = 'viewer'
    if (token) {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        if (process.env.NODE_ENV === 'production') {
          console.error('FATAL: JWT_SECRET is required in production')
          socket.destroy()
          return
        }
      }
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, jwtSecret || 'codecollab-dev-secret-UNSAFE')
      
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
        const { data } = await supabase
          .from('room_members')
          .select('role')
          .eq('room_id', roomId)
          .eq('user_id', decoded.id)
          .single()
          
        if (data) role = data.role
      } else if (process.env.NODE_ENV !== 'production') {
        role = 'owner' // Local dev only — fail closed in production
      }
    } else if (process.env.NODE_ENV !== 'production') {
      role = 'owner' // Fallback for local testing without login
    }

    wss.handleUpgrade(request, socket, head, ws => {
      ws.role = role
      wss.emit('connection', ws, request)
    })
  } catch (err) {
    console.error('WebSocket upgrade auth failed:', err.message)
    socket.destroy()
  }
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Sync server running on port ${PORT}`)
})
