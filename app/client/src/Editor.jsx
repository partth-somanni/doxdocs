import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import debounce from 'lodash.debounce'

function Editor() {
  const [docId, setDocId] = useState(null)
  const [title, setTitle] = useState('Untitled')

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '<p>Start typing your document here...</p>',
    onUpdate: ({ editor }) => {
      if (docId) {
        saveDoc(docId, editor.getHTML(), title)
      }
    }
  })

  const saveDoc = debounce(async (id, content, docTitle) => {
    await fetch(`http://localhost:3000/docs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title: docTitle })
    })
  }, 1000)

  useEffect(() => {
    const init = async () => {
      let id = localStorage.getItem('docId')

      if (!id) {
        const res = await fetch('http://localhost:3000/docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled', ownerId: 'user1' })
        })
        const data = await res.json()
        id = data.id
        localStorage.setItem('docId', id)
      }

      setDocId(id)

      const res = await fetch(`http://localhost:3000/docs/${id}`)
      const data = await res.json()
      setTitle(data.title)

      if (editor && data.content) {
        editor.commands.setContent(data.content)
      }
    }

    if (editor) init()
  }, [editor])

  if (!editor) return null

  return (
    <div>
      {/* Title field */}
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
      <div className="flex gap-2 mb-4 flex-wrap">
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
      </div>

      {/* Editor Area */}
      <EditorContent editor={editor}
        className="prose max-w-none focus:outline-none min-h-[400px]" />
    </div>
  )
}

export default Editor