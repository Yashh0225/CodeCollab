const WebSocket = require('ws')
const http = require('http')
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Sync Server is running')
})

const wss = new WebSocket.Server({ noServer: true })

wss.on('connection', setupWSConnection)

server.on('upgrade', (request, socket, head) => {
  // You may check auth/cookies here if needed
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request)
  })
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Sync server running on port ${PORT}`)
})
