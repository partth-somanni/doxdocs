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
import ExportMenu from './ExportMenu'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

const ResizableImage = TiptapImage.extend({
  draggable: true,
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
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { draggable: 'true' })]
  },
})

// ── Video embed node (resizable) ───────────────────────────────────────────

const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100' },
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
        width: node.attrs.width,
        style: `width: ${node.attrs.width}%`,
      },
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const src = node.attrs.src || ''
      const isSpotify = src.includes('open.spotify.com/embed')
      const isEmbed =
        src.includes('youtube.com/embed') ||
        src.includes('player.vimeo.com') ||
        src.includes('open.spotify.com/embed')

      const outer = document.createElement('div')
      outer.style.cssText = `position:relative;width:${node.attrs.width}%;margin:12px 0;`

      const inner = document.createElement('div')
      inner.style.cssText = isSpotify
        ? 'border-radius:8px;overflow:hidden;'
        : 'position:relative;padding-top:56.25%;border-radius:8px;overflow:hidden;background:#000'

      if (isEmbed) {
        const iframe = document.createElement('iframe')
        iframe.src = src
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        iframe.allowFullscreen = true
        iframe.style.cssText = isSpotify
          ? 'width:100%;height:152px;border:none;display:block;'
          : 'position:absolute;inset:0;width:100%;height:100%;border:none'
        inner.appendChild(iframe)
      } else {
        const video = document.createElement('video')
        video.src = src
        video.controls = true
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain'
        inner.appendChild(video)
      }

      outer.appendChild(inner)

      const handle = document.createElement('div')
      handle.style.cssText = `
        position:absolute; right:-4px; bottom:-4px;
        width:14px; height:14px;
        background:#2563eb; border:2px solid #fff;
        border-radius:50%; cursor:nwse-resize;
        opacity:0; transition:opacity 0.15s;
      `
      outer.appendChild(handle)

      outer.addEventListener('mouseenter', () => { handle.style.opacity = '1' })
      outer.addEventListener('mouseleave', () => { handle.style.opacity = '0' })

      let startX, startWidth, parentWidth

      const onMouseMove = (e) => {
        const dx = e.clientX - startX
        let newWidthPx = startWidth + dx
        let newWidthPercent = Math.round((newWidthPx / parentWidth) * 100)
        newWidthPercent = Math.min(100, Math.max(10, newWidthPercent))
        outer.style.width = `${newWidthPercent}%`
        outer.dataset.pendingWidth = newWidthPercent
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.removeEventListener('mouseleave', onMouseUp)

        const newWidth = outer.dataset.pendingWidth
        if (newWidth && typeof getPos === 'function') {
          const pos = getPos()
          editor.commands.command(({ tr }) => {
            tr.setNodeAttribute(pos, 'width', newWidth)
            return true
          })
        }
      }

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        startX = e.clientX
        startWidth = outer.getBoundingClientRect().width
        parentWidth = outer.parentElement.getBoundingClientRect().width

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mouseleave', onMouseUp)
      })

      return {
        dom: outer,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'videoEmbed') return false
          outer.style.width = `${updatedNode.attrs.width}%`
          return true
        },
      }
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

// ── Improved colour palettes ─────────────────────────────────────────────
// Organised in visual rows: neutrals → warm → cool → vivid
// Each row reads left-to-right light→dark so users can navigate by feel

