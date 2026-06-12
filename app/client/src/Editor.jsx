import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import TiptapImage from '@tiptap/extension-image'
import { Mark, Node, mergeAttributes } from '@tiptap/core'
import MediaModal from './MediaModal'
import { io } from 'socket.io-client'

const API = 'http://localhost:3000'

// ── FontSize mark ────────────────────────────────────────────────────────

const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
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
    }]
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

// ── ResizableImage extension ─────────────────────────────────────────────
// Wraps the built-in Image node with width/style support

const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: el => el.style.width || el.getAttribute('width') || '100%',
        renderHTML: attrs => ({ style: `width: ${attrs.width}; max-width: 100%; display: block; border-radius: 6px; margin: 8px 0;` }),
      },
      alt: { default: '' },
    }
  },
})

// ── Video embed node ─────────────────────────────────────────────────────

const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

renderHTML({ node }) {
  return [
    'div',
    {
      'data-video-embed': '',
      src: node.attrs.src,
    },
  ]
},

addNodeView() {
  return ({ node }) => {
    const wrapper = document.createElement('div')
    const src = node.attrs.src || ''
    const isSpotify = src.includes('open.spotify.com/embed')

    wrapper.style.cssText = isSpotify
      ? 'margin:12px 0;border-radius:8px;overflow:hidden;'
      : 'position:relative;padding-top:56.25%;margin:12px 0;border-radius:8px;overflow:hidden;background:#000'

    const isEmbed =
        src.includes('youtube.com/embed') ||
        src.includes('player.vimeo.com') ||
        src.includes('open.spotify.com/embed')

    if (isEmbed) {
      const iframe = document.createElement('iframe')
      iframe.src = src
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      iframe.allowFullscreen = true
      iframe.style.cssText = isSpotify
        ? 'width:100%;height:152px;border:none;'
        : 'position:absolute;inset:0;width:100%;height:100%;border:none'
      wrapper.appendChild(iframe)
    } else {
      const video = document.createElement('video')
      video.src = src
      video.controls = true
      video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain'
      wrapper.appendChild(video)
    }

    return { dom: wrapper }
  }
},
})

// ── Constants ────────────────────────────────────────────────────────────

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
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function Sep() {
  return <div className="mx-1 self-center" style={{ width: 1, height: 24, background: 'var(--border)' }} />
}

// ── Editor component ─────────────────────────────────────────────────────

export default function Editor({ docId, onTitleChange, username }) {
  const [title, setTitle] = useState('Untitled')
  const [saveStatus, setSaveStatus] = useState('All changes saved')
  const [showTextColors, setShowTextColors] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [mediaModal, setMediaModal] = useState(null) // null | 'image' | 'video'
  const [collaborators, setCollaborators] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const socketRef = useRef(null)
  const isRemoteUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      ResizableImage.configure({ inline: false, allowBase64: true }),
      VideoEmbed,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start typing your document here...' }),
    ],
    content: '',
  })

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

  useEffect(() => {
    if (!editor || !docId) return
    fetch(`${API}/docs/${docId}`)
      .then(r => r.json())
      .then(data => {
        setTitle(data.title || 'Untitled')
        if (data.content) editor.commands.setContent(data.content)
      })
  }, [editor, docId])

  useEffect(() => {
  if (!editor || !docId) return
  const handler = () => {
    if (isRemoteUpdate.current) return
    const content = editor.getHTML()
    saveDoc(docId, content, title)
    socketRef.current?.emit('doc-change', { docId, content })
  }
  editor.on('update', handler)
  return () => editor.off('update', handler)
}, [editor, docId, title, saveDoc])

useEffect(() => {
  if (!editor || !socketRef.current) return
  const handler = () => {
    const { from } = editor.state.selection
    const color = collaborators.find(u => u.name === username)?.color || '#60a5fa'
    socketRef.current?.emit('cursor-move', { docId, position: from, username, color })
  }
  editor.on('selectionUpdate', handler)
  return () => editor.off('selectionUpdate', handler)
}, [editor, docId, username])

