import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

function Editor() {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '<p>Start typing your document here...</p>',
  })

  if (!editor) return null

  return (
    <div>
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