const TEXT_COLORS = [
  // Row 1 – Neutrals
  { hex: '#ffffff', label: 'White' },
  { hex: '#f3f4f6', label: 'Gray 100' },
  { hex: '#9ca3af', label: 'Gray 400' },
  { hex: '#6b7280', label: 'Gray 500' },
  { hex: '#374151', label: 'Gray 700' },
  { hex: '#111827', label: 'Gray 900' },
  { hex: '#000000', label: 'Black' },
  // Row 2 – Reds / Oranges
  { hex: '#fca5a5', label: 'Red 300' },
  { hex: '#ef4444', label: 'Red 500' },
  { hex: '#b91c1c', label: 'Red 700' },
  { hex: '#fb923c', label: 'Orange 400' },
  { hex: '#f97316', label: 'Orange 500' },
  { hex: '#c2410c', label: 'Orange 700' },
  { hex: '#fbbf24', label: 'Amber 400' },
  // Row 3 – Greens / Teals
  { hex: '#86efac', label: 'Green 300' },
  { hex: '#22c55e', label: 'Green 500' },
  { hex: '#15803d', label: 'Green 700' },
  { hex: '#2dd4bf', label: 'Teal 400' },
  { hex: '#0d9488', label: 'Teal 600' },
  { hex: '#0f766e', label: 'Teal 700' },
  { hex: '#06b6d4', label: 'Cyan 500' },
  // Row 4 – Blues / Purples / Pinks
  { hex: '#93c5fd', label: 'Blue 300' },
  { hex: '#3b82f6', label: 'Blue 500' },
  { hex: '#1d4ed8', label: 'Blue 700' },
  { hex: '#a78bfa', label: 'Violet 400' },
  { hex: '#8b5cf6', label: 'Violet 500' },
  { hex: '#6d28d9', label: 'Violet 700' },
  { hex: '#ec4899', label: 'Pink 500' },
]

const HIGHLIGHT_COLORS = [
  // Row 1 – Classic highlights (pastel)
  { hex: '#fef08a', label: 'Yellow' },
  { hex: '#bbf7d0', label: 'Green' },
  { hex: '#bfdbfe', label: 'Blue' },
  { hex: '#f5d0fe', label: 'Purple' },
  { hex: '#fed7aa', label: 'Orange' },
  { hex: '#fecaca', label: 'Red' },
  { hex: '#99f6e4', label: 'Teal' },
  // Row 2 – Vivid highlights
  { hex: '#fde047', label: 'Yellow vivid' },
  { hex: '#4ade80', label: 'Green vivid' },
  { hex: '#60a5fa', label: 'Blue vivid' },
  { hex: '#c084fc', label: 'Purple vivid' },
  { hex: '#fb923c', label: 'Orange vivid' },
  { hex: '#f87171', label: 'Red vivid' },
  { hex: '#ffffff', label: 'White / Clear' },
]

// ── Colour picker panel component ────────────────────────────────────────
// Fixes all UX issues:
//   • Larger swatches (28px) with visible hover ring
//   • Active swatch gets a checkmark overlay
//   • Hex input so users can type/paste any value
//   • Native <input type="color"> fires only on "change" (not every drag tick)
//     via a separate committed ref to avoid flooding editor transactions
//   • Panel stays open until user explicitly closes or clicks outside
//   • Reset button is a proper button with an × icon

