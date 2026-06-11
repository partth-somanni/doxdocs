import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

const API = 'http://localhost:3000'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function Editor() {
  const [docId, setDocId] = useState(null)
  const [title, setTitle] = useState('Untitled')
  const [saveStatus, setSaveStatus] = useState('All changes saved')

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '<p>Start typing your document here...</p>',
  })

  // Auto save function
  const saveDoc = useCallback(
    debounce(async (id, content, docTitle) => {
      setSaveStatus('Saving...')
      await fetch(`${API}/docs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: docTitle })
      })
      setSaveStatus('All changes saved')
    }, 1000),
    []
  )

  // Load or create document on startup
  useEffect(() => {
    if (!editor) return
    const init = async () => {
      let id = localStorage.getItem('docId')

      if (!id) {
        const res = await fetch(`${API}/docs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled' })
        })
        const data = await res.json()
        id = data.id
        localStorage.setItem('docId', id)
      }

      setDocId(id)

      const res = await fetch(`${API}/docs/${id}`)
      const data = await res.json()
      setTitle(data.title)
      if (data.content) editor.commands.setContent(data.content)
    }

    init()
  }, [editor])

  // Trigger save on every edit
  useEffect(() => {
    if (!editor || !docId) return
    editor.on('update', () => {
      saveDoc(docId, editor.getHTML(), title)
    })
  }, [editor, docId, title, saveDoc])

  if (!editor) return null

  return (
    <div>
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          if (docId) saveDoc(docId, editor.getHTML(), e.target.value)
        }}
        className="text-2xl font-bold border-none outline-none mb-4 w-full"
        placeholder="Untitled"
      />

      {/* Toolbar */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded border text-sm font-bold ${editor.isActive('bold') ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          B
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded border text-sm italic ${editor.isActive('italic') ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          I
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1 rounded border text-sm underline ${editor.isActive('underline') ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          U
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded border text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          H1
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded border text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          H2
        </button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded border text-sm ${editor.isActive('bulletList') ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          • List
        </button>
        <span className="ml-auto text-xs text-gray-400">{saveStatus}</span>
      </div>

      {/* Editor */}
      <EditorContent editor={editor}
        className="prose max-w-none focus:outline-none min-h-[400px]" />
    </div>
  )
}

export default Editor