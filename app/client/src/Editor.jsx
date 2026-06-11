import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import { Mark, mergeAttributes } from '@tiptap/core'

const API = 'http://localhost:3000'

// Custom FontSize extension (not built into Tiptap)
const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: el => el.style.fontSize?.replace('px', '') || null,
            renderHTML: attrs => {
              if (!attrs.fontSize) return {}
              return { style: `font-size: ${attrs.fontSize}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

const TEXT_COLORS = [
  '#000000', '#374151', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
]

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#f5d0fe',
  '#fed7aa', '#fecaca', '#ffffff',
]

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Small reusable toolbar separator
function Sep() {
  return <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
}

function Editor({ docId, onTitleChange }) {
  const [title, setTitle] = useState('Untitled')
  const [saveStatus, setSaveStatus] = useState('All changes saved')
  const [showTextColors, setShowTextColors] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Start typing your document here...',
      }),
    ],
    content: '',
  })

  // Auto save
  const saveDoc = useCallback(
    debounce(async (id, content, docTitle) => {
      setSaveStatus('Saving...')
      await fetch(`${API}/docs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: docTitle }),
      })
      setSaveStatus('All changes saved')
    }, 1000),
    []
  )

  // Load document
  useEffect(() => {
    if (!editor || !docId) return
    fetch(`${API}/docs/${docId}`)
      .then(r => r.json())
      .then(data => {
        setTitle(data.title || 'Untitled')
        if (data.content) editor.commands.setContent(data.content)
      })
  }, [editor, docId])

  // Trigger save on edit
  useEffect(() => {
    if (!editor || !docId) return
    editor.on('update', () => {
      saveDoc(docId, editor.getHTML(), title)
    })
  }, [editor, docId, title, saveDoc])

  // Close color pickers on outside click
  useEffect(() => {
    const close = () => {
      setShowTextColors(false)
      setShowHighlights(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (!editor) return null

  const btnBase = 'px-2 py-1 rounded border text-sm'
  const active = 'bg-gray-800 text-white'
  const inactive = 'bg-white'
  const cls = (isActive) => `${btnBase} ${isActive ? active : inactive}`

  return (
    <div>
      {/* Title */}
      <input
        type="text"
        value={title}
        onFocus={() => { if (title === 'Untitled') setTitle('') }}
        onBlur={() => { if (title.trim() === '') setTitle('Untitled') }}
        onChange={(e) => {
          setTitle(e.target.value)
          onTitleChange(docId, e.target.value)
          if (docId) saveDoc(docId, editor.getHTML(), e.target.value)
        }}
        className="text-2xl font-bold border-none outline-none mb-4 w-full"
        placeholder="Untitled"
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-1 mb-4 items-center p-2 bg-gray-50 border border-gray-200 rounded-lg">

        {/* Row 1 – Inline formatting */}
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${cls(editor.isActive('bold'))} font-bold`}>B</button>

        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${cls(editor.isActive('italic'))} italic`}>I</button>

        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${cls(editor.isActive('underline'))} underline`}>U</button>

        <Sep />

        {/* Headings */}
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cls(editor.isActive('heading', { level: 1 }))}>H1</button>

        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cls(editor.isActive('heading', { level: 2 }))}>H2</button>

        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cls(editor.isActive('bulletList'))}>• List</button>

        <Sep />

        {/* ── Text alignment ── */}
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
          className={cls(editor.isActive({ textAlign: 'left' }))}>
          ≡←
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
          className={cls(editor.isActive({ textAlign: 'center' }))}>
          ≡
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
          className={cls(editor.isActive({ textAlign: 'right' }))}>
          →≡
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
          className={cls(editor.isActive({ textAlign: 'justify' }))}>
          ☰
        </button>

        <Sep />

        {/* ── Font family ── */}
        <select
          title="Font family"
          onChange={(e) => {
            const val = e.target.value
            if (val === '') editor.chain().focus().unsetFontFamily().run()
            else editor.chain().focus().setFontFamily(val).run()
          }}
          className="text-sm border border-gray-300 rounded px-1 py-1 bg-white h-7"
          defaultValue=""
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* ── Font size ── */}
        <select
          title="Font size"
          onChange={(e) => {
            const val = e.target.value
            if (val === '') editor.chain().focus().unsetFontSize().run()
            else editor.chain().focus().setFontSize(val).run()
          }}
          className="text-sm border border-gray-300 rounded px-1 py-1 bg-white h-7 w-16"
          defaultValue=""
        >
          <option value="">Size</option>
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <Sep />

        {/* ── Text color ── */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            title="Text color"
            onClick={() => {
              setShowHighlights(false)
              setShowTextColors(v => !v)
            }}
            className={`${btnBase} ${inactive} flex flex-col items-center gap-0.5`}
          >
            <span className="text-sm font-bold leading-none">A</span>
            <span
              className="h-1 w-5 rounded-sm"
              style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }}
            />
          </button>
          {showTextColors && (
            <div className="absolute top-9 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-36">
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  title={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run()
                    setShowTextColors(false)
                  }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run()
                  setShowTextColors(false)
                }}
                className="text-xs text-gray-500 underline w-full mt-1">
                Reset
              </button>
            </div>
          )}
        </div>

        {/* ── Highlight color ── */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            title="Highlight"
            onClick={() => {
              setShowTextColors(false)
              setShowHighlights(v => !v)
            }}
            className={`${btnBase} ${inactive} flex flex-col items-center gap-0.5`}
          >
            <span className="text-sm leading-none">🖊</span>
            <span
              className="h-1 w-5 rounded-sm border border-gray-300"
              style={{
                backgroundColor: editor.getAttributes('highlight').color || '#fef08a',
              }}
            />
          </button>
          {showHighlights && (
            <div className="absolute top-9 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-36">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color}
                  title={color}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run()
                    setShowHighlights(false)
                  }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run()
                  setShowHighlights(false)
                }}
                className="text-xs text-gray-500 underline w-full mt-1">
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Save status pushed to far right */}
        <span className="ml-auto text-xs text-gray-400">{saveStatus}</span>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose max-w-none focus:outline-none min-h-[400px]"
      />
    </div>
  )
}

export default Editor