function ColorPanel({ colors, activeColor, onSelect, onReset, resetLabel = 'Remove color', mode = 'text' }) {
  const [hexInput, setHexInput] = useState(activeColor || '')
  const [hexError, setHexError] = useState(false)
  // Track the value committed from the native color wheel so we only
  // call onSelect once per interaction, not on every pointer drag event.
  const nativePickerRef = useRef(null)

  // Keep hex input in sync when activeColor changes externally (e.g. new selection)
  useEffect(() => {
    setHexInput(activeColor || '')
    setHexError(false)
  }, [activeColor])

  const isValidHex = (v) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)

  const handleHexKeyDown = (e) => {
    if (e.key === 'Enter') commitHex()
  }

  const commitHex = () => {
    const val = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
    if (isValidHex(val)) {
      onSelect(val)
      setHexError(false)
    } else {
      setHexError(true)
    }
  }

  const COLS = 7
  const rows = []
  for (let i = 0; i < colors.length; i += COLS) {
    rows.push(colors.slice(i, i + COLS))
  }

  return (
    <div
      style={{
        width: 232,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        padding: '10px 10px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Swatch grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 4 }}>
            {row.map(({ hex, label }) => {
              const isActive = activeColor && activeColor.toLowerCase() === hex.toLowerCase()
              return (
                <button
                  key={hex}
                  title={`${label} (${hex})`}
                  onClick={() => onSelect(hex)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: hex,
                    border: isActive
                      ? '2px solid var(--text-primary)'
                      : '1.5px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    boxShadow: isActive ? '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--text-primary)' : 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.18)'
                    e.currentTarget.style.zIndex = '10'
                    e.currentTarget.style.boxShadow = isActive
                      ? '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--text-primary)'
                      : '0 2px 8px rgba(0,0,0,0.22)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.zIndex = ''
                    e.currentTarget.style.boxShadow = isActive
                      ? '0 0 0 2px var(--bg-surface), 0 0 0 4px var(--text-primary)'
                      : 'none'
                  }}
                >
                  {isActive && (
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, lineHeight: 1,
                      // Choose checkmark colour by perceived brightness
                      color: perceivedBrightness(hex) > 128 ? '#000' : '#fff',
                      pointerEvents: 'none',
                    }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 -2px' }} />

      {/* Hex input row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Colour preview swatch */}
        <div
          style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            backgroundColor: isValidHex(hexInput.startsWith('#') ? hexInput : `#${hexInput}`) ? (hexInput.startsWith('#') ? hexInput : `#${hexInput}`) : '#e5e7eb',
            border: '1.5px solid rgba(0,0,0,0.12)',
          }}
        />
        {/* Hex text input */}
        <input
          type="text"
          value={hexInput}
          placeholder="#000000"
          maxLength={7}
          onChange={e => {
            setHexInput(e.target.value)
            setHexError(false)
          }}
          onKeyDown={handleHexKeyDown}
          onBlur={commitHex}
          style={{
            flex: 1,
            height: 28,
            padding: '0 8px',
            borderRadius: 6,
            border: hexError ? '1.5px solid #ef4444' : '1.5px solid var(--border-btn)',
            background: 'var(--bg-btn)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        {/* Native colour wheel — only commits on `change` (mouse-up), not on drag */}
        <label
          title="Open colour wheel"
          style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1.5px solid var(--border-btn)',
            background: 'var(--bg-btn)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          🎨
          <input
            ref={nativePickerRef}
            type="color"
            defaultValue={activeColor || '#000000'}
            onChange={e => {
              // `change` fires on mouse-up from the native picker — one event per interaction
              const val = e.target.value
              setHexInput(val)
              onSelect(val)
            }}
            style={{
              position: 'absolute', opacity: 0, inset: 0,
              width: '100%', height: '100%', cursor: 'pointer',
            }}
          />
        </label>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0 -2px' }} />

      {/* Reset button */}
      <button
        onClick={onReset}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', height: 28,
          borderRadius: 6,
          border: '1.5px solid var(--border-btn)',
          background: 'var(--bg-btn)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
        {resetLabel}
      </button>
    </div>
  )
}

// Returns 0–255 perceived brightness for a hex colour
function perceivedBrightness(hex) {
  const c = hex.replace('#', '')
  const full = c.length === 3
    ? c.split('').map(x => x + x).join('')
    : c
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// ── Shared helpers ────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function Sep() {
  return <div className="mx-1 self-center" style={{ width: 1, height: 24, background: 'var(--border)' }} />
}

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// ── Editor ────────────────────────────────────────────────────────────────

export default function Editor({ docId, onTitleChange, username }) {
  const [title, setTitle] = useState('Untitled')
  const [saveStatus, setSaveStatus] = useState('All changes saved')
  const [showTextColors, setShowTextColors] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [mediaModal, setMediaModal] = useState(null)
  const [collaborators, setCollaborators] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const socketRef = useRef(null)
  const isRemoteUpdate = useRef(false)

  const [, forceUpdate] = useState(0)
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
    onTransaction: debounce(() => {
      forceUpdate(n => n + 1)
      }, 50),
    onUpdate: ({ editor }) => {
      const text = editor.getText()
      setWordCount(countWords(text))
      setCharCount(text.length)
    },
  })

  const hasLoadedRef = useRef(false)

const saveDoc = useCallback(
  debounce(async (id, content, docTitle) => {
    if (!hasLoadedRef.current) {
      console.warn('Blocked save - document not yet loaded from server')
      return
    }
    setSaveStatus('Saving...')
    try {
      const res = await fetch(`${API}/docs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: docTitle }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('All changes saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('Save failed - check connection')
    }
  }, 1000),
  []
)

  useEffect(() => {
  if (!editor || !docId) return
  let cancelled = false

  fetch(`${API}/docs/${docId}`)
    .then(r => {
      if (!r.ok) throw new Error('Failed to load document')
      return r.json()
    })
    .then(data => {
      if (cancelled) return
      setTitle(data.title || 'Untitled')
      if (data.content) {
        editor.commands.setContent(data.content)
        const text = editor.getText()
        setWordCount(countWords(text))
        setCharCount(text.length)
      }
      hasLoadedRef.current = true
    })
    .catch(err => {
      console.error('Document load failed, NOT clearing editor:', err)
      setSaveStatus('Failed to load - please refresh')
    })

  return () => { cancelled = true }
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
  if (!docId || !username || !editor) return

  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000')
  socketRef.current = socket

  socket.emit('join-doc', { docId, username })

  socket.on('doc-update', debounce(({ content }) => {
  if (!editor || editor.isDestroyed) return
  const currentContent = editor.getHTML()
  if (currentContent === content) return // no actual change, skip re-render

  isRemoteUpdate.current = true
  const { from, to } = editor.state.selection
  editor.commands.setContent(content, false, { preserveWhitespace: 'full' })
  
  // Clamp selection to new doc size to avoid errors
  const docSize = editor.state.doc.content.size
  const safeFrom = Math.min(from, docSize)
  const safeTo = Math.min(to, docSize)
  editor.commands.setTextSelection({ from: safeFrom, to: safeTo })
  
  isRemoteUpdate.current = false
  const text = editor.getText()
  setWordCount(countWords(text))
  setCharCount(text.length)
}, 400))

  socket.on('presence', (users) => {
    setCollaborators(users.filter(u => u.name !== username))
    setRemoteCursors(prev => {
      const active = new Set(users.map(u => u.name))
      return Object.fromEntries(
        Object.entries(prev).filter(([, c]) => active.has(c.username))
      )
    })
  })

  socket.on('cursor-update', ({ socketId, position, username: uname, color }) => {
  setRemoteCursors(prev => {
    // Remove any old entries with the same username (different stale socketId)
    const filtered = Object.fromEntries(
      Object.entries(prev).filter(([, c]) => c.username !== uname)
    )
    return { ...filtered, [socketId]: { position, username: uname, color } }
  })
})

  // Emit cursor position on selection change — now safely inside socket scope
  const myColor = '#60a5fa'
  const cursorHandler = () => {
    const { from } = editor.state.selection
    console.log('Emitting cursor-move at position', from)
    socket.emit('cursor-move', { docId, position: from, username, color: myColor })
  }
  editor.on('selectionUpdate', cursorHandler)

  return () => {
    editor.off('selectionUpdate', cursorHandler)
    socket.disconnect()
  }
}, [docId, username, editor])

  useEffect(() => {
    const close = () => { setShowTextColors(false); setShowHighlights(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (!editor) return null

  function insertImage({ src, alt, width }) {
    editor.chain().focus().setImage({
      src,
      alt: alt || '',
      width: `${width}%`,
    }).run()
  }

  function insertVideo({ src }) {
    editor.chain().focus().insertContent({
      type: 'videoEmbed',
      attrs: { src },
    }).run()
  }

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

  // Derived active colours for the toolbar button indicators
  const activeTextColor = editor.getAttributes('textStyle').color || null
  const activeHighlightColor = editor.getAttributes('highlight').color || null

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

      {/* Word & character count badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 20,
        background: 'var(--bg-toolbar)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 500,
        marginBottom: 12,
        gap: 6,
      }}>
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
      </div>

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
        <button style={{ ...btnStyle(editor.isActive('bold')), fontWeight: 'bold' }}
          onClick={() => editor.chain().focus().toggleBold().run()}>B</button>

        <button style={{ ...btnStyle(editor.isActive('italic')), fontStyle: 'italic' }}
          onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>

        <button style={{ ...btnStyle(editor.isActive('underline')), textDecoration: 'underline' }}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>

        <Sep />

        <button style={btnStyle(editor.isActive('heading', { level: 1 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>

        <button style={btnStyle(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>

        <button style={btnStyle(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>

        <Sep />

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

        <select title="Font family" style={selectStyle} defaultValue=""
          onChange={(e) => {
            const val = e.target.value
            if (val === '') editor.chain().focus().unsetFontFamily().run()
            else editor.chain().focus().setFontFamily(val).run()
          }}
        >
          {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

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

        {/* ── Text colour button + panel ─────────────────────────────── */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            title="Text colour"
            style={btnStyle(!!activeTextColor)}
            onClick={() => { setShowHighlights(false); setShowTextColors(v => !v) }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontWeight: 'bold', fontSize: 13, lineHeight: 1 }}>A</span>
              <span style={{
                height: 3, width: 18, borderRadius: 2,
                backgroundColor: activeTextColor || 'var(--text-primary)',
              }} />
            </div>
          </button>

          {showTextColors && (
            <div className="absolute top-9 left-0 z-50">
              <ColorPanel
                colors={TEXT_COLORS}
                activeColor={activeTextColor}
                onSelect={(color) => {
                  editor.chain().focus().setColor(color).run()
                  // Keep panel open so user can preview/adjust without re-clicking
                }}
                onReset={() => {
                  editor.chain().focus().unsetColor().run()
                  setShowTextColors(false)
                }}
                resetLabel="Remove text colour"
                mode="text"
              />
            </div>
          )}
        </div>

        {/* ── Highlight button + panel ────────────────────────────────── */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            title="Highlight"
            style={btnStyle(!!activeHighlightColor)}
            onClick={() => { setShowTextColors(false); setShowHighlights(v => !v) }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>🖊</span>
              <span style={{
                height: 3, width: 18, borderRadius: 2,
                backgroundColor: activeHighlightColor || '#fef08a',
                border: '1px solid var(--border-btn)',
              }} />
            </div>
          </button>

          {showHighlights && (
            <div className="absolute top-9 left-0 z-50">
              <ColorPanel
                colors={HIGHLIGHT_COLORS}
                activeColor={activeHighlightColor}
                onSelect={(color) => {
                  editor.chain().focus().setHighlight({ color }).run()
                  // Keep panel open — consistent with text colour panel behaviour
                }}
                onReset={() => {
                  editor.chain().focus().unsetHighlight().run()
                  setShowHighlights(false)
                }}
                resetLabel="Remove highlight"
                mode="highlight"
              />
            </div>
          )}
        </div>

        <Sep />

        <button
          title="Insert image"
          style={btnStyle(false)}
          onClick={() => setMediaModal('image')}
        >
          🖼
        </button>

        <button
          title="Embed video"
          style={btnStyle(false)}
          onClick={() => setMediaModal('video')}
        >
          ▶
        </button>

        <span className="ml-auto text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          {saveStatus}
           <ExportMenu editor={editor} title={title} />
        </span>
      </div>

      {/* Editor content */}
      <div style={{ position: 'relative' }}>
  {Object.entries(remoteCursors).map(([id, cursor]) => {
    if (!editor || !editor.view) return null
    const docSize = editor.state.doc.content.size
    if (cursor.position == null || cursor.position > docSize) return null
    try {
      const pos = editor.view.coordsAtPos(cursor.position)
      const editorRect = editor.view.dom.getBoundingClientRect()
      // Position relative to the editor container, not the viewport
      const relativeLeft = pos.left - editorRect.left
      const relativeTop = pos.top - editorRect.top
      return (
        <div key={id} style={{
          position: 'absolute',
          left: relativeLeft,
          top: relativeTop,
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
  } catch (err) {
    console.log('Cursor render error:', err.message)
    return null
  }
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