useEffect(() => {
  if (!docId || !username) return

  const socket = io('http://localhost:3000')
  socketRef.current = socket

  socket.emit('join-doc', { docId, username })

  socket.on('doc-update', ({ content }) => {
    if (!editor) return
    isRemoteUpdate.current = true
    const { from, to } = editor.state.selection
    editor.commands.setContent(content, false)
    editor.commands.setTextSelection({ from, to })
    isRemoteUpdate.current = false
  })

  socket.on('presence', (users) => {
  setCollaborators(users.filter(u => u.name !== username))
  // Remove cursors for users who left
  setRemoteCursors(prev => {
    const active = new Set(users.map(u => u.name))
    return Object.fromEntries(
      Object.entries(prev).filter(([, c]) => active.has(c.username))
    )
  })
})

  socket.on('cursor-update', ({ socketId, position, username: uname, color }) => {
  setRemoteCursors(prev => ({ [socketId]: { position, username: uname, color } }))
})

  return () => socket.disconnect()
}, [docId, username, editor])

  useEffect(() => {
    const close = () => { setShowTextColors(false); setShowHighlights(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (!editor) return null

  // ── Insert handlers ────────────────────────────────────────────────────

  function insertImage({ src, alt, width }) {
    editor.chain().focus().setImage({
      src,
      alt: alt || '',
      width: `${width}%`,
    }).run()
  }

  function insertVideo({ src }) {
    console.log("Inserting:", src)

    editor.chain().focus().insertContent({
      type: 'videoEmbed',
      attrs: { src },
    }).run()

    console.log(editor.getJSON())
  }

  // ── Style helpers ──────────────────────────────────────────────────────

  const btnStyle = (isActive) => ({
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid var(--border-btn)',
    fontSize: 13,
    cursor: 'pointer',
    background: isActive ? 'var(--bg-btn-active)' : 'var(--bg-btn)',
    color: isActive ? 'var(--text-btn-active)' : 'var(--text-secondary)',
  })

  const selectStyle = {
    fontSize: 13, borderRadius: 6,
    border: '1px solid var(--border-btn)',
    background: 'var(--bg-btn)',
    color: 'var(--text-primary)',
    padding: '2px 4px', height: 28, cursor: 'pointer',
  }

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
        style={{
          color: 'var(--text-primary)', background: 'transparent',
          border: 'none', outline: 'none',
          fontSize: 24, fontWeight: 700, marginBottom: 16, width: '100%',
        }}
        placeholder="Untitled"
      />

      {collaborators.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Also editing:</span>
          {collaborators.map((user, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: user.color, color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-1 mb-4 items-center p-2 rounded-lg"
        style={{ background: 'var(--bg-toolbar)', border: '1px solid var(--border)' }}
      >
        {/* Inline formatting */}
        <button style={{ ...btnStyle(editor.isActive('bold')), fontWeight: 'bold' }}
          onClick={() => editor.chain().focus().toggleBold().run()}>B</button>

        <button style={{ ...btnStyle(editor.isActive('italic')), fontStyle: 'italic' }}
          onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>

        <button style={{ ...btnStyle(editor.isActive('underline')), textDecoration: 'underline' }}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>

        <Sep />

        {/* Headings + list */}
        <button style={btnStyle(editor.isActive('heading', { level: 1 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>

        <button style={btnStyle(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>

        <button style={btnStyle(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>

        <Sep />

        {/* Alignment */}
        <button style={btnStyle(editor.isActive({ textAlign: 'left' }))}
          title="Align left"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>≡←</button>

        <button style={btnStyle(editor.isActive({ textAlign: 'center' }))}
          title="Align center"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>≡</button>

        <button style={btnStyle(editor.isActive({ textAlign: 'right' }))}
          title="Align right"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>→≡</button>

        <button style={btnStyle(editor.isActive({ textAlign: 'justify' }))}
          title="Justify"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}>☰</button>

        <Sep />

        {/* Font family */}
        <select title="Font family" style={selectStyle} defaultValue=""
          onChange={(e) => {
            const val = e.target.value
            if (val === '') editor.chain().focus().unsetFontFamily().run()
            else editor.chain().focus().setFontFamily(val).run()
          }}
        >
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Font size */}
        <select title="Font size" style={{ ...selectStyle, width: 64 }} defaultValue=""
          onChange={(e) => {
            const val = e.target.value
            if (val === '') editor.chain().focus().unsetFontSize().run()
            else editor.chain().focus().setFontSize(val).run()
          }}
        >
          <option value="">Size</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <Sep />

        {/* Text color */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button title="Text color" style={btnStyle(false)}
            onClick={() => { setShowHighlights(false); setShowTextColors(v => !v) }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontWeight: 'bold', fontSize: 13, lineHeight: 1 }}>A</span>
              <span style={{ height: 3, width: 18, borderRadius: 2, backgroundColor: editor.getAttributes('textStyle').color || 'var(--text-primary)' }} />
            </div>
          </button>
          {showTextColors && (
            <div className="absolute top-9 left-0 z-50 p-2 flex flex-wrap gap-1 rounded-lg"
              style={{ width: 144, background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {TEXT_COLORS.map(color => (
                <button key={color} title={color}
                  onClick={() => { editor.chain().focus().setColor(color).run(); setShowTextColors(false) }}
                  style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: color, border: '1px solid var(--border-btn)', cursor: 'pointer' }} />
              ))}
              <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowTextColors(false) }}
                style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button title="Highlight" style={btnStyle(false)}
            onClick={() => { setShowTextColors(false); setShowHighlights(v => !v) }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>🖊</span>
              <span style={{ height: 3, width: 18, borderRadius: 2, backgroundColor: editor.getAttributes('highlight').color || '#fef08a', border: '1px solid var(--border-btn)' }} />
            </div>
          </button>
          {showHighlights && (
            <div className="absolute top-9 left-0 z-50 p-2 flex flex-wrap gap-1 rounded-lg"
              style={{ width: 144, background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {HIGHLIGHT_COLORS.map(color => (
                <button key={color} title={color}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setShowHighlights(false) }}
                  style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: color, border: '1px solid var(--border-btn)', cursor: 'pointer' }} />
              ))}
              <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlights(false) }}
                style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Remove
              </button>
            </div>
          )}
        </div>

        <Sep />

        {/* ── Image button ── */}
        <button
          title="Insert image"
          style={btnStyle(false)}
          onClick={() => setMediaModal('image')}
        >
          🖼
        </button>

        {/* ── Video button ── */}
        <button
          title="Embed video"
          style={btnStyle(false)}
          onClick={() => setMediaModal('video')}
        >
          ▶
        </button>

        {/* Save status */}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {saveStatus}
        </span>
      </div>

      {/* Editor content */}
      <div style={{ position: 'relative' }}>
  {Object.entries(remoteCursors).map(([id, cursor]) => {
    try {
      const pos = editor.view.coordsAtPos(cursor.position)
      const editorRect = editor.view.dom.getBoundingClientRect()
      return (
        <div key={id} style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          pointerEvents: 'none',
          zIndex: 50,
        }}>
          <div style={{ width: 2, height: pos.bottom - pos.top, background: cursor.color }} />
          <div style={{
            position: 'absolute', top: -20, left: 0,
            background: cursor.color, color: '#fff',
            fontSize: 11, fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '3px 3px 3px 0',
            whiteSpace: 'nowrap',
          }}>
            {cursor.username}
          </div>
        </div>
      )
    } catch { return null }
  })}
  <EditorContent
    editor={editor}
    className="prose max-w-none focus:outline-none min-h-[400px]"
    style={{ color: 'var(--text-primary)' }}
  />
</div>

      {/* Media modal */}
      {mediaModal && (
        <MediaModal
          type={mediaModal}
          onInsert={mediaModal === 'image' ? insertImage : insertVideo}
          onClose={() => setMediaModal(null)}
        />
      )}
    </div>
  )
}

