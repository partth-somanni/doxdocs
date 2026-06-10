const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// CREATE a document
app.post('/docs', async (req, res) => {
  try {
    const { title, ownerId } = req.body
    const doc = await prisma.document.create({
      data: { title, ownerId }
    })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET a document by id
app.get('/docs/:id', async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id }
    })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// UPDATE a document's content
app.patch('/docs/:id', async (req, res) => {
  try {
    const { content, title } = req.body
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { content, title }
    })
    res.json(doc)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))