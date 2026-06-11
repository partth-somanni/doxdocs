import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import Editor from './Editor'

const API = 'http://localhost:3000'

function App() {
  const [docs, setDocs] = useState([])
  const [activeDocId, setActiveDocId] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

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
      body: JSON.stringify({ title: 'Untitled' })
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
    const confirmed = window.confirm('Delete this document? This cannot be undone.')
    if (!confirmed) return
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

  return (
    <div
      className="flex h-screen"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {/* Sidebar */}
      <div
        className="w-64 border-r p-4 flex flex-col"
        style={{
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            My Documents
          </h2>
          <button
            onClick={createDoc}
            className="text-xl font-bold"
            style={{ color: 'var(--text-active)' }}
            title="New document"
          >
            +
          </button>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No documents yet. Click + to create one.
          </p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto">
            {docs.map(doc => (
              <div
                key={doc.id}
                onClick={() => openDoc(doc.id)}
                className="group flex justify-between items-center px-3 py-2 rounded cursor-pointer text-sm"
                style={{
                  background: activeDocId === doc.id ? 'var(--bg-active)' : 'transparent',
                  color: activeDocId === doc.id ? 'var(--text-active)' : 'var(--text-secondary)',
                  fontWeight: activeDocId === doc.id ? 500 : 400,
                }}
                onMouseEnter={e => {
                  if (activeDocId !== doc.id)
                    e.currentTarget.style.background = 'var(--bg-toolbar)'
                }}
                onMouseLeave={e => {
                  if (activeDocId !== doc.id)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                <button
                  onClick={(e) => deleteDoc(e, doc.id)}
                  className="hidden group-hover:block text-lg leading-none ml-2"
                  style={{ color: '#ef4444' }}
                  title="Delete document"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <div
          className="border-b px-6 py-3 flex justify-between items-center"
          style={{
            background: 'var(--bg-sidebar)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h1 className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
            {docs.find(d => d.id === activeDocId)?.title || 'Untitled Document'}
          </h1>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--border-btn)',
                background: 'var(--bg-btn)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                transition: 'background 0.15s',
              }}
            >
              {dark ? '☀' : '☾'}
            </button>

            <SignedIn><UserButton /></SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="px-4 py-1 rounded text-sm"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                  }}
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Editor area */}
        <div
          className="flex-1 p-10 m-6 rounded overflow-auto"
          style={{
            background: 'var(--bg-surface)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <SignedIn>
            {activeDocId
              ? <Editor key={activeDocId} docId={activeDocId} onTitleChange={updateDocTitle} />
              : <p className="text-center mt-20" style={{ color: 'var(--text-muted)' }}>
                  Click + to create a new document.
                </p>
            }
          </SignedIn>
          <SignedOut>
            <p className="text-center mt-20" style={{ color: 'var(--text-muted)' }}>
              Please sign in to edit documents.
            </p>
          </SignedOut>
        </div>
      </div>
    </div>
  )
}

export default App