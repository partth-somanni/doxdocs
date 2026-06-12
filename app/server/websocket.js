const http = require('http')
const WebSocket = require('ws')
const { setupWSConnection } = require('y-websocket/bin/utils')

const server = http.createServer()
const wss = new WebSocket.Server({ server })

// Force fresh doc on every server restart — no persistence
process.env.YPERSISTENCE = ''

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req, { gc: true })
})

server.listen(1234, () => {
  console.log('Y.js WebSocket server running on port 1234')
})