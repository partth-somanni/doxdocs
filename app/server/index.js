const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')

const app = express()
const db = new Database('docs.db')

app.use(cors())
app.use(express.json())

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// CREATE a document
app.post('/docs', (req, res) => {
  const id = Math.random().toString(36).slice(2)
  const { title } = req.body
  db.prepare('INSERT INTO documents (id, title) VALUES (?, ?)').run(id, title)
  res.json({ id, title, content: '' })
})

// GET a document
app.get('/docs/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  res.json(doc)
})

// UPDATE a document
app.patch('/docs/:id', (req, res) => {
  const { content, title } = req.body
  db.prepare(`
    UPDATE documents SET content = ?, title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(content, title, req.params.id)
  res.json({ success: true })
})

// GET all documents
app.get('/docs', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all()
  res.json(docs)
})

// DELETE a document
app.delete('/docs/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

app.listen(3000, () => console.log('Server running on port 3000'))