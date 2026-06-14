import { useState, useEffect, useCallback } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import Editor from './Editor'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'


function SortableDoc({ doc, activeDocId, openDoc, deleteDoc }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id })
  const [hovered, setHovered] = useState(false)

  const active = activeDocId === doc.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '7px 10px',
        borderRadius: 6,
        cursor: 'grab',
        background: active ? 'var(--bg-active)' : hovered ? 'var(--bg-toolbar)' : 'transparent',
        color: active ? 'var(--text-active)' : 'var(--text-secondary)',
        fontWeight: active ? 500 : 400,
        fontSize: 13,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openDoc(doc.id)}
      {...attributes}
      {...listeners}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {doc.title || 'Untitled'}
      </span>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); deleteDoc(e, doc.id) }}
          title="Delete document"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: '0 2px', marginLeft: 6 }}
        >
          ×
        </button>
      )}
    </div>
  )
}


export default function App() {
  const { user } = useUser()
  const [docs, setDocs] = useState([])
  const [activeDocId, setActiveDocId] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Keyboard shortcut: Ctrl+\ or Cmd+\ to toggle distraction-free
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault()
        setSidebarOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    fetch(`${API}/docs`)
      .then(r => r.json())
      .then(data => {
        setDocs(data)
        if (data.length > 0 && !activeDocId) {
          setActiveDocId(data[0].id)
          localStorage.setItem('docId', data[0].id)
        }
      })
  }, [])

  const createDoc = async () => {
    const res = await fetch(`${API}/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled' }),
    })
    const newDoc = await res.json()
    setDocs(prev => [newDoc, ...prev])
    setActiveDocId(newDoc.id)
    localStorage.setItem('docId', newDoc.id)
  }

  const openDoc = (id) => {
    setActiveDocId(id)
    localStorage.setItem('docId', id)
  }

  const deleteDoc = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    await fetch(`${API}/docs/${id}`, { method: 'DELETE' })
    const remaining = docs.filter(d => d.id !== id)
    setDocs(remaining)
    if (activeDocId === id) {
      if (remaining.length > 0) {
        setActiveDocId(remaining[0].id)
        localStorage.setItem('docId', remaining[0].id)
      } else {
        setActiveDocId(null)
        localStorage.removeItem('docId')
      }
    }
  }

  const updateDocTitle = (id, newTitle) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d))
  }

  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // must move 8px before drag starts
    },
  }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setDocs(prev => {
      const oldIndex = prev.findIndex(d => d.id === active.id)
      const newIndex = prev.findIndex(d => d.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: sidebarOpen ? 256 : 0,
          minWidth: sidebarOpen ? 256 : 0,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
          background: 'var(--bg-sidebar)',
          borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sidebar inner — kept at 256px so content doesn't squish during animation */}
        <div style={{ width: 256, flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              My Documents
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {/* New doc */}
              <button
                onClick={createDoc}
                title="New document"
                style={iconBtnStyle}
              >
                +
              </button>
              {/* Collapse sidebar */}
              <button
                onClick={() => setSidebarOpen(false)}
                title="Focus mode  (Ctrl+\\)"
                style={iconBtnStyle}
              >
                ◀
              </button>
            </div>
          </div>

          {/* Doc list */}
          {docs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No documents yet. Click + to create one.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={docs.map(d => d.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1 overflow-y-auto" style={{ flex: 1 }}>
                  {docs.map(doc => (
                    <SortableDoc
                      key={doc.id}
                      doc={doc}
                      activeDocId={activeDocId}
                      openDoc={openDoc}
                      deleteDoc={deleteDoc}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Navbar */}
        <div
          style={{
            background: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '10px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Show sidebar button — only visible when sidebar is hidden */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Show sidebar  (Ctrl+\\)"
                style={{
                  ...iconBtnStyle,
                  fontSize: 16,
                  opacity: 1,
                }}
              >
                ▶
              </button>
            )}
            <h1 style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              {docs.find(d => d.id === activeDocId)?.title || 'Untitled Document'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid var(--border-btn)',
                background: 'var(--bg-btn)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {dark ? '☀' : '☾'}
            </button>

            <SignedIn><UserButton /></SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button style={{ padding: '5px 14px', borderRadius: 6, background: '#2563eb', color: '#fff', fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Editor area */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow)',
              borderRadius: 8,
              padding: '40px 48px',
              maxWidth: sidebarOpen ? 860 : 780,
              margin: '0 auto',
              transition: 'max-width 0.22s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <SignedIn>
              {activeDocId
                ? <Editor
  key={activeDocId}
  docId={activeDocId}
  onTitleChange={updateDocTitle}
  username={user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Anonymous'}
/>
                : <p style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
                    Click + to create a new document.
                  </p>
              }
            </SignedIn>
            <SignedOut>
              <p style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
                Please sign in to edit documents.
              </p>
            </SignedOut>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared style ────────────────────────────────────────────────────────────

const iconBtnStyle = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid var(--border-btn)',
  background: 'var(--bg-btn)',
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1,
}