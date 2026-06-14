const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

const db = new Database('docs.db')

app.use(cors({ origin: '*' }))
app.use(express.json())

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

app.post('/docs', (req, res) => {
  const id = Math.random().toString(36).slice(2)
  const { title } = req.body
  db.prepare('INSERT INTO documents (id, title) VALUES (?, ?)').run(id, title)
  res.json({ id, title, content: '' })
})

app.get('/docs/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  res.json(doc)
})

app.patch('/docs/:id', (req, res) => {
  const { content, title } = req.body
  db.prepare(`
    UPDATE documents SET content = ?, title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(content, title, req.params.id)
  res.json({ success: true })
})

app.get('/docs', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all()
  res.json(docs)
})

app.delete('/docs/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ── Socket.io — real-time collab ──────────────────────────────────────────

const docUsers = {} // docId -> { socketId -> { name, color } }

const USER_COLORS = ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc','#f472b6']

io.on('connection', (socket) => {

  // User joins a document room
  socket.on('join-doc', ({ docId, username }) => {
    socket.join(docId)
    socket.docId = docId
    socket.username = username

    if (!docUsers[docId]) docUsers[docId] = {}
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
    docUsers[docId][socket.id] = { name: username, color }

    // Tell everyone in the room who is online
    io.to(docId).emit('presence', Object.values(docUsers[docId]))
  })

  // Broadcast content changes to everyone else in the room
  socket.on('doc-change', ({ docId, content }) => {
    socket.to(docId).emit('doc-update', { content })
  })

  // Broadcast cursor position
  socket.on('cursor-move', ({ docId, position, username, color }) => {
    socket.to(docId).emit('cursor-update', { socketId: socket.id, position, username, color })
  })

  // User leaves
  socket.on('disconnect', () => {
    const { docId } = socket
    if (docId && docUsers[docId]) {
      delete docUsers[docId][socket.id]
      io.to(docId).emit('presence', Object.values(docUsers[docId]))
    }
  })
})

server.listen(3000, () => console.log('Server running on port 3000'))